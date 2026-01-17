import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
    FleetCashDeposit,
    FleetFuelAllowance,
    FleetExpenseVariance,
    FleetVarianceDashboard
} from '@/types/fleet'
import { toast } from 'sonner'

const supabase = createClient()

// ============================================================================
// CASH DEPOSITS
// ============================================================================

export function useCashDeposits(tripId?: string) {
    return useQuery({
        queryKey: ['fleet-cash-deposits', tripId],
        queryFn: async () => {
            let query = supabase
                .from('fleet_cash_deposits')
                .select(`
                    *,
                    trip:fleet_trips(*),
                    driver:fleet_drivers(*, employee:employees(full_name, employee_code)),
                    vehicle:fleet_vehicles(*),
                    bank_account:bank_accounts(account_name, account_number)
                `)
                .order('deposit_date', { ascending: false })

            if (tripId) {
                query = query.eq('trip_id', tripId)
            }

            const { data, error } = await query

            if (error) throw error
            return data as FleetCashDeposit[]
        },
    })
}

export function useCreateCashDeposit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (deposit: Partial<FleetCashDeposit>) => {
            const { data, error } = await supabase
                .from('fleet_cash_deposits')
                .insert([deposit])
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-cash-deposits'] })
            toast.success('Cash deposit recorded successfully')
        },
        onError: (error: Error) => {
            toast.error('Failed to record cash deposit', {
                description: error.message,
            })
        },
    })
}

export function useApproveCashDeposit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ depositId, userId }: { depositId: string; userId: string }) => {
            const { data, error } = await supabase.rpc('process_fleet_cash_deposit', {
                p_deposit_id: depositId,
                p_approved_by: userId,
            })

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-cash-deposits'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            toast.success('Cash deposit approved and posted to GL')
        },
        onError: (error: Error) => {
            toast.error('Failed to approve deposit', {
                description: error.message,
            })
        },
    })
}

export function useRejectCashDeposit() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ depositId, userId, notes }: { depositId: string; userId: string; notes?: string }) => {
            const { data, error } = await supabase
                .from('fleet_cash_deposits')
                .update({
                    status: 'REJECTED',
                    approved_by: userId,
                    approved_at: new Date().toISOString(),
                    notes: notes || null,
                })
                .eq('id', depositId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-cash-deposits'] })
            toast.success('Cash deposit rejected')
        },
        onError: (error: Error) => {
            toast.error('Failed to reject deposit', {
                description: error.message,
            })
        },
    })
}

// ============================================================================
// FUEL ALLOWANCES
// ============================================================================

export function useFuelAllowances(tripId?: string) {
    return useQuery({
        queryKey: ['fleet-fuel-allowances', tripId],
        queryFn: async () => {
            let query = supabase
                .from('fleet_fuel_allowances')
                .select(`
                    *,
                    trip:fleet_trips(*),
                    driver:fleet_drivers(*, employee:employees(full_name, employee_code)),
                    vehicle:fleet_vehicles(*)
                `)
                .order('allowance_date', { ascending: false })

            if (tripId) {
                query = query.eq('trip_id', tripId)
            }

            const { data, error } = await query

            if (error) throw error
            return data as FleetFuelAllowance[]
        },
    })
}

export function useCreateFuelAllowance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (allowance: Partial<FleetFuelAllowance>) => {
            const { data, error } = await supabase
                .from('fleet_fuel_allowances')
                .insert([allowance])
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-fuel-allowances'] })
            toast.success('Fuel allowance created successfully')
        },
        onError: (error: Error) => {
            toast.error('Failed to create fuel allowance', {
                description: error.message,
            })
        },
    })
}

export function useUpdateFuelAllowance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<FleetFuelAllowance> & { id: string }) => {
            const { data, error } = await supabase
                .from('fleet_fuel_allowances')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-fuel-allowances'] })
            toast.success('Fuel allowance updated')
        },
        onError: (error: Error) => {
            toast.error('Failed to update fuel allowance', {
                description: error.message,
            })
        },
    })
}

export function useIssueFuelAllowance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (allowanceId: string) => {
            const { data, error } = await supabase.rpc('issue_fuel_allowance', {
                p_allowance_id: allowanceId,
            })

            if (error) throw error
            if (!data?.success) throw new Error(data?.message || 'Failed to issue allowance')
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['fleet-fuel-allowances'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            toast.success(`Cash issued - ${data.journal_number}`, {
                description: `PKR ${data.amount?.toLocaleString()} given to driver`,
            })
        },
        onError: (error: Error) => {
            toast.error('Failed to issue fuel allowance', {
                description: error.message,
            })
        },
    })
}

export function useReturnFuelAllowanceCash() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ allowanceId, returnAmount }: { allowanceId: string; returnAmount: number }) => {
            const { data, error } = await supabase.rpc('return_fuel_allowance_cash', {
                p_allowance_id: allowanceId,
                p_return_amount: returnAmount,
            })

            if (error) throw error
            if (!data?.success) throw new Error(data?.message || 'Failed to record cash return')
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['fleet-fuel-allowances'] })
            queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
            toast.success(`Cash returned - ${data.journal_number}`, {
                description: `PKR ${data.amount?.toLocaleString()} received from driver`,
            })
        },
        onError: (error: Error) => {
            toast.error('Failed to record cash return', {
                description: error.message,
            })
        },
    })
}

// ============================================================================
// EXPENSE VARIANCES
// ============================================================================

export function useExpenseVariances(filters?: {
    tripId?: string
    status?: string
    alertsOnly?: boolean
}) {
    return useQuery({
        queryKey: ['fleet-expense-variances', filters],
        queryFn: async () => {
            let query = supabase
                .from('fleet_expense_variances')
                .select(`
                    *,
                    trip:fleet_trips(
                        *,
                        vehicle:fleet_vehicles(*),
                        driver:fleet_drivers(*, employee:employees(full_name))
                    )
                `)
                .order('variance_date', { ascending: false })

            if (filters?.tripId) {
                query = query.eq('trip_id', filters.tripId)
            }

            if (filters?.status) {
                query = query.eq('status', filters.status)
            }

            if (filters?.alertsOnly) {
                query = query.eq('is_alert_triggered', true)
            }

            const { data, error } = await query

            if (error) throw error
            return data as FleetExpenseVariance[]
        },
    })
}

export function useResolveVariance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            varianceId,
            userId,
            notes
        }: {
            varianceId: string
            userId: string
            notes: string
        }) => {
            const { data, error } = await supabase
                .from('fleet_expense_variances')
                .update({
                    status: 'RESOLVED',
                    resolved_by: userId,
                    resolved_at: new Date().toISOString(),
                    resolution_notes: notes,
                })
                .eq('id', varianceId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-expense-variances'] })
            toast.success('Variance resolved')
        },
        onError: (error: Error) => {
            toast.error('Failed to resolve variance', {
                description: error.message,
            })
        },
    })
}

export function useEscalateVariance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ varianceId, notes }: { varianceId: string; notes?: string }) => {
            const { data, error } = await supabase
                .from('fleet_expense_variances')
                .update({
                    status: 'ESCALATED',
                    resolution_notes: notes || null,
                })
                .eq('id', varianceId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fleet-expense-variances'] })
            toast.success('Variance escalated to management')
        },
        onError: (error: Error) => {
            toast.error('Failed to escalate variance', {
                description: error.message,
            })
        },
    })
}

// ============================================================================
// VARIANCE DASHBOARD
// ============================================================================

export function useVarianceDashboard(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['fleet-variance-dashboard', startDate, endDate],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_fleet_variance_dashboard', {
                p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                p_end_date: endDate || new Date().toISOString().split('T')[0],
            })

            if (error) throw error
            return data[0] as FleetVarianceDashboard
        },
    })
}
