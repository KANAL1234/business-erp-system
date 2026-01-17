'use client'

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/components/providers/auth-provider'
import { LocationProvider } from '@/components/providers/location-provider'
import { SoftRefreshProvider } from '@/components/providers/soft-refresh-provider'
import { emitSoftRefresh } from '@/lib/soft-refresh'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
                gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
                refetchOnWindowFocus: false, // Don't refetch when tab regains focus
                retry: 1, // Only retry once on failure
            },
        },
        mutationCache: new MutationCache({
            onSuccess: () => {
                emitSoftRefresh()
            },
        }),
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <LocationProvider>
                    <SoftRefreshProvider>
                        {children}
                    </SoftRefreshProvider>
                </LocationProvider>
            </AuthProvider>
        </QueryClientProvider>
    )
}
