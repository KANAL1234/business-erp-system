'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Truck, Check, ChevronRight, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SelectVehiclePage() {
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        async function fetchVehicles() {
            try {
                // Fetch locations that are defined as vehicles (have vehicle_number)
                const { data, error } = await supabase
                    .from('locations')
                    .select('*')
                    .not('vehicle_number', 'is', null)
                    .eq('is_active', true)
                    .order('name')

                if (error) throw error
                if (data) setVehicles(data)
            } catch (err) {
                console.error('Error fetching vehicles:', err)
                toast.error('Failed to load vehicles')
            } finally {
                setLoading(false)
            }
        }
        fetchVehicles()
    }, [])

    const handleConfirm = () => {
        if (!selectedId) return

        const vehicle = vehicles.find(v => v.id === selectedId)

        // Save to cookie (valid for 1 year)
        document.cookie = `driver_vehicle_id=${selectedId}; path=/; max-age=31536000; SameSite=Lax`
        // Also save name for display if needed
        localStorage.setItem('driver_vehicle_name', vehicle?.name || '')
        localStorage.setItem('driver_vehicle_number', vehicle?.vehicle_number || '')

        toast.success(`Vehicle selected: ${vehicle?.vehicle_number}`)
        router.push('/mobile')
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-md mx-auto space-y-6 pt-10">
                <div className="text-center space-y-2">
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Select Vehicle</h1>
                    <p className="text-gray-500">Which vehicle are you driving today?</p>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-white rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {vehicles.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-white rounded-lg">
                                No vehicles found assigned to you.
                            </div>
                        ) : (
                            vehicles.map((vehicle) => (
                                <div
                                    key={vehicle.id}
                                    onClick={() => setSelectedId(vehicle.id)}
                                    className={cn(
                                        "relative group cursor-pointer transition-all duration-200",
                                        "bg-white border rounded-xl p-4 shadow-sm hover:shadow-md",
                                        selectedId === vehicle.id
                                            ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                                            : "border-gray-200 hover:border-primary/20"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                selectedId === vehicle.id ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                                            )}>
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                                                <p className="text-sm text-gray-500">{vehicle.vehicle_number}</p>
                                            </div>
                                        </div>
                                        {selectedId === vehicle.id && (
                                            <div className="bg-primary/50 text-white p-1 rounded-full animate-in zoom-in duration-200">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className="pt-4 space-y-3">
                    <Button
                        className="w-full text-lg h-12"
                        size="lg"
                        disabled={!selectedId || loading}
                        onClick={handleConfirm}
                    >
                        Continue
                        <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full text-gray-500"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log Out
                    </Button>
                </div>
            </div>
        </div>
    )
}
