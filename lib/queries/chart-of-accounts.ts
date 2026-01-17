import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ChartOfAccounts } from '@/lib/types/database'
import { toast } from 'sonner'

export function useChartOfAccounts() {
    return useQuery({
        queryKey: ['chart-of-accounts'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .select('*')
                .order('account_code')

            if (error) throw error
            return data as ChartOfAccounts[]
        }
    })
}

export function useChartOfAccountsByType(accountType: string) {
    return useQuery({
        queryKey: ['chart-of-accounts', accountType],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .select('*')
                .eq('account_type', accountType)
                .eq('is_active', true)
                .order('account_code')

            if (error) throw error
            return data as ChartOfAccounts[]
        },
        enabled: !!accountType
    })
}

export function useCreateAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (account: Partial<ChartOfAccounts>) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .insert(account)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            toast.success('Account created successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to create account: ' + error.message)
        }
    })
}

export function useRecalculateAccountBalances() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const supabase = createClient()
            const { error } = await supabase.rpc('update_account_balances')
            if (error) throw error
            return true
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            toast.success('Account balances refreshed')
        },
        onError: (error: any) => {
            toast.error('Failed to refresh balances: ' + error.message)
        }
    })
}

export function useUpdateAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<ChartOfAccounts> }) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            toast.success('Account updated successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to update account: ' + error.message)
        }
    })
}

export function useDeactivateAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('chart_of_accounts')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] })
            toast.success('Account deactivated')
        },
        onError: (error: any) => {
            toast.error('Failed to deactivate account: ' + error.message)
        }
    })
}
