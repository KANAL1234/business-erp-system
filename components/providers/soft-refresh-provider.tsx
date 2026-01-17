'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

type SoftRefreshProviderProps = {
    children: ReactNode
}

export function SoftRefreshProvider({ children }: SoftRefreshProviderProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const handleSoftRefresh = () => {
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current)
            }

            refreshTimeout.current = setTimeout(() => {
                queryClient.invalidateQueries()
                router.refresh()
            }, 150)
        }

        window.addEventListener('soft-refresh', handleSoftRefresh)
        return () => {
            if (refreshTimeout.current) {
                clearTimeout(refreshTimeout.current)
            }
            window.removeEventListener('soft-refresh', handleSoftRefresh)
        }
    }, [router])

    return children
}
