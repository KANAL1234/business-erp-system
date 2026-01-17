import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { POSSale, POSSaleItem, CartItem } from '@/lib/types/database'

const supabase = createClient()
const TAX_RATE = 0.18
const formatPostgrestError = (error: any) => {
    if (!error) return null
    return {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
    }
}

// Get all POS sales
export function usePOSSales(locationId?: string, startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['pos-sales', locationId, startDate, endDate],
        queryFn: async () => {
            console.log('🔍 Fetching POS Sales with filters:', { locationId, startDate, endDate })
            const endDateExclusive = endDate
                ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                : undefined

            let query = supabase
                .from('pos_sales')
                .select(`
          *,
          pos_sale_items(
            *,
            products(id, sku, name)
          ),
          customers(id, customer_code, name),
          locations(id, code, name),
          cashier:user_profiles(id, full_name)
        `)
                .order('created_at', { ascending: false })

            if (locationId) {
                console.log('📍 Filtering by location:', locationId)
                query = query.eq('location_id', locationId)
            }

            if (startDate) {
                console.log('📅 Start date filter:', startDate)
                query = query.gte('sale_date', startDate)
            }

            if (endDate) {
                console.log('📅 End date filter:', endDate)
                if (endDateExclusive) {
                    query = query.lt('sale_date', endDateExclusive)
                }
            }

            const { data, error } = await query

            if (error) {
                console.error('❌ POS Sales Query Error:', formatPostgrestError(error))
                // Fallback: try without joins to avoid relationship/RLS failures
                let fallbackQuery = supabase
                    .from('pos_sales')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (locationId) {
                    fallbackQuery = fallbackQuery.eq('location_id', locationId)
                }

                if (startDate) {
                    fallbackQuery = fallbackQuery.gte('sale_date', startDate)
                }

                if (endDateExclusive) {
                    fallbackQuery = fallbackQuery.lt('sale_date', endDateExclusive)
                }

                const { data: fallbackData, error: fallbackError } = await fallbackQuery
                if (fallbackError) {
                    console.error('❌ POS Sales Fallback Error:', formatPostgrestError(fallbackError))
                    throw fallbackError
                }
                const saleIds = (fallbackData || []).map((sale) => sale.id).filter(Boolean)
                if (saleIds.length === 0) {
                    console.warn('⚠️ POS Sales loaded without related data (fallback mode)')
                    return fallbackData
                }

                const { data: items, error: itemsError } = await supabase
                    .from('pos_sale_items')
                    .select('id, sale_id, product_id, quantity, unit_price, discount_percentage, line_total')
                    .in('sale_id', saleIds)

                if (itemsError) {
                    console.warn('⚠️ POS Sales items fallback failed:', formatPostgrestError(itemsError))
                    console.warn('⚠️ POS Sales loaded without related data (fallback mode)')
                    return fallbackData
                }

                const itemsBySale = (items || []).reduce((acc, item) => {
                    const key = item.sale_id
                    if (!acc[key]) acc[key] = []
                    acc[key].push(item)
                    return acc
                }, {} as Record<string, any[]>)

                console.warn('⚠️ POS Sales loaded via fallback (items fetched separately)')
                return (fallbackData || []).map((sale) => ({
                    ...sale,
                    pos_sale_items: itemsBySale[sale.id] || []
                }))
            }

            console.log('✅ POS Sales fetched:', data?.length || 0, 'sales')
            return data
        },
    })
}

// Get single POS sale
export function usePOSSale(id: string) {
    return useQuery({
        queryKey: ['pos-sales', id],
        queryFn: async () => {
            console.log('🔍 Fetching single POS Sale:', id)

            const { data, error } = await supabase
                .from('pos_sales')
                .select(`
          *,
          pos_sale_items(
            *,
            products(id, sku, name, cost_price)
          ),
          customers(id, customer_code, name, phone),
          locations(id, code, name),
          cashier:user_profiles(id, full_name)
        `)
                .eq('id', id)
                .single()

            if (error) {
                console.error('❌ Single POS Sale Query Error:', formatPostgrestError(error))
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('pos_sales')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (fallbackError) {
                    console.error('❌ Single POS Sale Fallback Error:', formatPostgrestError(fallbackError))
                    throw fallbackError
                }
                const { data: items, error: itemsError } = await supabase
                    .from('pos_sale_items')
                    .select('id, sale_id, product_id, quantity, unit_price, discount_percentage, line_total')
                    .eq('sale_id', id)

                if (itemsError) {
                    console.warn('⚠️ POS Sale items fallback failed:', formatPostgrestError(itemsError))
                    console.warn('⚠️ POS Sale loaded without related data (fallback mode)')
                    return fallbackData
                }

                const productIds = Array.from(new Set((items || []).map(item => item.product_id).filter(Boolean)))
                let productsById: Record<string, { id: string; sku: string | null; name: string | null }> = {}

                if (productIds.length > 0) {
                    const { data: products, error: productsError } = await supabase
                        .from('products')
                        .select('id, sku, name')
                        .in('id', productIds)

                    if (productsError) {
                        console.warn('⚠️ POS Sale products fallback failed:', formatPostgrestError(productsError))
                    } else if (products) {
                        productsById = products.reduce((acc, product) => {
                            acc[product.id] = product
                            return acc
                        }, {} as Record<string, { id: string; sku: string | null; name: string | null }>)
                    }
                }

                const itemsWithProducts = (items || []).map(item => ({
                    ...item,
                    products: productsById[item.product_id] || null,
                }))

                console.warn('⚠️ POS Sale loaded via fallback (items fetched separately)')
                return {
                    ...fallbackData,
                    pos_sale_items: itemsWithProducts,
                }
            }

            console.log('✅ POS Sale fetched:', data?.sale_number)
            return data
        },
        enabled: !!id,
    })
}

// Get today's sales for a location
export function useTodaySales(locationId: string) {
    const today = new Date().toISOString().split('T')[0]

    return useQuery({
        queryKey: ['pos-sales', 'today', locationId],
        queryFn: async () => {
            console.log('🔍 Fetching Today\'s Sales for location:', locationId, 'date:', today)

            const { data, error } = await supabase
                .from('pos_sales')
                .select(`
          *,
          pos_sale_items(quantity, line_total),
          customers(name)
        `)
                .eq('location_id', locationId)
                .gte('sale_date', today)

            if (error) {
                console.error('❌ Today\'s Sales Query Error:', formatPostgrestError(error))
                // Fallback: pull sales without joins for daily closing calculations
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('pos_sales')
                    .select('*')
                    .eq('location_id', locationId)
                    .gte('sale_date', today)

                if (fallbackError) {
                    console.error('❌ Today\'s Sales Fallback Error:', formatPostgrestError(fallbackError))
                    throw fallbackError
                }
                console.warn('⚠️ Today\'s sales loaded without related data (fallback mode)')
                return fallbackData
            }

            console.log('✅ Today\'s Sales fetched:', data?.length || 0, 'sales')
            return data
        },
        enabled: !!locationId,
    })
}

// Create POS sale
export function useCreatePOSSale() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            locationId,
            customerId,
            items,
            paymentMethod,
            amountPaid,
            discountAmount = 0,
            notes,
        }: {
            locationId: string
            customerId?: string
            items: CartItem[]
            paymentMethod: 'CASH' | 'CREDIT' | 'BANK_TRANSFER'
            amountPaid: number
            discountAmount?: number
            notes?: string
        }) => {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Calculate totals
            const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
            const taxableAmount = subtotal - discountAmount
            const taxAmount = taxableAmount * TAX_RATE
            const total = taxableAmount + taxAmount
            const amountDue = total - amountPaid

            // Generate sale number
            const saleNumber = `INV-POS-${Date.now()}`

            // Create sale
            const { data: sale, error: saleError } = await supabase
                .from('pos_sales')
                .insert({
                    sale_number: saleNumber,
                    location_id: locationId,
                    customer_id: customerId,
                    sale_date: new Date().toISOString(),
                    subtotal,
                    discount_amount: discountAmount,
                    tax_amount: taxAmount,
                    total_amount: total,
                    payment_method: paymentMethod,
                    amount_paid: amountPaid,
                    cashier_id: user.id,
                    notes,
                    is_synced: true,
                })
                .select()
                .single()

            if (saleError) throw saleError

            // Create sale items
            const saleItems = items.map(item => ({
                sale_id: sale.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage,
            }))

            const { error: itemsError } = await supabase
                .from('pos_sale_items')
                .insert(saleItems)

            if (itemsError) throw itemsError

            // Update inventory stock for each item
            for (const item of items) {
                await supabase.rpc('adjust_inventory_stock', {
                    p_product_id: item.product_id,
                    p_location_id: locationId,
                    p_quantity_change: -item.quantity,
                })

                // Create inventory transaction
                const { data: txnType } = await supabase
                    .from('transaction_types')
                    .select('id')
                    .eq('code', 'SALE')
                    .single()

                if (txnType) {
                    await supabase.from('inventory_transactions').insert({
                        transaction_type_id: txnType.id,
                        transaction_number: saleNumber,
                        product_id: item.product_id,
                        from_location_id: locationId,
                        quantity: item.quantity,
                        unit_cost: item.product.cost_price || 0,
                        reference_type: 'SALE',
                        reference_id: sale.id,
                        reference_number: saleNumber,
                        created_by: user.id,
                    })
                }
            }

            // If credit sale, update customer balance
            if (paymentMethod === 'CREDIT' && customerId) {
                await supabase.rpc('update_customer_balance', {
                    p_customer_id: customerId,
                    p_amount_change: amountDue,
                })
            }

            // Post to General Ledger (Accounting Integration)
            try {
                await supabase.rpc('post_pos_sale', {
                    p_sale_id: sale.id
                })
            } catch (glError) {
                console.warn('GL posting failed (non-critical):', glError)
                // Don't fail the sale if GL posting fails
            }

            return sale
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pos-sales'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
        },
    })
}

// Get sales summary for date range
export function useSalesSummary(locationId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['sales-summary', locationId, startDate, endDate],
        queryFn: async () => {
            const endDateExclusive = endDate
                ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                : undefined
            const { data, error } = await supabase
                .from('pos_sales')
                .select('total_amount, amount_paid, payment_method, created_at')
                .eq('location_id', locationId)
                .gte('sale_date', startDate)
                .lt('sale_date', endDateExclusive || endDate)

            if (error) throw error

            // Calculate summary
            const totalSales = data.reduce((sum, sale) => sum + sale.total_amount, 0)
            const totalCash = data
                .filter(s => s.payment_method === 'CASH')
                .reduce((sum, sale) => sum + sale.amount_paid, 0)
            const totalCredit = data
                .filter(s => s.payment_method === 'CREDIT')
                .reduce((sum, sale) => sum + sale.total_amount, 0)
            const transactionCount = data.length

            return {
                totalSales,
                totalCash,
                totalCredit,
                transactionCount,
                sales: data,
            }
        },
        enabled: !!locationId && !!startDate && !!endDate,
    })
}
