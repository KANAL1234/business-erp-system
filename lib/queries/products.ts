import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Product, ProductWithDetails } from '@/lib/types/database'

const supabase = createClient()

// Get all products with category and UOM details
export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          product_categories(id, code, name, costing_method),
          units_of_measure(id, code, name),
          inventory_stock(
            location_id,
            quantity_on_hand,
            quantity_available,
            quantity_reserved
          )
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            // Aggregate stock across all locations for total_stock
            const productsWithStock = data?.map((product: any) => ({
                ...product,
                total_stock: product.inventory_stock?.reduce(
                    (sum: number, stock: any) => sum + (stock.quantity_on_hand || 0),
                    0
                ) || 0
            }))

            return productsWithStock as ProductWithDetails[]
        },
    })
}

// Get single product
export function useProduct(id: string) {
    return useQuery({
        queryKey: ['products', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          product_categories(id, code, name, costing_method),
          units_of_measure(id, code, name)
        `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data as ProductWithDetails
        },
        enabled: !!id,
    })
}

// Get all categories
export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data
        },
    })
}

// Get all UOMs
export function useUOMs() {
    return useQuery({
        queryKey: ['uoms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('units_of_measure')
                .select('*')
                .order('code')

            if (error) throw error
            return data
        },
    })
}

// Create product
export function useCreateProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (product: Partial<Product>) => {
            const { data, error } = await supabase
                .from('products')
                .insert(product)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
    })
}

// Update product
export function useUpdateProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
            const { data, error } = await supabase
                .from('products')
                .update(product)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
    })
}

// Delete product
export function useDeleteProduct() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        },
    })
}
