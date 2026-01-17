import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CustomerInvoiceAccounting } from '@/lib/types/database'
import { toast } from 'sonner'

export function useCustomerInvoices() {
    return useQuery({
        queryKey: ['customer-invoices-accounting'],
        queryFn: async () => {
            const supabase = createClient()
            try {
                await supabase.rpc('sync_sales_invoices_to_accounting')
            } catch {
                // best-effort sync; list should still load
            }
            const { data, error } = await supabase
                .from('customer_invoices_accounting')
                .select(`
                    *,
                    customers (id, name, customer_code),
                    locations (name, code),
                    inventory_locations (location_name, location_code),
                    sales_orders (
                        id,
                        location_id,
                        warehouse_id,
                        locations (name, code),
                        inventory_locations (location_name, location_code)
                    )
                `)
                .order('invoice_date', { ascending: false })

            const formatStoreName = (name: string) => {
                return name
                    .replace(/^Store\s*\d*\s*-\s*/i, '')
                    .replace(/^Store\s*-\s*/i, '')
                    .replace(/^Mobile Store\s*-\s*/i, '')
                    .trim()
            }

            const formatSalesSource = (invoice: any) => {
                const directWarehouse = invoice?.inventory_locations
                if (directWarehouse?.location_name) {
                    const code = directWarehouse.location_code ? ` (${directWarehouse.location_code})` : ''
                    return `Warehouse ${directWarehouse.location_name}${code}`
                }

                const directLocation = invoice?.locations
                if (directLocation?.name) {
                    const code = directLocation.code ? ` ${directLocation.code}` : ''
                    return `${formatStoreName(directLocation.name)}${code}`
                }

                const warehouse = invoice?.sales_orders?.inventory_locations
                if (warehouse?.location_name) {
                    const code = warehouse.location_code ? ` (${warehouse.location_code})` : ''
                    return `Warehouse ${warehouse.location_name}${code}`
                }

                const location = invoice?.sales_orders?.locations
                if (location?.name) {
                    const code = location.code ? ` ${location.code}` : ''
                    return `${formatStoreName(location.name)}${code}`
                }

                return 'No Location'
            }

            if (error) throw error

            return (data || []).map((invoice: any) => {
                const totalAmount = Number(invoice.total_amount || 0)
                const amountReceived = Number(invoice.amount_received || 0)
                const amountDue = Number(invoice.amount_due ?? (totalAmount - amountReceived))
                const paymentStatus = invoice.payment_status || (amountDue <= 0 ? 'paid' : amountReceived > 0 ? 'partial' : 'unpaid')

                return {
                    ...invoice,
                    total_amount: totalAmount,
                    amount_received: amountReceived,
                    amount_due: amountDue,
                    payment_status: paymentStatus,
                    sales_source: formatSalesSource(invoice),
                }
            })
        }
    })
}

export function useCreateCustomerInvoice() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (invoice: Partial<CustomerInvoiceAccounting>) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Generate invoice number
            const { data: lastInvoice } = await supabase
                .from('customer_invoices_accounting')
                .select('invoice_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'CI-0001'
            if (lastInvoice) {
                const lastNum = parseInt(lastInvoice.invoice_number.split('-')[1])
                nextNumber = `CI-${String(lastNum + 1).padStart(4, '0')}`
            }

            let locationId = invoice.location_id || null
            let warehouseId = invoice.warehouse_id || null

            if (invoice.sales_order_id) {
                const { data: salesOrder, error: salesOrderError } = await supabase
                    .from('sales_orders')
                    .select('location_id, warehouse_id')
                    .eq('id', invoice.sales_order_id)
                    .single()

                if (salesOrderError) throw salesOrderError
                locationId = salesOrder?.location_id || locationId
                warehouseId = salesOrder?.warehouse_id || warehouseId
            }

            const { data, error } = await supabase
                .from('customer_invoices_accounting')
                .insert({
                    ...invoice,
                    invoice_number: nextNumber,
                    location_id: locationId,
                    warehouse_id: warehouseId,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error

            // Auto-post to GL if approved
            if (invoice.status === 'approved') {
                await supabase.rpc('post_customer_invoice', { p_invoice_id: data.id })
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-invoices-accounting'] })
            toast.success('Customer invoice created successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to create customer invoice: ' + error.message)
        }
    })
}

export function useApproveCustomerInvoice() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('customer_invoices_accounting')
                .update({ status: 'approved' })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            // Auto-post to GL
            await supabase.rpc('post_customer_invoice', { p_invoice_id: id })

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customer-invoices-accounting'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            toast.success('Customer invoice approved and posted to GL')
        },
        onError: (error: any) => {
            toast.error('Failed to approve customer invoice: ' + error.message)
        }
    })
}
