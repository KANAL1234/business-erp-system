import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { InventoryStockWithDetails, InventoryTransaction } from '@/lib/types/database'

const supabase = createClient()

// Get all inventory stock
export function useInventoryStock() {
    return useQuery({
        queryKey: ['inventory-stock'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_stock')
                .select(`
          *,
          products(id, sku, name, reorder_point),
          locations(
            id,
            code,
            name,
            location_types(name)
          )
        `)
                .order('last_updated', { ascending: false })

            if (error) throw error
            return data as InventoryStockWithDetails[]
        },
    })
}

// Get stock for specific product
export function useProductStock(productId: string) {
    return useQuery({
        queryKey: ['inventory-stock', 'product', productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_stock')
                .select(`
          *,
          locations(
            id,
            code,
            name,
            location_types(name)
          )
        `)
                .eq('product_id', productId)

            if (error) throw error
            return data as InventoryStockWithDetails[]
        },
        enabled: !!productId,
    })
}

// Get stock for specific location
export function useLocationStock(locationId: string) {
    return useQuery({
        queryKey: ['inventory-stock', 'location', locationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_stock')
                .select(`
          *,
          products(id, sku, name, reorder_point, selling_price)
        `)
                .eq('location_id', locationId)
                .order('products(name)')

            if (error) throw error
            return data as InventoryStockWithDetails[]
        },
        enabled: !!locationId,
    })
}

// Get stock for multiple locations (LBAC support)
export function useMultiLocationStock(locationIds: string[]) {
    return useQuery({
        queryKey: ['inventory-stock', 'locations', locationIds.sort().join(',')],
        queryFn: async () => {
            if (locationIds.length === 0) return []

            const { data, error } = await supabase
                .from('inventory_stock')
                .select(`
          *,
          products(id, sku, name, reorder_point, selling_price),
          locations(id, code, name)
        `)
                .in('location_id', locationIds)
                .order('products(name)')

            if (error) throw error
            return data as InventoryStockWithDetails[]
        },
        enabled: locationIds.length > 0,
    })
}

// Get low stock items
export function useLowStock() {
    return useQuery({
        queryKey: ['inventory-stock', 'low-stock'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_stock')
                .select(`
            *,
            products!inner(id, sku, name, reorder_point),
            locations(id, code, name)
          `)

            if (error) throw error

            // Filter logically since basic Supabase JS doesn't support LTE against related columns easily without RPC
            const filtered = (data || []).filter(item =>
                item.quantity_available <= (item.products?.reorder_point || 0)
            )

            return filtered as InventoryStockWithDetails[]
        },
    })
}

// Get inventory transactions history
export function useInventoryTransactions(productId?: string, locationId?: string) {
    return useQuery({
        queryKey: ['inventory-transactions', productId, locationId],
        queryFn: async () => {
            let query = supabase
                .from('inventory_transactions')
                .select(`
          *,
          products(id, sku, name),
          from_location:locations!from_location_id(id, code, name),
          to_location:locations!to_location_id(id, code, name),
          transaction_types(code, name, direction)
        `)
                .order('created_at', { ascending: false })
                .limit(100)

            if (productId) {
                query = query.eq('product_id', productId)
            }

            if (locationId) {
                query = query.or(`from_location_id.eq.${locationId},to_location_id.eq.${locationId}`)
            }

            const { data, error } = await query

            if (error) throw error
            return data
        },
    })
}

// Initialize stock for a product at a location
export function useInitializeStock() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            product_id,
            location_id,
            quantity,
            unit_cost,
        }: {
            product_id: string
            location_id: string
            quantity: number
            unit_cost: number
        }) => {
            // Check if stock record exists
            const { data: existing } = await supabase
                .from('inventory_stock')
                .select('id')
                .eq('product_id', product_id)
                .eq('location_id', location_id)
                .maybeSingle()

            if (existing) {
                // Update existing
                const { data, error } = await supabase
                    .from('inventory_stock')
                    .update({
                        quantity_on_hand: quantity,
                        quantity_available: quantity,
                        average_cost: unit_cost,
                        total_value: quantity * unit_cost,
                        last_updated: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (error) throw error
                return data
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('inventory_stock')
                    .insert({
                        product_id,
                        location_id,
                        quantity_on_hand: quantity,
                        quantity_available: quantity,
                        average_cost: unit_cost,
                        total_value: quantity * unit_cost,
                        last_updated: new Date().toISOString()
                    })
                    .select()
                    .single()

                if (error) throw error
                return data
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
        },
    })
}
