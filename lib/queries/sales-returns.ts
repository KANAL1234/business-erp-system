import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { SalesReturn } from '@/lib/types/database'
import { toast } from 'sonner'

export type CreateSalesReturnInput = {
    customer_id?: string
    sales_invoice_id?: string
    return_date: string
    reason?: string
    status: SalesReturn['status']
    refund_amount: number
    items: {
        product_id: string
        quantity_returned: number
        condition?: 'good' | 'damaged' | 'defective'
        action?: 'restock' | 'discard' | 'repair'
    }[]
}

export function useSalesReturns() {
    return useQuery({
        queryKey: ['sales-returns'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_returns')
                .select(`
                    *,
                    customers (
                        id,
                        name,
                        customer_code
                    ),
                    sales_invoices (
                        invoice_number
                    )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (SalesReturn & {
                customers: { name: string, customer_code: string },
                sales_invoices: { invoice_number: string }
            })[]
        }
    })
}

export function useSalesReturn(id: string) {
    return useQuery({
        queryKey: ['sales-return', id],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_returns')
                .select(`
                    *,
                    customers (*),
                    sales_invoices (invoice_number),
                    sales_return_items (
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

export function useCreateSalesReturn() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateSalesReturnInput) => {
            const supabase = createClient()

            // 1. Get next return number
            const { data: lastReturn } = await supabase
                .from('sales_returns')
                .select('return_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'RTN-0001'
            if (lastReturn) {
                const lastNum = parseInt(lastReturn.return_number.split('-')[1])
                nextNumber = `RTN-${String(lastNum + 1).padStart(4, '0')}`
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            // 2. Insert Return
            const { data: salesReturn, error: returnError } = await supabase
                .from('sales_returns')
                .insert({
                    return_number: nextNumber,
                    customer_id: input.customer_id,
                    sales_invoice_id: input.sales_invoice_id,
                    return_date: input.return_date,
                    reason: input.reason,
                    status: input.status,
                    refund_amount: input.refund_amount,
                    created_by: user.id
                })
                .select()
                .single()

            if (returnError) throw returnError

            // 3. Insert Items
            const items = input.items.map(item => ({
                return_id: salesReturn.id,
                product_id: item.product_id,
                quantity_returned: item.quantity_returned,
                condition: item.condition || 'good',
                action: item.action || 'restock'
            }))

            const { error: itemsError } = await supabase
                .from('sales_return_items')
                .insert(items)

            if (itemsError) throw itemsError

            // 4. Get warehouse location (try to get from invoice's order, or use a default)
            let warehouseId: string | null = null

            if (input.sales_invoice_id) {
                const { data: invoice } = await supabase
                    .from('sales_invoices')
                    .select('sales_order_id')
                    .eq('id', input.sales_invoice_id)
                    .single()

                if (invoice?.sales_order_id) {
                    const { data: order } = await supabase
                        .from('sales_orders')
                        .select('warehouse_id')
                        .eq('id', invoice.sales_order_id)
                        .single()

                    warehouseId = order?.warehouse_id || null
                }
            }

            // 5. Restore stock for items marked for restock
            if (warehouseId) {
                // Get transaction type for returns
                const { data: txnType } = await supabase
                    .from('transaction_types')
                    .select('id')
                    .eq('code', 'RETURN')
                    .single()

                for (const item of input.items) {
                    // Only restore stock if action is 'restock'
                    if (item.action === 'restock') {
                        // Add stock back to warehouse
                        await supabase.rpc('adjust_inventory_stock', {
                            p_product_id: item.product_id,
                            p_location_id: warehouseId,
                            p_quantity_change: item.quantity_returned
                        })

                        // Log inventory transaction
                        if (txnType) {
                            await supabase.from('inventory_transactions').insert({
                                transaction_type_id: txnType.id,
                                transaction_number: nextNumber,
                                product_id: item.product_id,
                                to_location_id: warehouseId,
                                quantity: item.quantity_returned,
                                unit_cost: 0,
                                reference_type: 'RETURN',
                                reference_id: salesReturn.id,
                                reference_number: nextNumber,
                                created_by: user.id
                            })
                        }
                    }
                }
            }

            return salesReturn
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales-returns'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
            toast.success('Sales Return created successfully')
        },
        onError: (error) => {
            console.error('Error creating sales return:', error)
            toast.error('Failed to create sales return')
        }
    })
}
