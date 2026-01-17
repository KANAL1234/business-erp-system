// lib/offline/queue.ts
import { syncQueueStore } from './storage'
import { createClient } from '@/lib/supabase/client'

export type SyncAction =
  | 'CREATE_POS_SALE'
  | 'CREATE_FUEL_LOG'
  | 'UPDATE_ODOMETER'
  | 'CREATE_TRIP'
  | 'UPDATE_TRIP'
  | 'SAVE_LOCATION'

export interface QueueItem {
  id: string
  action: SyncAction
  data: any
  timestamp: number
  retryCount: number
  lastError?: string
}

const QUEUE_KEY = 'sync_queue'
const MAX_RETRIES = 3

// Add item to sync queue
export async function addToQueue(action: SyncAction, data: any): Promise<string> {
  const item: QueueItem = {
    id: `${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    data,
    timestamp: Date.now(),
    retryCount: 0
  }

  const queue = await getQueue()
  queue.push(item)
  await syncQueueStore.setItem(QUEUE_KEY, queue)

  console.log(`✅ Added to queue: ${action}`, item.id)
  return item.id
}

// Get current queue
export async function getQueue(): Promise<QueueItem[]> {
  const queue = await syncQueueStore.getItem<QueueItem[]>(QUEUE_KEY)
  return queue || []
}

// Remove item from queue
export async function removeFromQueue(itemId: string): Promise<void> {
  const queue = await getQueue()
  const filtered = queue.filter(item => item.id !== itemId)
  await syncQueueStore.setItem(QUEUE_KEY, filtered)
  console.log(`🗑️ Removed from queue: ${itemId}`)
}

// Update item retry count
async function updateRetryCount(itemId: string, error: string): Promise<void> {
  const queue = await getQueue()
  const updated = queue.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        retryCount: item.retryCount + 1,
        lastError: error
      }
    }
    return item
  })
  await syncQueueStore.setItem(QUEUE_KEY, updated)
}

// Process a single queue item
async function processQueueItem(item: QueueItem): Promise<boolean> {
  const supabase = createClient()

  // Helper to resolve all IDs needed for fleet/pos operations
  const resolveIds = async (supabaseClient: ReturnType<typeof createClient>, authId: string, vehicleOrLocationId: string) => {
    // 1. Resolve Employee and Driver
    const { data: employee } = await supabaseClient.from('employees').select('id, user_profile_id').eq('user_profile_id', authId).maybeSingle()
    const { data: driver } = await supabaseClient.from('fleet_drivers').select('id, employee_id').eq('employee_id', employee?.id || authId).maybeSingle()

    // 2. Resolve Fleet Vehicle
    const { data: fv } = await supabaseClient
      .from('fleet_vehicles')
      .select('id')
      .or(`id.eq.${vehicleOrLocationId},location_id.eq.${vehicleOrLocationId}`)
      .maybeSingle()

    // 3. Resolve Legacy Vehicle
    const { data: v } = await supabaseClient
      .from('vehicles')
      .select('id')
      .or(`id.eq.${vehicleOrLocationId},location_id.eq.${vehicleOrLocationId}`)
      .maybeSingle()

    return {
      employeeId: employee?.id || authId,
      driverId: driver?.id || authId,
      fleetVehicleId: fv?.id || vehicleOrLocationId,
      legacyVehicleId: v?.id || vehicleOrLocationId
    }
  }

  try {
    switch (item.action) {
      case 'CREATE_POS_SALE': {
        const { items, ...saleData } = item.data
        // Safeguard: amount_due is a GENERATED ALWAYS column in Postgres
        // We must remove it if it exists in the offline item data
        if ('amount_due' in saleData) {
          delete (saleData as any).amount_due
        }
        console.log(`🛒 Syncing POS Sale: ${saleData.sale_number}`, saleData)

        // Resolve driver if it's on a trip
        if (saleData.trip_id) {
          // Verify Trip exists before inserting sale to avoid FK constraint error
          const { data: tripExists } = await supabase
            .from('fleet_trips')
            .select('id')
            .eq('id', saleData.trip_id)
            .maybeSingle()
          
          if (!tripExists) {
            console.warn(`⚠️ Trip ${saleData.trip_id} not found in DB. Unlinking sale to prevent sync failure.`)
            saleData.trip_id = null
          }
        }

        // 1. Check if sale already exists (Idempotency check)
        const { data: existingSale } = await supabase
          .from('pos_sales')
          .select('id')
          .eq('sale_number', saleData.sale_number)
          .maybeSingle()

        let saleId = existingSale?.id

        if (!saleId) {
          // Insert the main sale record
          const { data: sale, error: saleError } = await supabase
            .from('pos_sales')
            .insert({
              ...saleData,
              is_synced: true // Ensure it's marked as synced in DB
            })
            .select()
            .single()

          if (saleError) {
            console.error(`❌ POS Sale Main Insert Failed:`, saleError)
            throw saleError
          }
          saleId = sale.id
          console.log(`✅ POS Sale created with ID: ${saleId}`)
        }

        // 2. Insert/Check sale items
        if (items && items.length > 0) {
          const { data: existingItems } = await supabase
            .from('pos_sale_items')
            .select('id')
            .eq('sale_id', saleId)

          if (!existingItems || existingItems.length === 0) {
            const saleItems = items.map((line: any) => ({
              sale_id: saleId,
              product_id: line.product_id,
              quantity: line.quantity,
              unit_price: line.unit_price,
              discount_percentage: 0
            }))

            const { error: itemsError } = await supabase
              .from('pos_sale_items')
              .insert(saleItems)

            if (itemsError) {
              console.error(`❌ POS Sale Items Insert Failed:`, itemsError)
              throw itemsError
            }
            console.log(`✅ ${saleItems.length} items synced for sale ${saleId}`)
          }
        }
        // 3. Create a Visit record if linked to a trip (Automation)
        if (saleData.trip_id && saleData.customer_id) {
          try {
            console.log(`📍 Recording auto-visit for Customer: ${saleData.customer_id}`)
            // Check if visit already recorded for this sale/trip/customer combo to avoid duplicates
            const { data: existingVisit } = await supabase
              .from('fleet_trip_visits')
              .select('id')
              .eq('trip_id', saleData.trip_id)
              .eq('customer_id', saleData.customer_id)
              // If a visit exists in the last hour for this customer on this trip, we skip.
              .gt('visit_time', new Date(Date.now() - 3600000).toISOString())
              .maybeSingle()

            if (!existingVisit) {
              await supabase.from('fleet_trip_visits').insert({
                trip_id: saleData.trip_id,
                customer_id: saleData.customer_id,
                visit_time: new Date().toISOString(),
                notes: `Auto-recorded via Sale #${saleData.sale_number}`
              })
              console.log(`✅ Auto-visit recorded`)
            }
          } catch (vErr) {
            console.error('Non-critical: Failed to record auto-visit:', vErr)
          }
        }

        return true
      }

      case 'CREATE_FUEL_LOG': {
        const { driverId, fleetVehicleId, legacyVehicleId, employeeId } = await resolveIds(supabase, item.data.p_driver_id, item.data.p_vehicle_id)

        // Update item data with resolved IDs for RPC
        const resolvedData = {
          ...item.data,
          p_driver_id: driverId,
          p_vehicle_id: fleetVehicleId
        }

        // Try RPC first
        const { error: rpcError } = await supabase.rpc('record_fuel_entry', resolvedData)

        if (!rpcError) return true

        // Fallback for missing RPC
        if (rpcError.code === 'P0001' || rpcError.message.includes('function') || rpcError.message.includes('not found') || rpcError.code === '42883') {
          console.log('Falling back to manual fuel log insert...')

          // Try inserting into fleet_fuel_logs
          const { error: fleetError } = await supabase
            .from('fleet_fuel_logs')
            .insert({
              vehicle_id: fleetVehicleId,
              trip_id: item.data.p_trip_id,
              liters: item.data.p_quantity_liters,
              cost_per_liter: item.data.p_price_per_liter,
              total_cost: item.data.p_quantity_liters * item.data.p_price_per_liter,
              odometer_reading: item.data.p_odometer_reading,
              log_date: item.data.p_fuel_date || new Date().toISOString()
            })

          if (!fleetError) {
            await supabase
              .from('fleet_vehicles')
              .update({ current_mileage: item.data.p_odometer_reading })
              .eq('id', fleetVehicleId)
            return true
          }

          // Legacy table fallback
          const { error: fuelError } = await supabase
            .from('fuel_logs')
            .insert({
              vehicle_id: legacyVehicleId,
              log_date: item.data.p_fuel_date || new Date().toISOString(),
              odometer_reading: item.data.p_odometer_reading,
              fuel_quantity: item.data.p_quantity_liters,
              fuel_rate: item.data.p_price_per_liter,
              filled_by: employeeId,
              station_name: item.data.p_fuel_station
            })

          if (fuelError) throw fuelError
          return true
        }

        throw rpcError
      }

      case 'UPDATE_ODOMETER': {
        const { fleetVehicleId } = await resolveIds(supabase, '', item.data.vehicle_id)
        const { error } = await supabase
          .from('fleet_vehicles')
          .update({ current_mileage: item.data.odometer })
          .eq('id', fleetVehicleId)

        if (error) throw error
        return true
      }

      case 'CREATE_TRIP': {
        // Idempotency check
        const { data: existing } = await supabase
          .from('fleet_trips')
          .select('id')
          .eq('id', item.data.id)
          .maybeSingle()

        if (existing) return true

        const { driverId, fleetVehicleId } = await resolveIds(supabase, item.data.driver_id, item.data.vehicle_id)
        const { error } = await supabase
          .from('fleet_trips')
          .insert({
            ...item.data,
            vehicle_id: fleetVehicleId,
            driver_id: driverId
          })

        if (error) throw error
        return true
      }

      case 'UPDATE_TRIP': {
        const { id, ...updateData } = item.data // Exclude id from update payload
        const { error } = await supabase
          .from('fleet_trips')
          .update(updateData)
          .eq('id', id)

        if (error) throw error

        // Also update vehicle odometer if end_mileage provided
        if (updateData.end_mileage) {
          const { data: trip } = await supabase
            .from('fleet_trips')
            .select('vehicle_id')
            .eq('id', id)
            .single()

          if (trip?.vehicle_id) {
            await supabase
              .from('fleet_vehicles')
              .update({ current_mileage: updateData.end_mileage })
              .eq('id', trip.vehicle_id)
          }
        }

        return true
      }

      case 'SAVE_LOCATION': {
        const { error } = await supabase
          .from('fleet_trip_locations')
          .insert(item.data)

        if (error) throw error
        return true
      }

      default:
        console.error(`Unknown action: ${item.action}`)
        return false
    }
  } catch (error: any) {
    console.error(`❌ Error syncing ${item.action}:`, error.message)

    // Update retry count
    await updateRetryCount(item.id, error.message)

    return false
  }
}

// Process entire queue
export async function processQueue(): Promise<{
  processed: number
  failed: number
  remaining: number
}> {
  console.log('🔄 Starting queue sync...')

  const queue = await getQueue()
  let processed = 0
  let failed = 0

  for (const item of queue) {
    // Skip items that exceeded max retries (they are already in a permanent failed state)
    if (item.retryCount >= MAX_RETRIES) {
      continue
    }

    const success = await processQueueItem(item)

    if (success) {
      await removeFromQueue(item.id)
      processed++
    } else {
      failed++
    }
  }

  const remaining = (await getQueue()).length

  console.log(`📊 Sync complete: ${processed} processed, ${failed} failed, ${remaining} remaining`)

  return { processed, failed, remaining }
}

// Clear failed items
export async function clearFailedItems(): Promise<void> {
  const queue = await getQueue()
  const filtered = queue.filter(item => item.retryCount < MAX_RETRIES)
  await syncQueueStore.setItem(QUEUE_KEY, filtered)
}

// Reset all retries (for manual retry)
export async function resetQueueRetries(): Promise<void> {
  const queue = await getQueue()
  const updated = queue.map(item => ({ ...item, retryCount: 0 }))
  await syncQueueStore.setItem(QUEUE_KEY, updated)
  console.log('🔄 All queue retry counts reset to 0')
}

// Get queue statistics
export async function getQueueStats() {
  const queue = await getQueue()
  return {
    total: queue.length,
    pending: queue.filter(item => item.retryCount === 0).length,
    retrying: queue.filter(item => item.retryCount > 0 && item.retryCount < MAX_RETRIES).length,
    failed: queue.filter(item => item.retryCount >= MAX_RETRIES).length
  }
}
