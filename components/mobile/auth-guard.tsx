'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export function MobileAuthGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useEffect(() => {
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace('/login')
                return
            }

            // If on select-vehicle, just show it (we let that page handle its own logic)
            if (pathname === '/mobile/select-vehicle') {
                setLoading(false)
                return
            }

            // Verify vehicle selection
            // Check cookie
            const match = document.cookie.match(/driver_vehicle_id=([^;]+)/)
            if (!match) {
                // Double check localStorage as backup
                const local = localStorage.getItem('driver_vehicle_id') // Not implemented in select-page but standard backup
                if (!local) {
                    router.replace('/mobile/select-vehicle')
                    return
                } else {
                    // Restore cookie?
                    document.cookie = `driver_vehicle_id=${local}; path=/; max-age=31536000; SameSite=Lax`
                }
            }

            setLoading(false)
        }
        check()
    }, [pathname, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    return <>{children}</>
}
