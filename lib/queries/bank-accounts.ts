import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { BankAccount } from '@/lib/types/database'
import { toast } from 'sonner'

export function useBankAccounts() {
    return useQuery({
        queryKey: ['bank-accounts'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('bank_accounts')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as BankAccount[]
        }
    })
}

export function useCreateBankAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (account: Partial<BankAccount>) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('bank_accounts')
                .insert(account)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
            toast.success('Bank account added successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to add bank account: ' + error.message)
        }
    })
}

export function useUpdateBankAccount() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<BankAccount> }) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('bank_accounts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
            toast.success('Bank account updated successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to update bank account: ' + error.message)
        }
    })
}
