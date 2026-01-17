'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import dynamic from 'next/dynamic'
import { MapPin, Navigation } from "lucide-react"

// Dynamically import the map to avoid SSR issues
const LiveFleetMap = dynamic(() => import("@/components/fleet/live-map"), {
    ssr: false,
    loading: () => <div className="h-[600px] w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Loading Fleet Map...</div>
})

export default function FleetMapPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fleet Live Tracking</h1>
                    <p className="text-muted-foreground">Monitor your active fleet and distribution network in real-time.</p>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Navigation className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Global Fleet Map</CardTitle>
                            <CardDescription>Visualizing all vehicles currently in progress</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="h-[700px] w-full">
                        <LiveFleetMap />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Auto-Updating</div>
                        <p className="text-xs text-muted-foreground">Polled every 30 seconds</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Map Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">OpenStreetMap</div>
                        <p className="text-xs text-muted-foreground">Standardized GIS data</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Tracking Precision</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">High Accuracy</div>
                        <p className="text-xs text-muted-foreground">GPS + Speed + Bearing</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
