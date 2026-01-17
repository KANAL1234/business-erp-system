import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PaymentVoucher } from '@/lib/types/database'
import { toast } from 'sonner'

export function usePaymentVouchers(vendorBillId?: string) {
    return useQuery({
        queryKey: ['payment-vouchers', vendorBillId],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('payment_vouchers')
                .select(`
                    *,
                    vendors (id, name, vendor_code),
                    bank_accounts (id, account_name, account_number),
                    payment_allocations (vendor_bill_id, allocated_amount)
                `)
                .order('payment_date', { ascending: false })

            if (error) throw error
            if (!vendorBillId) return data

            return (data || []).filter((voucher: any) =>
                (voucher.payment_allocations || []).some(
                    (alloc: any) => alloc.vendor_bill_id === vendorBillId
                )
            )
        }
    })
}

export function useCreatePaymentVoucher() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            vendorId,
            bankAccountId,
            paymentDate,
            paymentMethod,
            amount,
            referenceNumber,
            notes,
            billAllocations
        }: {
            vendorId: string
            bankAccountId?: string
            paymentDate: string
            paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'
            amount: number
            referenceNumber?: string
            notes?: string
            billAllocations?: { bill_id: string, amount_allocated: number }[]
        }) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Generate voucher number
            const { data: lastVoucher } = await supabase
                .from('payment_vouchers')
                .select('voucher_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let voucherNumber = 'PV-0001'
            if (lastVoucher) {
                const lastNum = parseInt(lastVoucher.voucher_number.split('-')[1])
                voucherNumber = `PV-${String(lastNum + 1).padStart(4, '0')}`
            }

            // Create Payment Voucher
            const { data: voucher, error: voucherError } = await supabase
                .from('payment_vouchers')
                .insert({
                    voucher_number: voucherNumber,
                    vendor_id: vendorId,
                    bank_account_id: bankAccountId,
                    payment_date: paymentDate,
                    payment_method: paymentMethod,
                    amount,
                    reference_number: referenceNumber,
                    notes,
                    status: 'posted',
                    created_by: user.id
                })
                .select()
                .single()

            if (voucherError) throw voucherError

            // Create allocations if provided
            if (billAllocations && billAllocations.length > 0) {
                const allocations = billAllocations.map(alloc => ({
                    payment_voucher_id: voucher.id,
                    vendor_bill_id: alloc.bill_id,
                    allocated_amount: alloc.amount_allocated
                }))

                const { error: allocationsError } = await supabase
                    .from('payment_allocations')
                    .insert(allocations)

                if (allocationsError) throw allocationsError

                // Update vendor bills payment status
                for (const alloc of billAllocations) {
                    const { data: bill, error: billFetchError } = await supabase
                        .from('vendor_bills')
                        .select('total_amount, amount_due, amount_paid, due_date')
                        .eq('id', alloc.bill_id)
                        .single()

                    if (billFetchError) throw billFetchError

                    if (bill) {
                        const totalAmount = Number(bill.total_amount || 0)
                        const currentPaid = Number(bill.amount_paid || (totalAmount - Number(bill.amount_due || 0)) || 0)
                        const updatedPaid = currentPaid + Number(alloc.amount_allocated || 0)
                        const newAmountDue = Math.max(totalAmount - updatedPaid, 0)
                        let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue' = 'unpaid'

                        if (newAmountDue <= 0) {
                            paymentStatus = 'paid'
                        } else if (updatedPaid > 0) {
                            paymentStatus = 'partial'
                        }

                        if (paymentStatus !== 'paid' && bill.due_date) {
                            const due = new Date(bill.due_date)
                            const paidOn = new Date(paymentDate)
                            if (paidOn > due) paymentStatus = 'overdue'
                        }

                        const { error: billUpdateError } = await supabase
                            .from('vendor_bills')
                            .update({
                                amount_paid: updatedPaid,
                                payment_status: paymentStatus
                            })
                            .eq('id', alloc.bill_id)

                        if (billUpdateError) throw billUpdateError
                    }
                }
            }

            // Post to GL
            await supabase.rpc('post_payment_voucher', {
                p_voucher_id: voucher.id
            })

            // Update vendor balance (reduce payable)
            await supabase.rpc('update_vendor_balance', {
                p_vendor_id: vendorId,
                p_amount_change: -amount
            })

            return voucher
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payment-vouchers'] })
            queryClient.invalidateQueries({ queryKey: ['vendor-bills'] })
            queryClient.invalidateQueries({ queryKey: ['vendors'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
            toast.success('Payment voucher created and posted to GL')
        },
        onError: (error: any) => {
            toast.error('Failed to create payment voucher: ' + error.message)
        }
    })
}
