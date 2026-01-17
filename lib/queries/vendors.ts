import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Vendor } from '@/lib/types/database'

const supabase = createClient()

// Get all vendors
export function useVendors() {
    return useQuery({
        queryKey: ['vendors'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('is_active', true)
                .order('name')

            if (error) throw error
            return data as Vendor[]
        },
    })
}

// Get single vendor
export function useVendor(id: string) {
    return useQuery({
        queryKey: ['vendors', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Vendor
        },
        enabled: !!id,
    })
}

// Search vendors
export function useSearchVendors(searchQuery: string) {
    return useQuery({
        queryKey: ['vendors', 'search', searchQuery],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('is_active', true)
                .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,vendor_code.ilike.%${searchQuery}%`)
                .limit(10)

            if (error) throw error
            return data as Vendor[]
        },
        enabled: searchQuery.length >= 2,
    })
}

// Create vendor
export function useCreateVendor() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (vendor: Partial<Vendor>) => {
            // Generate vendor code
            const vendorCode = `VEND-${Date.now()}`

            const { data, error } = await supabase
                .from('vendors')
                .insert({
                    vendor_code: vendorCode,
                    name: vendor.name,
                    contact_person: vendor.contact_person,
                    phone: vendor.phone,
                    email: vendor.email,
                    address: vendor.address,
                    city: vendor.city,
                    ntn: vendor.ntn,
                    payment_terms_days: vendor.payment_terms_days || 30,
                    vendor_category: vendor.vendor_category,
                    notes: vendor.notes,
                    is_active: true,
                })
                .select()
                .single()

            if (error) throw error
            return data as Vendor
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] })
        },
    })
}

// Update vendor
export function useUpdateVendor() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...vendor }: Partial<Vendor> & { id: string }) => {
            const { data, error } = await supabase
                .from('vendors')
                .update(vendor)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data as Vendor
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] })
        },
    })
}

// Delete vendor (soft delete)
export function useDeleteVendor() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('vendors')
                .update({ is_active: false })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] })
        },
    })
}
