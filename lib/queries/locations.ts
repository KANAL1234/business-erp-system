import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export function useAllowedLocations() {
    return useQuery({
        queryKey: ['allowed-locations'],
        queryFn: async () => {
            // First, get the current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            // Check if user is admin
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select(`
          roles (
            role_name
          )
        `)
                .eq('user_id', user.id)
                .eq('roles.role_name', 'admin')
                .single()

            const isAdmin = userRoles?.roles && Array.isArray(userRoles.roles) ? false : (userRoles?.roles as any)?.role_name === 'admin'

            if (isAdmin) {
                // If admin, fetch all active locations
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('is_active', true)
                    .order('name')

                if (error) throw error
                return data
            } else {
                // If not admin, fetch only allowed locations
                const { data, error } = await supabase
                    .from('user_allowed_locations')
                    .select(`
                locations (*)
            `)
                    .eq('user_id', user.id)

                if (error) throw error

                // Flatten the structure to return just the locations
                return data.map((item: any) => item.locations).filter((loc: any) => loc && loc.is_active).sort((a: any, b: any) => a.name.localeCompare(b.name))
            }
        }
    })
}

// Alias for backward compatibility
export const useLocations = useAllowedLocations
