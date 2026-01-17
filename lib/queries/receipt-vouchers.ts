import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ReceiptVoucher } from '@/lib/types/database'
import { toast } from 'sonner'

export function useReceiptVouchers() {
    return useQuery({
        queryKey: ['receipt-vouchers'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('receipt_vouchers')
                .select(`
                    *,
                    customers (id, name, customer_code),
                    bank_accounts (id, account_name, account_number)
                `)
                .order('receipt_date', { ascending: false })

            if (error) throw error
            return data
        }
    })
}

export function useCreateReceiptVoucher() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            customerId,
            bankAccountId,
            receiptDate,
            receiptMethod,
            amount,
            notes,
            invoiceAllocations
        }: {
            customerId: string
            bankAccountId?: string
            receiptDate: string
            receiptMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'
            amount: number
            notes?: string
            invoiceAllocations?: { invoice_id: string, amount_allocated: number }[]
        }) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Generate voucher number
            const { data: lastVoucher } = await supabase
                .from('receipt_vouchers')
                .select('voucher_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let voucherNumber = 'RV-0001'
            if (lastVoucher) {
                const lastNum = parseInt(lastVoucher.voucher_number.split('-')[1])
                voucherNumber = `RV-${String(lastNum + 1).padStart(4, '0')}`
            }

            // Create Receipt Voucher
            const { data: voucher, error: voucherError } = await supabase
                .from('receipt_vouchers')
                .insert({
                    voucher_number: voucherNumber,
                    customer_id: customerId,
                    bank_account_id: bankAccountId,
                    receipt_date: receiptDate,
                    payment_method: receiptMethod,
                    amount,
                    notes,
                    status: 'posted',
                    created_by: user.id
                })
                .select()
                .single()

            if (voucherError) throw voucherError

            // Create allocations if provided
            if (invoiceAllocations && invoiceAllocations.length > 0) {
                const allocations = invoiceAllocations.map(alloc => ({
                    receipt_voucher_id: voucher.id,
                    customer_invoice_id: alloc.invoice_id,
                    amount_allocated: alloc.amount_allocated
                }))

                await supabase.from('receipt_allocations').insert(allocations)

                // Update customer invoices payment status
                for (const alloc of invoiceAllocations) {
                    const { data: invoice } = await supabase
                        .from('customer_invoices_accounting')
                        .select('total_amount, amount_received')
                        .eq('id', alloc.invoice_id)
                        .single()

                    if (invoice) {
                        const currentReceived = Number(invoice.amount_received || 0)
                        const newAmountReceived = currentReceived + alloc.amount_allocated
                        const paymentStatus = newAmountReceived >= invoice.total_amount ? 'paid' : newAmountReceived > 0 ? 'partial' : 'unpaid'

                        await supabase
                            .from('customer_invoices_accounting')
                            .update({
                                amount_received: newAmountReceived,
                                payment_status: paymentStatus
                            })
                            .eq('id', alloc.invoice_id)
                    }
                }
            }

            // Post to GL
            await supabase.rpc('post_receipt_voucher', {
                p_receipt_id: voucher.id
            })

            // Update customer balance (reduce receivable)
            await supabase.rpc('update_customer_balance', {
                p_customer_id: customerId,
                p_amount_change: -amount
            })

            return voucher
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['receipt-vouchers'] })
            queryClient.invalidateQueries({ queryKey: ['customer-invoices-accounting'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
            toast.success('Receipt voucher created and posted to GL')
        },
        onError: (error: any) => {
            toast.error('Failed to create receipt voucher: ' + error.message)
        }
    })
}
