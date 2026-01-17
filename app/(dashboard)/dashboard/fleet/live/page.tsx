'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const LiveFleetMap = dynamic(() => import('@/components/fleet/live-map'), {
    ssr: false,
    loading: () => <Skeleton className="h-[600px] w-full rounded-lg" />
})

export default function FleetLivePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Live Fleet Tracking</h2>
                <p className="text-muted-foreground">Real-time view of all active vehicles.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Trips Map</CardTitle>
                </CardHeader>
                <CardContent className="p-0 border-t">
                    <LiveFleetMap />
                </CardContent>
            </Card>
        </div>
    )
}
