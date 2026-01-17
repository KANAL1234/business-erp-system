import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { SalesInvoice, SalesInvoiceWithDetails, SalesOrder } from '@/lib/types/database'
import { toast } from 'sonner'

export type CreateInvoiceInput = {
    customer_id: string
    sales_order_id?: string
    location_id?: string | null
    warehouse_id?: string | null
    invoice_date: string
    due_date: string
    status: SalesInvoice['status']
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    amount_paid: number
    notes?: string
    items: {
        product_id: string
        sales_order_item_id?: string
        quantity: number
        unit_price: number
        discount_percentage: number
        tax_percentage: number
        line_total: number
    }[]
}

export function useSalesInvoices() {
    return useQuery({
        queryKey: ['sales-invoices'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_invoices')
                .select(`
                    *,
                    customers (
                        id,
                        name,
                        customer_code
                    ),
                    sales_orders (
                        order_number
                    )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (SalesInvoice & {
                customers: { name: string, customer_code: string },
                sales_orders?: { order_number: string }
            })[]
        }
    })
}

export function useSalesInvoice(id: string) {
    return useQuery({
        queryKey: ['sales-invoice', id],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('sales_invoices')
                .select(`
                    *,
                    customers (*),
                    sales_orders (order_number),
                    sales_invoice_items (
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
            return data as SalesInvoiceWithDetails
        },
        enabled: !!id
    })
}

export function useCreateSalesInvoice() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateInvoiceInput) => {
            const supabase = createClient()

            // 1. Get next invoice number
            const { data: lastInvoice } = await supabase
                .from('sales_invoices')
                .select('invoice_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'INV-SALE-0001'
            if (lastInvoice?.invoice_number) {
                const match = lastInvoice.invoice_number.match(/(\d+)$/)
                const lastNum = match ? parseInt(match[1], 10) : 0
                nextNumber = `INV-SALE-${String(lastNum + 1).padStart(4, '0')}`
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            let locationId = input.location_id || null
            let warehouseId = input.warehouse_id || null

            if (input.sales_order_id) {
                const { data: salesOrder, error: salesOrderError } = await supabase
                    .from('sales_orders')
                    .select('location_id, warehouse_id')
                    .eq('id', input.sales_order_id)
                    .single()

                if (salesOrderError) throw salesOrderError
                locationId = salesOrder?.location_id || locationId
                warehouseId = salesOrder?.warehouse_id || warehouseId
            }

            // 2. Insert Invoice
            const { data: invoice, error: invoiceError } = await supabase
                .from('sales_invoices')
                .insert({
                    invoice_number: nextNumber,
                    customer_id: input.customer_id,
                    sales_order_id: input.sales_order_id,
                    location_id: locationId,
                    warehouse_id: warehouseId,
                    invoice_date: input.invoice_date,
                    due_date: input.due_date,
                    status: input.status,
                    subtotal: input.subtotal,
                    tax_amount: input.tax_amount,
                    discount_amount: input.discount_amount,
                    shipping_charges: input.shipping_charges,
                    total_amount: input.total_amount,
                    amount_paid: input.amount_paid,
                    notes: input.notes,
                    created_by: user.id
                })
                .select()
                .single()

            if (invoiceError) throw invoiceError

            // 3. Insert Items
            const items = input.items.map(item => ({
                invoice_id: invoice.id,
                sales_order_item_id: item.sales_order_item_id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage,
                tax_percentage: item.tax_percentage
                // line_total is generated
            }))

            const { error: itemsError } = await supabase
                .from('sales_invoice_items')
                .insert(items)

            if (itemsError) throw itemsError

            // Update customer balance for receivable (non-blocking)
            const balanceDelta = input.total_amount - input.amount_paid
            if (balanceDelta !== 0) {
                try {
                    await supabase.rpc('update_customer_balance', {
                        p_customer_id: input.customer_id,
                        p_amount_change: balanceDelta
                    })
                } catch (balanceError) {
                    console.warn('Customer balance update failed (non-critical):', balanceError)
                }
            }

            return invoice
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            toast.success('Invoice created successfully')
        },
        onError: (error) => {
            console.error('Error creating invoice:', error)
            toast.error('Failed to create invoice')
        }
    })
}

export function useUpdateInvoiceStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, status }: { id: string, status: SalesInvoice['status'] }) => {
            const supabase = createClient()

            // Get full invoice details for GL posting
            const { data: invoice, error } = await supabase
                .from('sales_invoices')
                .update({ status })
                .eq('id', id)
                .select(`
                    id,
                    invoice_number,
                    invoice_date,
                    customer_id,
                    total_amount,
                    amount_paid,
                    subtotal,
                    tax_amount,
                    discount_amount,
                    shipping_charges,
                    created_by,
                    customers (name)
                `)
                .single()

            if (error) throw error

            // Post to General Ledger if status is posted (Accounting Integration)
            if (status === 'posted' && invoice) {
                // Update customer balance
                if (invoice.customer_id) {
                    const balanceDelta = Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)
                    if (balanceDelta !== 0) {
                        try {
                            await supabase.rpc('update_customer_balance', {
                                p_customer_id: invoice.customer_id,
                                p_amount_change: balanceDelta
                            })
                        } catch (balanceError) {
                            // Non-critical, continue
                        }
                    }
                }

                // Create Journal Entry for B2B Sales Invoice
                try {
                    // Get required GL accounts
                    const { data: accounts } = await supabase
                        .from('chart_of_accounts')
                        .select('id, account_code')
                        .in('account_code', ['1100', '4010', '2100'])
                        .eq('is_active', true)

                    const arAccount = accounts?.find(a => a.account_code === '1100')
                    const salesAccount = accounts?.find(a => a.account_code === '4010')
                    const taxAccount = accounts?.find(a => a.account_code === '2100')

                    if (!arAccount || !salesAccount) {
                        console.warn('Required GL accounts not found (1100 or 4010)')
                        return invoice
                    }

                    // Get fiscal year
                    const { data: fiscalYear } = await supabase
                        .from('fiscal_years')
                        .select('id')
                        .eq('is_closed', false)
                        .limit(1)
                        .single()

                    // Generate journal number
                    const journalNumber = `JE-SINV-${invoice.invoice_number}`

                    // Check if journal entry already exists
                    const { data: existingJE } = await supabase
                        .from('journal_entries')
                        .select('id')
                        .eq('journal_number', journalNumber)
                        .single()

                    if (existingJE) {
                        // Already posted
                        return invoice
                    }

                    // Calculate amounts
                    const totalAmount = Number(invoice.total_amount) || 0
                    const netSales = (Number(invoice.subtotal) || 0) -
                                    (Number(invoice.discount_amount) || 0) +
                                    (Number(invoice.shipping_charges) || 0)
                    const taxAmount = Number(invoice.tax_amount) || 0
                    const customerName = (invoice as any).customers?.name || 'Customer'

                    // Create journal entry
                    const { data: journalEntry, error: jeError } = await supabase
                        .from('journal_entries')
                        .insert({
                            journal_number: journalNumber,
                            journal_type: 'AUTO',
                            journal_date: invoice.invoice_date,
                            fiscal_year_id: fiscalYear?.id,
                            reference_type: 'SALES_INVOICE',
                            reference_id: invoice.id,
                            reference_number: invoice.invoice_number,
                            narration: `B2B Sales Invoice - ${invoice.invoice_number} - ${customerName}`,
                            total_debit: totalAmount,
                            total_credit: totalAmount,
                            status: 'posted',
                            posted_at: new Date().toISOString(),
                            posted_by: invoice.created_by
                        })
                        .select()
                        .single()

                    if (jeError) {
                        console.warn('Failed to create journal entry:', jeError)
                        return invoice
                    }

                    // Create journal entry lines
                    const lines = [
                        // Debit: Accounts Receivable
                        {
                            journal_entry_id: journalEntry.id,
                            account_id: arAccount.id,
                            debit_amount: totalAmount,
                            credit_amount: 0,
                            description: `Accounts Receivable - ${customerName}`
                        },
                        // Credit: Sales Revenue
                        {
                            journal_entry_id: journalEntry.id,
                            account_id: salesAccount.id,
                            debit_amount: 0,
                            credit_amount: netSales,
                            description: `Sales Revenue - ${invoice.invoice_number}`
                        }
                    ]

                    // Add tax line if applicable
                    if (taxAmount > 0 && taxAccount) {
                        lines.push({
                            journal_entry_id: journalEntry.id,
                            account_id: taxAccount.id,
                            debit_amount: 0,
                            credit_amount: taxAmount,
                            description: `Output Sales Tax - ${invoice.invoice_number}`
                        })
                    }

                    await supabase.from('journal_entry_lines').insert(lines)

                    // Update account balances if the function exists
                    try {
                        await supabase.rpc('update_account_balances')
                    } catch {
                        // Non-critical
                    }

                } catch (glError) {
                    console.warn('GL posting failed:', glError)
                    // Don't fail the status update if GL posting fails
                }
            }

            return invoice
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
            queryClient.invalidateQueries({ queryKey: ['sales-invoice', id] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            toast.success('Invoice posted and journal entry created')
        },
        onError: (error) => {
            toast.error('Failed to update status')
        }
    })
}

export function useGenerateInvoiceFromOrder() {
    const createInvoice = useCreateSalesInvoice()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (order: SalesOrder & { items: any[] }) => {
            const invoiceDate = new Date().toISOString().split('T')[0]
            // Default 30 day term
            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            await createInvoice.mutateAsync({
                customer_id: order.customer_id,
                sales_order_id: order.id,
                invoice_date: invoiceDate,
                due_date: dueDate,
                status: 'draft',
                subtotal: order.subtotal,
                tax_amount: order.tax_amount,
                discount_amount: order.discount_amount,
                shipping_charges: order.shipping_charges,
                total_amount: order.total_amount,
                amount_paid: 0,
                notes: order.notes || undefined,
                items: order.items.map((item: any) => ({
                    product_id: item.product_id,
                    sales_order_item_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percentage: item.discount_percentage,
                    tax_percentage: item.tax_percentage ?? 0,
                    line_total: item.line_total
                }))
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            toast.success('Invoice generated from Order')
        },
        onError: (error) => {
            console.error('Generation failed', error)
            toast.error('Failed to generate invoice')
        }
    })
}
