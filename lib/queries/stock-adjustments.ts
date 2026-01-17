import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { StockAdjustment, StockAdjustmentItem } from '@/lib/types/database'

const supabase = createClient()

// Get all stock adjustments
export function useStockAdjustments(status?: string) {
    return useQuery({
        queryKey: ['stock-adjustments', status],
        queryFn: async () => {
            let query = supabase
                .from('stock_adjustments')
                .select(`
          *,
          locations(id, code, name),
          stock_adjustment_items(
            *,
            products(id, sku, name)
          )
        `)
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query

            if (error) throw error
            return data
        },
    })
}

// Get single adjustment
export function useStockAdjustment(id: string) {
    return useQuery({
        queryKey: ['stock-adjustments', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_adjustments')
                .select(`
          *,
          locations(id, code, name),
          stock_adjustment_items(
            *,
            products(id, sku, name, cost_price)
          )
        `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id,
    })
}

// Create adjustment
export function useCreateAdjustment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (adjustment: {
            location_id: string
            adjustment_type: string
            adjustment_date: string
            reason: string
            items: {
                product_id: string
                system_quantity: number
                physical_quantity: number
                unit_cost: number
                notes?: string
            }[]
        }) => {
            // Generate adjustment number
            const adjustmentNumber = `ADJ-${Date.now()}`

            // Create adjustment
            const { data: adjustmentData, error: adjustmentError } = await supabase
                .from('stock_adjustments')
                .insert({
                    adjustment_number: adjustmentNumber,
                    location_id: adjustment.location_id,
                    adjustment_type: adjustment.adjustment_type,
                    adjustment_date: adjustment.adjustment_date,
                    reason: adjustment.reason,
                    status: 'DRAFT',
                })
                .select()
                .single()

            if (adjustmentError) throw adjustmentError

            // Create adjustment items
            const items = adjustment.items.map(item => ({
                adjustment_id: adjustmentData.id,
                product_id: item.product_id,
                system_quantity: item.system_quantity,
                physical_quantity: item.physical_quantity,
                unit_cost: item.unit_cost,
                notes: item.notes,
            }))

            const { error: itemsError } = await supabase
                .from('stock_adjustment_items')
                .insert(items)

            if (itemsError) throw itemsError

            return adjustmentData
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
        },
    })
}

// Approve adjustment (updates stock)
export function useApproveAdjustment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { data: adjustment, error: fetchError } = await supabase
                .from('stock_adjustments')
                .select('*, stock_adjustment_items(*)')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // Update adjustment status
            const { data: updatedAdjustment, error: updateError } = await supabase
                .from('stock_adjustments')
                .update({ status: 'APPROVED' })
                .eq('id', id)
                .neq('status', 'APPROVED') // Prevent double approval
                .select()
                .maybeSingle()

            if (updateError) throw updateError

            // If already approved, skip processing
            if (!updatedAdjustment) {
                console.log('⚠️ Adjustment already approved. Skipping inventory update.')
                return { id }
            }

            // Update stock for each item
            for (const item of adjustment.stock_adjustment_items) {
                const difference = item.physical_quantity - item.system_quantity

                // Create inventory transaction
                const transactionTypeCode = difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'
                const { data: txnType } = await supabase
                    .from('transaction_types')
                    .select('id')
                    .eq('code', transactionTypeCode)
                    .single()

                if (txnType) {
                    await supabase.from('inventory_transactions').insert({
                        transaction_type_id: txnType.id,
                        transaction_number: `${adjustment.adjustment_number}`,
                        product_id: item.product_id,
                        from_location_id: adjustment.location_id, // Added from_location_id just in case
                        quantity: Math.abs(difference),
                        unit_cost: item.unit_cost,
                        reference_type: 'ADJUSTMENT',
                        reference_id: adjustment.id,
                        reference_number: adjustment.adjustment_number,
                        notes: adjustment.reason,
                    })
                }
            }

            // === PHASE 3: POST COGS TO GL (Accounting Integration) ===
            try {
                // Get fiscal year
                const { data: fiscalYear } = await supabase
                    .from('fiscal_years')
                    .select('id')
                    .eq('is_closed', false)
                    .single()

                // Get accounts
                const { data: accounts } = await supabase
                    .from('chart_of_accounts')
                    .select('id, account_code')

                const inventoryAccount = accounts?.find(a => a.account_code === '1200') // Inventory
                const cogsAccount = accounts?.find(a => a.account_code === '5010') // COGS

                if (!inventoryAccount || !cogsAccount || !fiscalYear) {
                    throw new Error('Required accounts not found')
                }

                // Calculate total adjustment value
                const totalValue = adjustment.stock_adjustment_items.reduce((sum: number, item: any) => {
                    const difference = item.physical_quantity - item.system_quantity
                    return sum + (Math.abs(difference) * item.unit_cost)
                }, 0)

                if (totalValue > 0) {
                    // Create journal entry for COGS impact
                    const journalNumber = `JE-ADJ-${Date.now()}`
                    const isDecrease = adjustment.stock_adjustment_items[0].physical_quantity < adjustment.stock_adjustment_items[0].system_quantity

                    const { data: journalEntry } = await supabase
                        .from('journal_entries')
                        .insert({
                            journal_number: journalNumber,
                            journal_type: 'AUTO',
                            journal_date: adjustment.adjustment_date,
                            fiscal_year_id: fiscalYear.id,
                            narration: `Stock Adjustment - ${adjustment.adjustment_type}: ${adjustment.reason}`,
                            total_debit: totalValue,
                            total_credit: totalValue,
                            status: 'posted',
                            posted_at: new Date().toISOString()
                        })
                        .select()
                        .single()

                    if (journalEntry) {
                        // Create journal lines based on adjustment type
                        const lines = isDecrease ? [
                            // Decrease: Debit COGS, Credit Inventory
                            {
                                journal_entry_id: journalEntry.id,
                                account_id: cogsAccount.id,
                                debit_amount: totalValue,
                                credit_amount: 0,
                                description: `${adjustment.adjustment_type} - Stock decrease`
                            },
                            {
                                journal_entry_id: journalEntry.id,
                                account_id: inventoryAccount.id,
                                debit_amount: 0,
                                credit_amount: totalValue,
                                description: `${adjustment.adjustment_type} - Stock decrease`
                            }
                        ] : [
                            // Increase: Debit Inventory, Credit COGS
                            {
                                journal_entry_id: journalEntry.id,
                                account_id: inventoryAccount.id,
                                debit_amount: totalValue,
                                credit_amount: 0,
                                description: `${adjustment.adjustment_type} - Stock increase`
                            },
                            {
                                journal_entry_id: journalEntry.id,
                                account_id: cogsAccount.id,
                                debit_amount: 0,
                                credit_amount: totalValue,
                                description: `${adjustment.adjustment_type} - Stock increase`
                            }
                        ]

                        await supabase.from('journal_entry_lines').insert(lines)
                        console.log(`✅ Stock adjustment posted to GL: ${journalNumber}`)
                    }
                }
            } catch (glError) {
                console.warn('GL posting failed (non-critical):', glError)
                // Don't fail adjustment if GL posting fails
            }

            return { id }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
        },
    })
}

// Submit adjustment for approval
export function useSubmitAdjustment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('stock_adjustments')
                .update({ status: 'PENDING_APPROVAL' })
                .eq('id', id)
                .eq('status', 'DRAFT') // Only allow submitting drafts

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
        },
    })
}

// Delete adjustment (only if DRAFT)
export function useDeleteAdjustment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { data: adjustment } = await supabase
                .from('stock_adjustments')
                .select('status')
                .eq('id', id)
                .single()

            if (adjustment?.status !== 'DRAFT') {
                throw new Error('Can only delete draft adjustments')
            }

            const { error } = await supabase
                .from('stock_adjustments')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
        },
    })
}
