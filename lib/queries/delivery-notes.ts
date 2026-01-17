import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { DeliveryNote, SalesOrder } from '@/lib/types/database'
import { toast } from 'sonner'

export type CreateDeliveryNoteInput = {
    sales_order_id: string
    customer_id: string
    delivery_date: string
    vehicle_number?: string
    tracking_number?: string
    driver_name?: string
    notes?: string
    status: DeliveryNote['status']
    items: {
        sales_order_item_id: string
        product_id: string
        quantity_delivered: number
        notes?: string
    }[]
}

export function useDeliveryNotes() {
    return useQuery({
        queryKey: ['delivery-notes'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('delivery_notes')
                .select(`
                    *,
                    customers (
                        id,
                        name,
                        customer_code
                    ),
                    sales_orders (
                        order_number
                    )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (DeliveryNote & {
                customers: { name: string, customer_code: string },
                sales_orders: { order_number: string }
            })[]
        }
    })
}

export function useDeliveryNote(id: string) {
    return useQuery({
        queryKey: ['delivery-note', id],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('delivery_notes')
                .select(`
                    *,
                    customers (*),
                    sales_orders (order_number),
                    delivery_note_items (
                        *,
                        products (
                            id,
                            name,
                            sku,
                            uom_id
                        )
                    )
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id
    })
}

export function useCreateDeliveryNote() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateDeliveryNoteInput) => {
            const supabase = createClient()

            // 1. Get next delivery note number
            const { data: lastNote } = await supabase
                .from('delivery_notes')
                .select('delivery_note_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'DN-0001'
            if (lastNote) {
                const lastNum = parseInt(lastNote.delivery_note_number.split('-')[1])
                nextNumber = `DN-${String(lastNum + 1).padStart(4, '0')}`
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            // 2. Insert Delivery Note
            const { data: note, error: noteError } = await supabase
                .from('delivery_notes')
                .insert({
                    delivery_note_number: nextNumber,
                    sales_order_id: input.sales_order_id,
                    customer_id: input.customer_id,
                    delivery_date: input.delivery_date,
                    status: input.status,
                    vehicle_number: input.vehicle_number,
                    tracking_number: input.tracking_number,
                    driver_name: input.driver_name,
                    notes: input.notes,
                    created_by: user.id
                })
                .select()
                .single()

            if (noteError) throw noteError

            // 3. Insert Items
            const items = input.items.map(item => ({
                delivery_note_id: note.id,
                sales_order_item_id: item.sales_order_item_id,
                product_id: item.product_id,
                quantity_delivered: item.quantity_delivered,
                notes: item.notes
            }))

            const { error: itemsError } = await supabase
                .from('delivery_note_items')
                .insert(items)

            if (itemsError) throw itemsError

            // 4. Get sales order to retrieve warehouse_id and quotation linkage
            const { data: salesOrder } = await supabase
                .from('sales_orders')
                .select('warehouse_id, quotation_id')
                .eq('id', input.sales_order_id)
                .single()

            const warehouseId = salesOrder?.warehouse_id

            // 5. Deduct stock and create inventory transactions
            if (warehouseId) {
                // Get transaction type for delivery
                const { data: txnType } = await supabase
                    .from('transaction_types')
                    .select('id')
                    .eq('code', 'SALE')
                    .single()

                for (const item of input.items) {
                    // Deduct stock from warehouse
                    await supabase.rpc('adjust_inventory_stock', {
                        p_product_id: item.product_id,
                        p_location_id: warehouseId,
                        p_quantity_change: -item.quantity_delivered
                    })

                    // Log inventory transaction
                    if (txnType) {
                        await supabase.from('inventory_transactions').insert({
                            transaction_type_id: txnType.id,
                            transaction_number: nextNumber,
                            product_id: item.product_id,
                            from_location_id: warehouseId,
                            quantity: item.quantity_delivered,
                            unit_cost: 0, // Could fetch from product if needed
                            reference_type: 'DELIVERY',
                            reference_id: note.id,
                            reference_number: nextNumber,
                            created_by: user.id
                        })
                    }
                }
            }

            // 6. Update statuses if shipped
            if (input.status === 'shipped') {
                await supabase
                    .from('sales_orders')
                    .update({ status: 'completed' })
                    .eq('id', input.sales_order_id)

                await supabase
                    .from('delivery_notes')
                    .update({ status: 'delivered' })
                    .eq('id', note.id)

                if (salesOrder?.quotation_id) {
                    await supabase
                        .from('sales_quotations')
                        .update({ status: 'converted' })
                        .eq('id', salesOrder.quotation_id)
                }

                // Post COGS/Inventory to GL (non-blocking)
                try {
                    await supabase.rpc('post_delivery_note', {
                        p_delivery_note_id: note.id
                    })
                } catch (glError) {
                    console.warn('Delivery note GL posting failed (non-critical):', glError)
                }
            }

            return note
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-notes'] })
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
            toast.success('Delivery Note created successfully')
        },
        onError: (error) => {
            console.error('Error creating delivery note:', error)
            toast.error('Failed to create delivery note')
        }
    })
}
