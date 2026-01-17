'use client'

import { Card } from '@/components/ui/card'
import { ShoppingCart, Package, Fuel, MapPin, Navigation } from 'lucide-react'
import Link from 'next/link'
import { useAutoSync } from '@/lib/offline/sync'
import { useLocationTracker } from '@/lib/hooks/use-location-tracker'

export default function MobileHomePage() {
    const { stats } = useAutoSync()
    const { isTracking } = useLocationTracker()

    const quickActions = [
        {
            label: isTracking ? 'Trip in Progress' : 'Start Trip',
            href: '/mobile/trip',
            icon: isTracking ? Navigation : MapPin,
            color: isTracking ? 'bg-green-600 animate-pulse' : 'bg-primary'
        },
        { label: 'New Sale', href: '/mobile/pos', icon: ShoppingCart, color: 'bg-primary/50' },
        { label: 'View Stock', href: '/mobile/inventory', icon: Package, color: 'bg-green-500' },
        { label: 'Log Fuel', href: '/mobile/fuel', icon: Fuel, color: 'bg-orange-500' },
    ]

    return (
        <div className="p-4 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Welcome Back</h1>
                <p className="text-gray-600">Ready to start your day?</p>
            </div>

            {stats.total > 0 && (
                <Card className="p-4 bg-orange-50 border-orange-200">
                    <p className="text-sm font-medium text-orange-900">
                        {stats.total} items waiting to sync
                    </p>
                </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                        <Link key={action.href} href={action.href}>
                            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                                <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <p className="font-medium">{action.label}</p>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            <Card className="p-4">
                <h2 className="font-semibold mb-3">Today's Activity</h2>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Sales</span>
                        <span className="font-medium">PKR 0</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Customers</span>
                        <span className="font-medium">0</span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
