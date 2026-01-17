'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Fuel, AlertTriangle, Navigation } from 'lucide-react'
import { addToQueue } from '@/lib/offline/queue'
import { useOnlineStatus } from '@/lib/offline/sync'
import { useAuth } from '@/components/providers/auth-provider'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export default function FuelPage() {
    const supabase = createClient()
    const isOnline = useOnlineStatus()
    const { user } = useAuth()
    const [formData, setFormData] = useState({
        fuel_date: new Date().toISOString().split('T')[0],
        quantity_liters: '',
        price_per_liter: '',
        odometer_reading: '',
        fuel_station: '',
        receipt_number: ''
    })

    // 1. Check for active trip (Online check)
    const { data: activeTrip, isLoading: tripLoading } = useQuery({
        queryKey: ['active-trip-fuel', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const { data: driver } = await supabase
                .from('fleet_drivers')
                .select('id')
                .eq('employee_id', user.id)
                .maybeSingle()

            if (!driver) return null

            const { data: trip } = await supabase
                .from('fleet_trips')
                .select('id, status')
                .eq('driver_id', driver.id)
                .eq('status', 'IN_PROGRESS')
                .maybeSingle()
            return trip
        },
        enabled: !!user?.id && isOnline
    })

    // 2. Local check (Offline check)
    const [localTripActive, setLocalTripActive] = useState(false)
    useEffect(() => {
        const savedTripId = localStorage.getItem('current_trip_id')
        setLocalTripActive(!!savedTripId)
    }, [])

    const hasActiveTrip = activeTrip || localTripActive

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const match = document.cookie.match(/driver_vehicle_id=([^;]+)/)
        const vehicleId = match ? match[1] : null

        if (!vehicleId || !user?.id) {
            toast.error('Vehicle or Driver not identified')
            return
        }

        const fuelData = {
            p_vehicle_id: vehicleId,
            p_driver_id: user.id,
            p_trip_id: typeof window !== 'undefined' ? localStorage.getItem('current_trip_id') : null,
            p_fuel_date: formData.fuel_date,
            p_fuel_type: 'PETROL',
            p_quantity_liters: parseFloat(formData.quantity_liters),
            p_price_per_liter: parseFloat(formData.price_per_liter),
            p_odometer_reading: parseFloat(formData.odometer_reading),
            p_fuel_station: formData.fuel_station,
            p_receipt_number: formData.receipt_number
        }

        await addToQueue('CREATE_FUEL_LOG', fuelData)

        toast.success(
            isOnline
                ? 'Fuel entry saved!'
                : 'Fuel entry saved offline. Will sync when online.'
        )

        // Reset form
        setFormData({
            fuel_date: new Date().toISOString().split('T')[0],
            quantity_liters: '',
            price_per_liter: '',
            odometer_reading: '',
            fuel_station: '',
            receipt_number: ''
        })
    }

    if (tripLoading && isOnline) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="text-slate-500 text-sm mt-3">Validating trip status...</p>
            </div>
        )
    }

    if (!hasActiveTrip) {
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-12 h-12 text-orange-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">
                        No Active Trip
                    </h1>
                    <p className="text-slate-500 text-center mb-8 max-w-xs">
                        Fuel logs must be linked to an active trip. Please start your trip before recording fuel expenses.
                    </p>
                    <Link href="/mobile/trip">
                        <Button size="lg" className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200">
                            <Navigation className="w-5 h-5 mr-2" />
                            Start Trip Now
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 bg-slate-50 min-h-screen">
            <Card className="p-6 border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-100">
                        <Fuel className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Log Fuel Purchase</h1>
                        <p className="text-xs text-slate-500">Record fuel for your current trip</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="text-slate-700 font-bold text-xs uppercase">Date</Label>
                        <Input
                            type="date"
                            value={formData.fuel_date}
                            onChange={(e) => setFormData({ ...formData, fuel_date: e.target.value })}
                            required
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-700 font-bold text-xs uppercase">Liters</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.quantity_liters}
                                onChange={(e) => setFormData({ ...formData, quantity_liters: e.target.value })}
                                placeholder="25.50"
                                required
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div>
                            <Label className="text-slate-700 font-bold text-xs uppercase">Price/Liter</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.price_per_liter}
                                onChange={(e) => setFormData({ ...formData, price_per_liter: e.target.value })}
                                placeholder="290.00"
                                required
                                className="bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-700 font-bold text-xs uppercase">Odometer Reading (km)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.odometer_reading}
                            onChange={(e) => setFormData({ ...formData, odometer_reading: e.target.value })}
                            placeholder="15500"
                            required
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-700 font-bold text-xs uppercase">Fuel Station</Label>
                        <Input
                            value={formData.fuel_station}
                            onChange={(e) => setFormData({ ...formData, fuel_station: e.target.value })}
                            placeholder="PSO Rawalpindi"
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-700 font-bold text-xs uppercase">Receipt Number</Label>
                        <Input
                            value={formData.receipt_number}
                            onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                            placeholder="PSO-12345"
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    {/* Total */}
                    {formData.quantity_liters && formData.price_per_liter && (
                        <Card className="p-4 bg-orange-50 border-orange-100">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-orange-900 text-sm">Total Cost:</span>
                                <span className="text-2xl font-black text-orange-600">
                                    Rs. {(parseFloat(formData.quantity_liters) * parseFloat(formData.price_per_liter)).toLocaleString()}
                                </span>
                            </div>
                        </Card>
                    )}

                    <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl mt-4" size="lg">
                        Save Fuel Entry
                    </Button>
                </form>
            </Card>
        </div>
    )
}
