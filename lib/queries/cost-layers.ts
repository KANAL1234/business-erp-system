import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Get cost layers for a product at a location
export function useCostLayers(productId?: string, locationId?: string) {
    return useQuery({
        queryKey: ['cost-layers', productId, locationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_cost_layer_report', {
                    p_product_id: productId || null,
                    p_location_id: locationId || null
                })

            if (error) throw error
            return data
        },
        enabled: !!productId || !!locationId
    })
}

// Get inventory valuation report
export function useInventoryValuation(locationId?: string) {
    return useQuery({
        queryKey: ['inventory-valuation', locationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_inventory_valuation', {
                    p_location_id: locationId || null
                })

            if (error) throw error
            return data
        }
    })
}

// Calculate AVCO for a product at location
export function useAverageCost(productId: string, locationId: string) {
    return useQuery({
        queryKey: ['average-cost', productId, locationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('calculate_avco', {
                    p_product_id: productId,
                    p_location_id: locationId
                })

            if (error) throw error
            return data as number
        },
        enabled: !!productId && !!locationId
    })
}

// Get COGS for a potential sale (preview only, doesn't consume)
export function usePreviewCOGS(productId: string, locationId: string, quantity: number) {
    return useQuery({
        queryKey: ['preview-cogs', productId, locationId, quantity],
        queryFn: async () => {
            // Note: This is a preview calculation
            // Actual COGS calculation happens during sale posting
            const { data: product } = await supabase
                .from('products')
                .select('category_id, product_categories(costing_method)')
                .eq('id', productId)
                .single()

            const { data: stock } = await supabase
                .from('inventory_stock')
                .select('average_cost')
                .eq('product_id', productId)
                .eq('location_id', locationId)
                .single()

            if (!product || !stock) return 0

            // For preview, use average cost regardless of method
            // Actual FIFO calculation happens server-side during sale
            return stock.average_cost * quantity
        },
        enabled: !!productId && !!locationId && quantity > 0
    })
}
