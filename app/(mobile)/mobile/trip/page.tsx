'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    MapPin, Navigation, StopCircle, CheckCircle, XCircle,
    Fuel, Banknote, ArrowDownLeft, Clock, Truck
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { addToQueue } from '@/lib/offline/queue'

export default function TripPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { user } = useAuth()
    const router = useRouter()
    const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const [vehicleId, setVehicleId] = useState('')
    const [odometer, setOdometer] = useState('')
    const [fuelBudget, setFuelBudget] = useState('')
    const [isEnding, setIsEnding] = useState(false)
    const [endOdometer, setEndOdometer] = useState('')
    const [returnAmount, setReturnAmount] = useState('')

    // Get driver's active trip status
    const { data: tripStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['driver-active-trip', user?.id],
        queryFn: async () => {
            if (!user?.id) return null
            const { data, error } = await supabase.rpc('get_driver_active_trip', {
                p_employee_id: user.id
            })
            if (error) throw error
            return data
        },
        enabled: !!user?.id,
        refetchInterval: 30000, // Refresh every 30 seconds
    })

    // Get vehicles list
    const { data: vehicles } = useQuery({
        queryKey: ['fleet-vehicles'],
        queryFn: async () => {
            const { data } = await supabase
                .from('fleet_vehicles')
                .select('id, registration_number, current_mileage, default_fuel_budget')
                .eq('status', 'ACTIVE')
            return data || []
        }
    })

    // Auto-fill odometer when vehicle selected
    useEffect(() => {
        if (vehicleId && vehicles) {
            const v = vehicles.find((v: any) => v.id === vehicleId)
            if (v) {
                setOdometer(v.current_mileage?.toString() || '')
                if (v.default_fuel_budget > 0) {
                    setFuelBudget(v.default_fuel_budget.toString())
                }
            }
        }
    }, [vehicleId, vehicles])

    // GPS Tracking - capture location every 30 seconds during active trip
    useEffect(() => {
        const captureLocation = (tripId: string) => {
            if (!navigator.geolocation) return

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const locData = {
                        trip_id: tripId,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        speed: position.coords.speed || 0,
                        heading: position.coords.heading || 0,
                        accuracy: position.coords.accuracy,
                        recorded_at: new Date().toISOString()
                    }
                    await addToQueue('SAVE_LOCATION', locData)
                },
                (err) => console.error("GPS Error:", err),
                { enableHighAccuracy: true }
            )
        }

        // Start tracking if trip is active
        if (tripStatus?.has_trip && tripStatus?.trip?.id) {
            const tripId = tripStatus.trip.id

            // Capture immediately
            captureLocation(tripId)

            // Then every 30 seconds
            gpsIntervalRef.current = setInterval(() => {
                captureLocation(tripId)
            }, 30000)
        }

        // Cleanup
        return () => {
            if (gpsIntervalRef.current) {
                clearInterval(gpsIntervalRef.current)
                gpsIntervalRef.current = null
            }
        }
    }, [tripStatus?.has_trip, tripStatus?.trip?.id])

    // Start trip mutation
    const startTrip = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('start_driver_trip', {
                p_vehicle_id: vehicleId,
                p_driver_id: user?.id,
                p_start_mileage: parseFloat(odometer),
                p_fuel_budget: fuelBudget ? parseFloat(fuelBudget) : null
            })
            if (error) throw error
            if (!data?.success) throw new Error(data?.message || 'Failed to start trip')
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] })
            toast.success('Trip started!')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    // End trip mutation
    const endTrip = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('end_driver_trip', {
                p_trip_id: tripStatus?.trip?.id,
                p_end_mileage: parseFloat(endOdometer)
            })
            if (error) throw error
            if (!data?.success) throw new Error(data?.message || 'Failed to end trip')
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] })
            toast.success(`Trip completed! Distance: ${data.distance} km`)
            router.push('/mobile')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    // Issue cash mutation
    const issueCash = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('issue_fuel_allowance', {
                p_allowance_id: tripStatus?.fuel_allowance?.id
            })
            if (error) throw error
            if (!data?.success) throw new Error(data?.message || 'Failed to issue cash')
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] })
            toast.success('Cash issued successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    // Return cash mutation
    const returnCash = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('return_fuel_allowance_cash', {
                p_allowance_id: tripStatus?.fuel_allowance?.id,
                p_return_amount: parseFloat(returnAmount)
            })
            if (error) throw error
            if (!data?.success) throw new Error(data?.message || 'Failed to record return')
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-active-trip'] })
            setReturnAmount('')
            toast.success('Cash return recorded')
        },
        onError: (error: Error) => {
            toast.error(error.message)
        }
    })

    const handleStart = () => {
        if (!vehicleId || !odometer) {
            toast.error('Please select vehicle and enter odometer')
            return
        }
        startTrip.mutate()
    }

    const handleEnd = () => {
        if (!endOdometer) {
            toast.error('Please enter closing odometer')
            return
        }
        endTrip.mutate()
    }

    // Loading state
    if (statusLoading) {
        return (
            <div className="p-6 h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        )
    }

    // Not registered as driver
    if (tripStatus && !tripStatus.is_driver) {
        return (
            <div className="p-6 h-screen flex items-center justify-center">
                <Card className="p-6 text-center max-w-sm">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Not Registered</h2>
                    <p className="text-gray-500">You are not registered as a driver. Please contact your admin.</p>
                </Card>
            </div>
        )
    }

    // Active trip view
    if (tripStatus?.has_trip) {
        const trip = tripStatus.trip
        const allowance = tripStatus.fuel_allowance
        const hasAllowance = allowance !== null
        const cashIssued = allowance?.cash_issued || 0
        const outstanding = allowance?.outstanding || 0

        return (
            <div className="p-4 space-y-4 pb-24">
                {/* Trip Status Header */}
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Navigation className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-green-700">Trip in Progress</h1>
                    <p className="text-gray-500">{trip.vehicle_number}</p>
                </div>

                {/* Trip Info */}
                <Card className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500">Started</p>
                            <p className="font-medium">{new Date(trip.start_time).toLocaleTimeString()}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Start Odometer</p>
                            <p className="font-medium">{trip.start_mileage} km</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-500">From</p>
                            <p className="font-medium">{trip.start_location}</p>
                        </div>
                    </div>
                </Card>

                {/* Fuel Allowance Section */}
                {hasAllowance && (
                    <Card className="p-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Fuel className="w-5 h-5 text-orange-500" />
                            <h3 className="font-semibold">Fuel Allowance</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="bg-blue-50 rounded-lg p-2">
                                <p className="text-xs text-gray-500">Budget</p>
                                <p className="font-bold text-blue-600">Rs. {allowance.budgeted_cost?.toLocaleString()}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2">
                                <p className="text-xs text-gray-500">Issued</p>
                                <p className="font-bold text-green-600">Rs. {cashIssued.toLocaleString()}</p>
                            </div>
                            <div className={`rounded-lg p-2 ${outstanding > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                <p className="text-xs text-gray-500">Outstanding</p>
                                <p className={`font-bold ${outstanding > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                                    Rs. {outstanding.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Issue Cash Button */}
                        {cashIssued === 0 && (
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={() => issueCash.mutate()}
                                disabled={issueCash.isPending}
                            >
                                <Banknote className="w-4 h-4 mr-2" />
                                {issueCash.isPending ? 'Issuing...' : `Issue Cash (Rs. ${allowance.budgeted_cost?.toLocaleString()})`}
                            </Button>
                        )}

                        {/* Return Cash Section */}
                        {cashIssued > 0 && outstanding > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-amber-700">Return remaining cash:</p>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={returnAmount}
                                        onChange={(e) => setReturnAmount(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => setReturnAmount(outstanding.toString())}
                                        size="sm"
                                    >
                                        Full
                                    </Button>
                                    <Button
                                        onClick={() => returnCash.mutate()}
                                        disabled={returnCash.isPending || !returnAmount}
                                        size="sm"
                                    >
                                        <ArrowDownLeft className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {cashIssued > 0 && outstanding <= 0 && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                <span>All cash accounted for</span>
                            </div>
                        )}
                    </Card>
                )}

                {/* End Trip Section */}
                {!isEnding ? (
                    <Button
                        size="lg"
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                            setEndOdometer(trip.start_mileage.toString())
                            setIsEnding(true)
                        }}
                    >
                        <StopCircle className="mr-2 h-5 w-5" />
                        End Trip
                    </Button>
                ) : (
                    <Card className="p-4 space-y-4 border-red-200 bg-red-50">
                        <h3 className="font-semibold text-center">Finish Trip</h3>
                        <div>
                            <Label>End Odometer</Label>
                            <Input
                                type="number"
                                value={endOdometer}
                                onChange={(e) => setEndOdometer(e.target.value)}
                                placeholder="e.g. 15020"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setIsEnding(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={handleEnd}
                                disabled={endTrip.isPending}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {endTrip.isPending ? 'Ending...' : 'Confirm'}
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        )
    }

    // Start Trip View
    return (
        <div className="p-4 space-y-6">
            <div className="text-center pt-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Start Your Trip</h1>
                <p className="text-gray-500">Select vehicle and begin</p>
            </div>

            <Card className="p-6 space-y-4">
                <div>
                    <Label>Select Vehicle</Label>
                    <Select onValueChange={setVehicleId} value={vehicleId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                            {vehicles?.map((v: any) => (
                                <SelectItem key={v.id} value={v.id}>
                                    {v.registration_number}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Start Odometer (km)</Label>
                    <Input
                        type="number"
                        value={odometer}
                        onChange={e => setOdometer(e.target.value)}
                        placeholder="Current odometer reading"
                    />
                </div>

                <div>
                    <Label>Fuel Budget (Optional)</Label>
                    <Input
                        type="number"
                        value={fuelBudget}
                        onChange={e => setFuelBudget(e.target.value)}
                        placeholder="Rs. 0 (leave empty if no allowance today)"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter if you're receiving cash for fuel</p>
                </div>

                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleStart}
                    disabled={startTrip.isPending}
                >
                    <MapPin className="mr-2 h-4 w-4" />
                    {startTrip.isPending ? 'Starting...' : 'Start Trip'}
                </Button>
            </Card>
        </div>
    )
}
