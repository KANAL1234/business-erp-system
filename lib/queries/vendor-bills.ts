import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { VendorBill } from '@/lib/types/database'
import { toast } from 'sonner'

export function useVendorBills() {
    return useQuery({
        queryKey: ['vendor-bills'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('vendor_bills')
                .select(`
                    *,
                    vendors (id, name, vendor_code),
                    goods_receipts (id, grn_number)
                `)
                .order('bill_date', { ascending: false })

            if (error) throw error
            return data
        }
    })
}

export function useCreateVendorBill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (bill: Partial<VendorBill>) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Generate bill number
            const { data: lastBill } = await supabase
                .from('vendor_bills')
                .select('bill_number')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            let nextNumber = 'VB-0001'
            if (lastBill) {
                const lastNum = parseInt(lastBill.bill_number.split('-')[1])
                nextNumber = `VB-${String(lastNum + 1).padStart(4, '0')}`
            }

            const { data, error } = await supabase
                .from('vendor_bills')
                .insert({
                    ...bill,
                    bill_number: nextNumber,
                    created_by: user.id
                })
                .select()
                .single()

            if (error) throw error

            // Auto-post to GL if approved
            if (bill.status === 'approved') {
                await supabase.rpc('post_vendor_bill', { p_bill_id: data.id })
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-bills'] })
            toast.success('Vendor bill created successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to create vendor bill: ' + error.message)
        }
    })
}

export function useVendorBill(id: string) {
    return useQuery({
        queryKey: ['vendor-bill', id],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('vendor_bills')
                .select(`
                    *,
                    vendors (id, name, vendor_code),
                    goods_receipts (
                        id,
                        grn_number,
                        po_id,
                        purchase_orders (id, po_number)
                    ),
                    vendor_bill_items (
                        id,
                        description,
                        quantity,
                        unit_price,
                        line_total,
                        products (id, sku, name)
                    )
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id
    })
}

export function useApproveVendorBill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get bill details for GL posting
            const { data: bill, error: fetchError } = await supabase
                .from('vendor_bills')
                .select('*')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            const { data, error } = await supabase
                .from('vendor_bills')
                .update({
                    status: 'posted',
                    approved_by: user.id
                })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            // Create Journal Entry for Vendor Bill
            try {
                // Get required GL accounts
                const { data: accounts } = await supabase
                    .from('chart_of_accounts')
                    .select('id, account_code')
                    .in('account_code', ['5010', '1420', '2010', '2110'])
                    .eq('is_active', true)

                const purchasesAccount = accounts?.find(a => a.account_code === '5010')
                const inputTaxAccount = accounts?.find(a => a.account_code === '1420')
                const apAccount = accounts?.find(a => a.account_code === '2010')
                const whtAccount = accounts?.find(a => a.account_code === '2110')

                if (!purchasesAccount || !apAccount) {
                    console.warn('Required GL accounts not found')
                    return data
                }

                // Get fiscal year
                const { data: fiscalYear } = await supabase
                    .from('fiscal_years')
                    .select('id')
                    .eq('is_closed', false)
                    .limit(1)
                    .single()

                const journalNumber = `JE-VB-${bill.bill_number}`

                // Check if already posted
                const { data: existingJE } = await supabase
                    .from('journal_entries')
                    .select('id')
                    .eq('journal_number', journalNumber)
                    .single()

                if (existingJE) return data

                const totalAmount = Number(bill.total_amount) || 0
                const subtotal = Number(bill.subtotal) || 0
                const taxAmount = Number(bill.tax_amount) || 0
                const whtAmount = Number(bill.wht_amount) || 0

                // Create journal entry
                const { data: journalEntry, error: jeError } = await supabase
                    .from('journal_entries')
                    .insert({
                        journal_number: journalNumber,
                        journal_type: 'AUTO',
                        journal_date: bill.bill_date,
                        fiscal_year_id: fiscalYear?.id,
                        reference_type: 'VENDOR_BILL',
                        reference_id: bill.id,
                        reference_number: bill.bill_number,
                        narration: `Vendor Bill - ${bill.bill_number}`,
                        total_debit: totalAmount,
                        total_credit: totalAmount,
                        status: 'posted',
                        posted_at: new Date().toISOString(),
                        posted_by: user.id
                    })
                    .select()
                    .single()

                if (jeError) throw jeError

                const lines = []

                // Debit: Purchases
                lines.push({
                    journal_entry_id: journalEntry.id,
                    account_id: purchasesAccount.id,
                    debit_amount: subtotal,
                    credit_amount: 0,
                    description: `Purchases - ${bill.bill_number}`
                })

                // Debit: Input Tax (if applicable)
                if (taxAmount > 0 && inputTaxAccount) {
                    lines.push({
                        journal_entry_id: journalEntry.id,
                        account_id: inputTaxAccount.id,
                        debit_amount: taxAmount,
                        credit_amount: 0,
                        description: `Input Tax - ${bill.bill_number}`
                    })
                }

                // Credit: Accounts Payable (net of WHT)
                lines.push({
                    journal_entry_id: journalEntry.id,
                    account_id: apAccount.id,
                    debit_amount: 0,
                    credit_amount: totalAmount - whtAmount,
                    description: `Accounts Payable - ${bill.bill_number}`
                })

                // Credit: WHT Payable (if applicable)
                if (whtAmount > 0 && whtAccount) {
                    lines.push({
                        journal_entry_id: journalEntry.id,
                        account_id: whtAccount.id,
                        debit_amount: 0,
                        credit_amount: whtAmount,
                        description: `WHT Payable - ${bill.bill_number}`
                    })
                }

                await supabase.from('journal_entry_lines').insert(lines)

                // Update bill with journal entry ID
                await supabase
                    .from('vendor_bills')
                    .update({ journal_entry_id: journalEntry.id })
                    .eq('id', id)

            } catch (glError) {
                console.warn('GL posting failed:', glError)
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-bills'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            toast.success('Vendor bill approved and posted to GL')
        },
        onError: (error: any) => {
            toast.error('Failed to approve vendor bill: ' + error.message)
        }
    })
}

export function useDeleteVendorBill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient()

            // Verify bill is draft
            const { data: bill, error: fetchError } = await supabase
                .from('vendor_bills')
                .select('status')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError
            if (bill.status !== 'draft') {
                throw new Error('Only draft bills can be deleted')
            }

            const { error } = await supabase
                .from('vendor_bills')
                .delete()
                .eq('id', id)

            if (error) throw error
            return { id }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-bills'] })
            toast.success('Vendor bill deleted')
        },
        onError: (error: any) => {
            toast.error('Failed to delete: ' + error.message)
        }
    })
}

export function useCancelVendorBill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get bill with journal entry
            const { data: bill, error: fetchError } = await supabase
                .from('vendor_bills')
                .select('*, journal_entry_id')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // Update bill status
            const { data, error } = await supabase
                .from('vendor_bills')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            // Create reversing journal entry if original was posted
            if (bill.journal_entry_id) {
                try {
                    const { data: originalJE } = await supabase
                        .from('journal_entries')
                        .select(`*, journal_entry_lines(*)`)
                        .eq('id', bill.journal_entry_id)
                        .single()

                    if (originalJE) {
                        const { data: fiscalYear } = await supabase
                            .from('fiscal_years')
                            .select('id')
                            .eq('is_closed', false)
                            .limit(1)
                            .single()

                        const reversalNumber = `JE-VB-REV-${bill.bill_number}`

                        // Create reversal entry
                        const { data: reversalJE, error: revError } = await supabase
                            .from('journal_entries')
                            .insert({
                                journal_number: reversalNumber,
                                journal_type: 'REVERSAL',
                                journal_date: new Date().toISOString().split('T')[0],
                                fiscal_year_id: fiscalYear?.id,
                                reference_type: 'VENDOR_BILL_REVERSAL',
                                reference_id: id,
                                reference_number: bill.bill_number,
                                narration: `Reversal of Vendor Bill - ${bill.bill_number}`,
                                total_debit: originalJE.total_credit,
                                total_credit: originalJE.total_debit,
                                status: 'posted',
                                posted_at: new Date().toISOString(),
                                posted_by: user.id
                            })
                            .select()
                            .single()

                        if (!revError && reversalJE) {
                            // Reverse the lines
                            const reversedLines = originalJE.journal_entry_lines.map((line: any) => ({
                                journal_entry_id: reversalJE.id,
                                account_id: line.account_id,
                                debit_amount: line.credit_amount,
                                credit_amount: line.debit_amount,
                                description: `Reversal: ${line.description}`
                            }))

                            await supabase.from('journal_entry_lines').insert(reversedLines)
                        }
                    }
                } catch (revError) {
                    console.warn('Reversal entry creation failed:', revError)
                }
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor-bills'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            toast.success('Vendor bill cancelled')
        },
        onError: (error: any) => {
            toast.error('Failed to cancel: ' + error.message)
        }
    })
}
