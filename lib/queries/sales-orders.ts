import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { SalesOrder, SalesOrderWithDetails } from '@/lib/types/database'
import { toast } from 'sonner'
import { SalesQuotation } from '@/lib/types/database'

const formatPostgrestError = (error: any) => {
    if (!error) return null
    return {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
    }
}

export type CreateSalesOrderInput = {
    customer_id: string
    quotation_id?: string
    order_date: string
    expected_delivery_date?: string
    status: SalesOrder['status']
    payment_status: SalesOrder['payment_status']
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    amount_paid: number
    delivery_address?: string
    notes?: string
    term_and_conditions?: string
    warehouse_id?: string
    items: {
        product_id: string
        quantity: number
        unit_price: number
        discount_percentage: number
    }[]
}

export type UpdateSalesOrderInput = CreateSalesOrderInput & {
    id: string
}

export function useSalesOrders() {
    return useQuery({
        queryKey: ['sales-orders'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_orders')
                .select(`
                    *,
                    customers (
                        id,
                        name,
                        customer_code
                    )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (SalesOrder & { customers: { name: string, customer_code: string } })[]
        }
    })
}

export function useSalesOrder(id: string) {
    return useQuery({
        queryKey: ['sales-order', id],
        queryFn: async () => {
            const supabase = createClient()
            const { data: order, error: orderError } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('id', id)
                .single()

            if (orderError) {
                console.error('Sales order fetch failed:', formatPostgrestError(orderError))
                throw orderError
            }

            const [customerRes, warehouseRes, itemsRes] = await Promise.all([
                order.customer_id
                    ? supabase.from('customers').select('*').eq('id', order.customer_id).single()
                    : Promise.resolve({ data: null, error: null }),
                order.warehouse_id
                    ? supabase.from('inventory_locations').select('id, name').eq('id', order.warehouse_id).single()
                    : Promise.resolve({ data: null, error: null }),
                supabase
                    .from('sales_order_items')
                    .select('id, order_id, product_id, quantity, unit_price, discount_percentage, line_total')
                    .eq('order_id', order.id),
            ])

            if (customerRes.error) {
                console.warn('Sales order customer fetch failed:', formatPostgrestError(customerRes.error))
            }
            if (warehouseRes.error) {
                console.warn('Sales order warehouse fetch failed:', formatPostgrestError(warehouseRes.error))
            }
            if (itemsRes.error) {
                console.warn('Sales order items fetch failed:', formatPostgrestError(itemsRes.error))
            }

            const items = itemsRes.data || []
            const productIds = Array.from(new Set(items.map(item => item.product_id).filter(Boolean)))
            let productsById: Record<string, { id: string; name: string | null; sku: string | null; uom_id?: string | null }> = {}

            if (productIds.length > 0) {
                const { data: products, error: productsError } = await supabase
                    .from('products')
                    .select('id, name, sku, uom_id')
                    .in('id', productIds)

                if (productsError) {
                    console.warn('Sales order products fetch failed:', formatPostgrestError(productsError))
                } else if (products) {
                    productsById = products.reduce((acc, product) => {
                        acc[product.id] = product
                        return acc
                    }, {} as Record<string, { id: string; name: string | null; sku: string | null; uom_id?: string | null }>)
                }
            }

            const salesOrderItems = items.map(item => ({
                ...item,
                quantity_delivered: 0,
                products: productsById[item.product_id] || null,
            }))

            return {
                ...order,
                customers: customerRes.data || undefined,
                warehouse: warehouseRes.data || undefined,
                sales_order_items: salesOrderItems,
            } as SalesOrderWithDetails
        },
        enabled: !!id
    })
}

export function useCreateSalesOrder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateSalesOrderInput) => {
            const supabase = createClient()

            // 1. Get next order number
            const { data: lastOrder } = await supabase
                .from('sales_orders')
                .select('order_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'SO-0001'
            if (lastOrder) {
                const lastNum = parseInt(lastOrder.order_number.split('-')[1])
                nextNumber = `SO-${String(lastNum + 1).padStart(4, '0')}`
            }

            // 2. Insert Order
            const { data: order, error: orderError } = await supabase
                .from('sales_orders')
                .insert({
                    order_number: nextNumber,
                    customer_id: input.customer_id,
                    quotation_id: input.quotation_id,
                    order_date: input.order_date,
                    expected_delivery_date: input.expected_delivery_date,
                    status: input.status,
                    payment_status: input.payment_status,
                    subtotal: input.subtotal,
                    tax_amount: input.tax_amount,
                    discount_amount: input.discount_amount,
                    shipping_charges: input.shipping_charges,
                    total_amount: input.total_amount,
                    amount_paid: input.amount_paid,
                    delivery_address: input.delivery_address,
                    notes: input.notes,
                    term_and_conditions: input.term_and_conditions,
                    warehouse_id: input.warehouse_id,
                })
                .select()
                .single()

            if (orderError) {
                console.error('Sales order insert failed:', formatPostgrestError(orderError))
                throw orderError
            }

            // 3. Insert Items
            const items = input.items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage
                // line_total is generated
            }))

            const { error: itemsError } = await supabase
                .from('sales_order_items')
                .insert(items)

            if (itemsError) {
                console.error('Sales order items insert failed:', formatPostgrestError(itemsError))
                throw itemsError
            }

            return order
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
            toast.success('Sales Order created successfully')
        },
        onError: (error) => {
            console.error('Error creating sales order:', formatPostgrestError(error))
            const message = (error as any)?.message ? `Failed to create sales order: ${(error as any).message}` : 'Failed to create sales order'
            toast.error(message)
        }
    })
}

export function useUpdateSalesOrderStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, status }: { id: string, status: SalesOrder['status'] }) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('sales_orders')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
            queryClient.invalidateQueries({ queryKey: ['sales-order', id] })
            toast.success('Order status updated')
        },
        onError: (error) => {
            toast.error('Failed to update status')
        }
    })
}

export function useUpdateSalesOrder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...input }: UpdateSalesOrderInput) => {
            const supabase = createClient()

            const { error: orderError } = await supabase
                .from('sales_orders')
                .update({
                    customer_id: input.customer_id,
                    quotation_id: input.quotation_id,
                    order_date: input.order_date,
                    expected_delivery_date: input.expected_delivery_date,
                    status: input.status,
                    payment_status: input.payment_status,
                    subtotal: input.subtotal,
                    tax_amount: input.tax_amount,
                    discount_amount: input.discount_amount,
                    shipping_charges: input.shipping_charges,
                    total_amount: input.total_amount,
                    amount_paid: input.amount_paid,
                    delivery_address: input.delivery_address,
                    notes: input.notes,
                    term_and_conditions: input.term_and_conditions,
                    warehouse_id: input.warehouse_id,
                })
                .eq('id', id)

            if (orderError) {
                console.error('Sales order update failed:', formatPostgrestError(orderError))
                throw orderError
            }

            const { error: deleteError } = await supabase
                .from('sales_order_items')
                .delete()
                .eq('order_id', id)

            if (deleteError) {
                console.error('Sales order items delete failed:', formatPostgrestError(deleteError))
                throw deleteError
            }

            const items = input.items.map(item => ({
                order_id: id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage
            }))

            const { error: itemsError } = await supabase
                .from('sales_order_items')
                .insert(items)

            if (itemsError) {
                console.error('Sales order items insert failed:', formatPostgrestError(itemsError))
                throw itemsError
            }
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
            queryClient.invalidateQueries({ queryKey: ['sales-order', id] })
            toast.success('Sales Order updated successfully')
        },
        onError: (error) => {
            console.error('Error updating sales order:', formatPostgrestError(error))
            const message = (error as any)?.message ? `Failed to update sales order: ${(error as any).message}` : 'Failed to update sales order'
            toast.error(message)
        }
    })
}

export function useConvertQuotationToOrder() {
    const createOrder = useCreateSalesOrder()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (quotation: SalesQuotation & { items: any[] }) => {
            const supabase = createClient()

            // 1. Create the order based on quotation details
            await createOrder.mutateAsync({
                customer_id: quotation.customer_id,
                quotation_id: quotation.id,
                order_date: new Date().toISOString().split('T')[0],
                status: 'draft',
                payment_status: 'unpaid',
                subtotal: quotation.subtotal,
                tax_amount: quotation.tax_amount,
                discount_amount: quotation.discount_amount,
                shipping_charges: quotation.shipping_charges,
                total_amount: quotation.total_amount,
                amount_paid: 0,
                notes: quotation.notes || undefined,
                term_and_conditions: quotation.term_and_conditions || undefined,
                items: quotation.items.map((item: any) => ({
                    product_id: item.product_id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percentage: item.discount_percentage,
                    line_total: item.line_total
                }))
            })

            // 2. Update quotation status to 'converted'
            const { error } = await supabase
                .from('sales_quotations')
                .update({ status: 'converted' })
                .eq('id', quotation.id)

            if (error) {
                console.error('Quotation status update failed:', formatPostgrestError(error))
                throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales-quotations'] })
            queryClient.invalidateQueries({ queryKey: ['sales-orders'] })
            toast.success('Quotation converted to Order')
        },
        onError: (error) => {
            console.error('Conversion failed', error)
            toast.error('Failed to convert quotation')
        }
    })
}
