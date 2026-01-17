import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { StockTransfer, StockTransferItem } from '@/lib/types/database'

const supabase = createClient()

// Get all stock transfers
export function useStockTransfers(status?: string) {
    return useQuery({
        queryKey: ['stock-transfers', status],
        queryFn: async () => {
            let query = supabase
                .from('stock_transfers')
                .select(`
          *,
          from_location:locations!from_location_id(id, code, name),
          to_location:locations!to_location_id(id, code, name),
          stock_transfer_items(
            *,
            products(id, sku, name)
          )
        `)
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query

            if (error) throw error
            return data
        },
    })
}

// Get single transfer
export function useStockTransfer(id: string) {
    return useQuery({
        queryKey: ['stock-transfers', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_transfers')
                .select(`
          *,
          from_location:locations!from_location_id(id, code, name),
          to_location:locations!to_location_id(id, code, name),
          stock_transfer_items(
            *,
            products(id, sku, name, cost_price)
          )
        `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id,
    })
}

// Create transfer
export function useCreateTransfer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (transfer: {
            from_location_id: string
            to_location_id: string
            transfer_date: string
            notes?: string
            items: {
                product_id: string
                quantity_requested: number
                unit_cost: number
            }[]
        }) => {
            // Generate transfer number
            const transferNumber = `TRF-${Date.now()}`

            // Create transfer
            const { data: transferData, error: transferError } = await supabase
                .from('stock_transfers')
                .insert({
                    transfer_number: transferNumber,
                    from_location_id: transfer.from_location_id,
                    to_location_id: transfer.to_location_id,
                    transfer_date: transfer.transfer_date,
                    notes: transfer.notes,
                    status: 'DRAFT',
                })
                .select()
                .single()

            if (transferError) throw transferError

            // Create transfer items
            const items = transfer.items.map(item => ({
                transfer_id: transferData.id,
                product_id: item.product_id,
                quantity_requested: item.quantity_requested,
                unit_cost: item.unit_cost,
            }))

            const { error: itemsError } = await supabase
                .from('stock_transfer_items')
                .insert(items)

            if (itemsError) throw itemsError

            return transferData
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
        },
    })
}

// Update transfer status
export function useUpdateTransferStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            id,
            status,
            quantities,
        }: {
            id: string
            status: string
            quantities?: { [itemId: string]: number }
        }) => {
            const { data: transfer, error: fetchError } = await supabase
                .from('stock_transfers')
                .select('*, stock_transfer_items(*)')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // Update transfer status
            // If completing, update item quantities first so the trigger sees them
            if (status === 'COMPLETED') {
                for (const item of transfer.stock_transfer_items) {
                    const quantityReceived = (quantities && quantities[item.id]) || item.quantity_requested

                    await supabase
                        .from('stock_transfer_items')
                        .update({
                            quantity_sent: item.quantity_requested,
                            quantity_received: quantityReceived,
                        })
                        .eq('id', item.id)
                }
            }

            // Update transfer status - this fires the database trigger
            const { data: updatedTransfer, error: updateError } = await supabase
                .from('stock_transfers')
                .update({ status })
                .eq('id', id)
                .neq('status', status)
                .select()
                .maybeSingle()

            if (updateError) throw updateError

            // If no update occurred (already completed/same status), skip transaction logs
            if (!updatedTransfer) {
                console.log('⚠️ Transfer status already matches target or updated concurrently. Skipping transaction logs.')
                return { id, status }
            }

            // Create inventory transactions (logs only, trigger doesn't do this)
            if (status === 'COMPLETED') {
                for (const item of transfer.stock_transfer_items) {
                    const quantityReceived = (quantities && quantities[item.id]) || item.quantity_requested

                    // Fetch transaction types
                    const { data: outType } = await supabase.from('transaction_types').select('id').eq('code', 'TRANSFER_OUT').single()
                    const { data: inType } = await supabase.from('transaction_types').select('id').eq('code', 'TRANSFER_IN').single()

                    if (outType && inType) {
                        await supabase.from('inventory_transactions').insert([
                            {
                                transaction_type_id: outType.id,
                                transaction_number: `${transfer.transfer_number}-OUT`,
                                product_id: item.product_id,
                                from_location_id: transfer.from_location_id,
                                to_location_id: transfer.to_location_id,
                                quantity: item.quantity_requested,
                                unit_cost: item.unit_cost,
                                reference_type: 'TRANSFER',
                                reference_id: transfer.id,
                                reference_number: transfer.transfer_number,
                            },
                            {
                                transaction_type_id: inType.id,
                                transaction_number: `${transfer.transfer_number}-IN`,
                                product_id: item.product_id,
                                from_location_id: transfer.from_location_id,
                                to_location_id: transfer.to_location_id,
                                quantity: quantityReceived,
                                unit_cost: item.unit_cost,
                                reference_type: 'TRANSFER',
                                reference_id: transfer.id,
                                reference_number: transfer.transfer_number,
                            },
                        ])
                    }
                }
            }

            return { id, status }
        },
        onSuccess: () => {
            console.log('🔄 Invalidating queries: stock-transfers and inventory-stock')
            queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
            console.log('✅ Queries invalidated - UI should refresh')
        },
    })
}

// Delete transfer (only if DRAFT)
export function useDeleteTransfer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            // Check status first
            const { data: transfer } = await supabase
                .from('stock_transfers')
                .select('status')
                .eq('id', id)
                .single()

            if (transfer?.status !== 'DRAFT') {
                throw new Error('Can only delete draft transfers')
            }

            const { error } = await supabase
                .from('stock_transfers')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
        },
    })
}
