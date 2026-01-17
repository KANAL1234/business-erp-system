import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PurchaseOrder, PurchaseOrderItem } from '@/lib/types/database'

const supabase = createClient()

// Get all purchase orders
export function usePurchaseOrders(status?: string) {
    return useQuery({
        queryKey: ['purchase-orders', status],
        queryFn: async (): Promise<Array<PurchaseOrder & {
            vendors: { id: string; vendor_code: string; name: string } | null
            locations: { id: string; code: string; name: string } | null
        }>> => {
            let query = supabase
                .from('purchase_orders')
                .select(`
          id,
          po_number,
          po_date,
          expected_delivery_date,
          status,
          total_amount,
          vendors!inner(id, vendor_code, name),
          locations!inner(id, code, name)
        `)
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query

            if (error) throw error
            return data as any
        },
    })
}

// Get single purchase order
export function usePurchaseOrder(id: string) {
    return useQuery({
        queryKey: ['purchase-orders', id],
        queryFn: async () => {
            const { data: order, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('id', id)
                .maybeSingle()

            if (error) throw error
            if (!order) return null

            const [
                vendorRes,
                locationRes,
                itemsRes,
                requestedRes,
                approvedRes,
            ] = await Promise.all([
                supabase.from('vendors').select('id, vendor_code, name, phone, address').eq('id', order.vendor_id).maybeSingle(),
                supabase.from('locations').select('id, code, name').eq('id', order.location_id).maybeSingle(),
                supabase.from('purchase_order_items')
                    .select('*, products!fk_po_items_product(id, sku, name, cost_price)')
                    .eq('po_id', id),
                order.requested_by
                    ? supabase.from('user_profiles').select('id, full_name').eq('id', order.requested_by).maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
                order.approved_by
                    ? supabase.from('user_profiles').select('id, full_name').eq('id', order.approved_by).maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
            ])

            if (vendorRes.error) console.warn('Purchase order vendor fetch failed:', vendorRes.error)
            if (locationRes.error) console.warn('Purchase order location fetch failed:', locationRes.error)
            if (itemsRes.error) console.warn('Purchase order items fetch failed:', itemsRes.error)
            if (requestedRes.error) console.warn('Purchase order requester fetch failed:', requestedRes.error)
            if (approvedRes.error) console.warn('Purchase order approver fetch failed:', approvedRes.error)

            let items = itemsRes.data || []
            if (items.length > 0) {
                const missingProducts = items.filter((item: any) => !item.products).map((item: any) => item.product_id)
                if (missingProducts.length > 0) {
                    const { data: productsData, error: productsError } = await supabase
                        .from('products')
                        .select('id, sku, name, cost_price')
                        .in('id', missingProducts)

                    if (productsError) {
                        console.warn('Purchase order product fallback fetch failed:', productsError)
                    } else {
                        const productMap = new Map(productsData?.map(p => [p.id, p]) || [])
                        items = items.map((item: any) => ({
                            ...item,
                            products: item.products || productMap.get(item.product_id) || null
                        }))
                    }
                }
            }

            return {
                ...order,
                vendors: vendorRes.data || null,
                locations: locationRes.data || null,
                purchase_order_items: items,
                requested_by_user: requestedRes.data || null,
                approved_by_user: approvedRes.data || null,
            }
        },
        enabled: !!id,
    })
}

// Create purchase order
export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            vendorId,
            locationId,
            poDate,
            expectedDeliveryDate,
            items,
            notes,
            termsAndConditions,
        }: {
            vendorId: string
            locationId: string
            poDate: string
            expectedDeliveryDate?: string
            items: {
                product_id: string
                quantity: number
                unit_price: number
                discount_percentage?: number
                tax_percentage?: number
            }[]
            notes?: string
            termsAndConditions?: string
        }) => {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Calculate totals
            const subtotal = items.reduce((sum, item) => {
                const lineTotal = item.quantity * item.unit_price
                const afterDiscount = lineTotal * (1 - (item.discount_percentage || 0) / 100)
                return sum + afterDiscount
            }, 0)

            const taxAmount = items.reduce((sum, item) => {
                const lineTotal = item.quantity * item.unit_price
                const afterDiscount = lineTotal * (1 - (item.discount_percentage || 0) / 100)
                const tax = afterDiscount * ((item.tax_percentage || 0) / 100)
                return sum + tax
            }, 0)

            const total = subtotal + taxAmount

            // Generate PO number
            const poNumber = `PO-${Date.now()}`

            // Create purchase order
            const { data: po, error: poError } = await supabase
                .from('purchase_orders')
                .insert({
                    po_number: poNumber,
                    vendor_id: vendorId,
                    location_id: locationId,
                    po_date: poDate,
                    expected_delivery_date: expectedDeliveryDate,
                    status: 'DRAFT',
                    subtotal,
                    tax_amount: taxAmount,
                    discount_amount: 0,
                    total_amount: total,
                    notes,
                    terms_and_conditions: termsAndConditions,
                    requested_by: user.id,
                })
                .select()
                .single()

            if (poError) throw poError

            // Create PO items
            const poItems = items.map(item => ({
                po_id: po.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage || 0,
                tax_percentage: item.tax_percentage || 0,
                quantity_received: 0,
            }))

            const { error: itemsError } = await supabase
                .from('purchase_order_items')
                .insert(poItems)

            if (itemsError) throw itemsError

            return po
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        },
    })
}

// Update PO status
export function useUpdatePOStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string
            status: string
        }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const updates: any = { status }

            // If approving, set approved_by
            if (status === 'APPROVED') {
                updates.approved_by = user.id
            }

            const { error } = await supabase
                .from('purchase_orders')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            return { id, status }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        },
    })
}

// Delete PO (only if DRAFT)
export function useDeletePurchaseOrder() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            // Check status first
            const { data: po } = await supabase
                .from('purchase_orders')
                .select('status')
                .eq('id', id)
                .single()

            if (po?.status !== 'DRAFT') {
                throw new Error('Can only delete draft purchase orders')
            }

            const { error } = await supabase
                .from('purchase_orders')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
        },
    })
}
