import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CompanySettings } from '@/lib/types/database'
import { toast } from 'sonner'

export function useCompanySettings() {
    return useQuery({
        queryKey: ['company-settings'],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .single()

            if (error) throw error
            return data as CompanySettings
        }
    })
}

export function useUpdateCompanySettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (settings: Partial<CompanySettings>) => {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('company_settings')
                .update(settings)
                .eq('id', (await supabase.from('company_settings').select('id').single()).data?.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-settings'] })
            toast.success('Company settings updated successfully')
        },
        onError: (error: any) => {
            toast.error('Failed to update company settings: ' + error.message)
        }
    })
}
