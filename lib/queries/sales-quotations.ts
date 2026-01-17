import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { SalesQuotation, SalesQuotationWithDetails } from '@/lib/types/database'
import { toast } from 'sonner'

export type CreateQuotationInput = {
    customer_id: string
    quotation_date: string
    valid_until: string
    reference_number?: string
    status: SalesQuotation['status']
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    notes?: string
    term_and_conditions?: string
    items: {
        product_id: string
        description?: string
        quantity: number
        unit_price: number
        discount_percentage: number
        tax_percentage: number
    }[]
}

export type UpdateQuotationInput = CreateQuotationInput & {
    id: string
}

export function useSalesQuotations() {
    return useQuery({
        queryKey: ['sales-quotations'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_quotations')
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
            return data as (SalesQuotation & { customers: { name: string, customer_code: string } })[]
        }
    })
}

export function useSalesQuotation(id: string) {
    return useQuery({
        queryKey: ['sales-quotation', id],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_quotations')
                .select(`
                    *,
                    customers (*),
                    sales_quotation_items (
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
            return data as SalesQuotationWithDetails
        },
        enabled: !!id
    })
}

export function useCreateSalesQuotation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateQuotationInput) => {
            const supabase = createClient()
            // 1. Get next quotation number
            const { data: lastQuotation } = await supabase
                .from('sales_quotations')
                .select('quotation_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'QT-0001'
            if (lastQuotation) {
                const lastNum = parseInt(lastQuotation.quotation_number.split('-')[1])
                nextNumber = `QT-${String(lastNum + 1).padStart(4, '0')}`
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            // 2. Insert Quotation
            const { data: quotation, error: quotationError } = await supabase
                .from('sales_quotations')
                .insert({
                    quotation_number: nextNumber,
                    customer_id: input.customer_id,
                    quotation_date: input.quotation_date,
                    valid_until: input.valid_until,
                    reference_number: input.reference_number,
                    status: input.status,
                    subtotal: input.subtotal,
                    tax_amount: input.tax_amount,
                    discount_amount: input.discount_amount,
                    shipping_charges: input.shipping_charges,
                    total_amount: input.total_amount,
                    notes: input.notes,
                    term_and_conditions: input.term_and_conditions,
                    created_by: user.id
                })
                .select()
                .single()

            if (quotationError) throw quotationError

            // 3. Insert Items
            const items = input.items.map(item => ({
                quotation_id: quotation.id,
                product_id: item.product_id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage,
                tax_percentage: item.tax_percentage
                // line_total is generated
            }))

            const { error: itemsError } = await supabase
                .from('sales_quotation_items')
                .insert(items)

            if (itemsError) throw itemsError

            return quotation
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales-quotations'] })
            toast.success('Quotation created successfully')
        },
        onError: (error) => {
            console.error('Error creating quotation:', error)
            toast.error('Failed to create quotation')
        }
    })
}

export function useUpdateSalesQuotationStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, status }: { id: string, status: SalesQuotation['status'] }) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('sales_quotations')
                .update({ status })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['sales-quotations'] })
            queryClient.invalidateQueries({ queryKey: ['sales-quotation', id] })
            toast.success('Quotation status updated')
        },
        onError: (error) => {
            toast.error('Failed to update status')
        }
    })
}

export function useUpdateSalesQuotation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...input }: UpdateQuotationInput) => {
            const supabase = createClient()

            const { error: quotationError } = await supabase
                .from('sales_quotations')
                .update({
                    customer_id: input.customer_id,
                    quotation_date: input.quotation_date,
                    valid_until: input.valid_until,
                    reference_number: input.reference_number,
                    status: input.status,
                    subtotal: input.subtotal,
                    tax_amount: input.tax_amount,
                    discount_amount: input.discount_amount,
                    shipping_charges: input.shipping_charges,
                    total_amount: input.total_amount,
                    notes: input.notes,
                    term_and_conditions: input.term_and_conditions,
                })
                .eq('id', id)

            if (quotationError) throw quotationError

            const { error: deleteError } = await supabase
                .from('sales_quotation_items')
                .delete()
                .eq('quotation_id', id)

            if (deleteError) throw deleteError

            const items = input.items.map(item => ({
                quotation_id: id,
                product_id: item.product_id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage,
                tax_percentage: item.tax_percentage
            }))

            const { error: itemsError } = await supabase
                .from('sales_quotation_items')
                .insert(items)

            if (itemsError) throw itemsError
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['sales-quotations'] })
            queryClient.invalidateQueries({ queryKey: ['sales-quotation', id] })
            toast.success('Quotation updated successfully')
        },
        onError: (error) => {
            console.error('Error updating quotation:', error)
            toast.error('Failed to update quotation')
        }
    })
}

export function useDeleteSalesQuotation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient()
            const { error } = await supabase
                .from('sales_quotations')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales-quotations'] })
            toast.success('Quotation deleted')
        },
        onError: (error) => {
            toast.error('Failed to delete quotation')
        }
    })
}
