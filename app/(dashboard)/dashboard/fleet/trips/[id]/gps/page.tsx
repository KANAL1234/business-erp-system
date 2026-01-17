'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Navigation, Clock, Gauge, Route } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface TripLocation {
    id: string
    latitude: number
    longitude: number
    speed: number | null
    heading: number | null
    recorded_at: string
}

interface TripDetails {
    id: string
    start_time: string
    end_time: string | null
    start_location: string
    end_location: string | null
    start_mileage: number
    end_mileage: number | null
    status: string
    vehicle: {
        registration_number: string
        make: string
        model: string
    }
    driver: {
        employee: {
            full_name: string
        }
    }
}

export default function TripGPSPage() {
    const params = useParams()
    const router = useRouter()
    const tripId = params.id as string

    const [trip, setTrip] = useState<TripDetails | null>(null)
    const [locations, setLocations] = useState<TripLocation[]>([])
    const [loading, setLoading] = useState(true)
    const [mapLoaded, setMapLoaded] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        async function fetchData() {
            setLoading(true)

            // Fetch trip details
            const { data: tripData } = await supabase
                .from('fleet_trips')
                .select(`
                    *,
                    vehicle:fleet_vehicles(registration_number, make, model),
                    driver:fleet_drivers(*, employee:employees(full_name))
                `)
                .eq('id', tripId)
                .single()

            if (tripData) {
                setTrip(tripData as any)
            }

            // Fetch GPS locations
            const { data: locData } = await supabase
                .from('fleet_trip_locations')
                .select('*')
                .eq('trip_id', tripId)
                .order('recorded_at', { ascending: true })

            if (locData) {
                setLocations(locData)
            }

            setLoading(false)
        }

        if (tripId) {
            fetchData()
        }
    }, [tripId])

    // Calculate trip stats
    const stats = useMemo(() => {
        if (locations.length === 0) return null

        const speeds = locations.filter(l => l.speed !== null && l.speed > 0).map(l => l.speed as number)
        const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0
        const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0

        const duration = trip?.end_time
            ? (new Date(trip.end_time).getTime() - new Date(trip.start_time).getTime()) / 1000 / 60
            : null

        const distance = trip?.end_mileage && trip?.start_mileage
            ? trip.end_mileage - trip.start_mileage
            : null

        return {
            pointsCount: locations.length,
            avgSpeed: avgSpeed.toFixed(1),
            maxSpeed: maxSpeed.toFixed(1),
            duration: duration ? `${Math.floor(duration / 60)}h ${Math.floor(duration % 60)}m` : 'In Progress',
            distance: distance ? `${distance} km` : 'N/A'
        }
    }, [locations, trip])

    // Generate Google Maps URL with polyline
    const mapUrl = useMemo(() => {
        if (locations.length === 0) return null

        // Get start and end points
        const start = locations[0]
        const end = locations[locations.length - 1]

        // For Google Maps embed, we'll use waypoints
        // Limit to ~20 waypoints for URL length
        const step = Math.max(1, Math.floor(locations.length / 20))
        const waypoints = locations
            .filter((_, i) => i % step === 0 || i === locations.length - 1)
            .map(l => `${l.latitude},${l.longitude}`)
            .slice(1, -1) // Remove first and last (they're origin/destination)
            .join('|')

        const origin = `${start.latitude},${start.longitude}`
        const destination = `${end.latitude},${end.longitude}`

        // Google Maps directions URL
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
        if (waypoints) {
            url += `&waypoints=${waypoints}`
        }
        url += '&travelmode=driving'

        return url
    }, [locations])

    // Generate static map image URL (for preview)
    const staticMapUrl = useMemo(() => {
        if (locations.length === 0) return null

        // Create polyline path
        const step = Math.max(1, Math.floor(locations.length / 50))
        const path = locations
            .filter((_, i) => i % step === 0 || i === locations.length - 1)
            .map(l => `${l.latitude},${l.longitude}`)
            .join('|')

        // OpenStreetMap static map alternative using path
        const center = locations[Math.floor(locations.length / 2)]

        return `https://maps.googleapis.com/maps/api/staticmap?size=800x400&path=color:0x0000ff|weight:3|${path}&markers=color:green|label:S|${locations[0].latitude},${locations[0].longitude}&markers=color:red|label:E|${locations[locations.length-1].latitude},${locations[locations.length-1].longitude}&key=YOUR_API_KEY`
    }, [locations])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading GPS data...</p>
                </div>
            </div>
        )
    }

    if (!trip) {
        return (
            <div className="flex items-center justify-center h-96">
                <Card className="p-6 text-center">
                    <p className="text-muted-foreground">Trip not found</p>
                    <Button variant="link" onClick={() => router.back()}>Go Back</Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">GPS Trail</h1>
                    <p className="text-muted-foreground">
                        {trip.vehicle?.registration_number} - {format(new Date(trip.start_time), 'MMM dd, yyyy')}
                    </p>
                </div>
                <Badge variant={trip.status === 'COMPLETED' ? 'default' : 'secondary'} className="ml-auto">
                    {trip.status}
                </Badge>
            </div>

            {/* Trip Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Navigation className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Vehicle</p>
                                <p className="font-semibold">{trip.vehicle?.registration_number}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Clock className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Duration</p>
                                <p className="font-semibold">{stats?.duration || 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Route className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Distance</p>
                                <p className="font-semibold">{stats?.distance || 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Gauge className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Speed</p>
                                <p className="font-semibold">{stats?.avgSpeed || '0'} km/h</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Map Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Route Map</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            {stats?.pointsCount || 0} GPS points recorded
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {locations.length === 0 ? (
                        <div className="h-96 flex items-center justify-center bg-muted/50 rounded-lg">
                            <div className="text-center">
                                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No GPS data recorded for this trip</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Map Preview using iframe */}
                            <div className="h-96 bg-muted/20 rounded-lg overflow-hidden border">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    frameBorder="0"
                                    style={{ border: 0 }}
                                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...locations.map(l => l.longitude)) - 0.01},${Math.min(...locations.map(l => l.latitude)) - 0.01},${Math.max(...locations.map(l => l.longitude)) + 0.01},${Math.max(...locations.map(l => l.latitude)) + 0.01}&layer=mapnik&marker=${locations[0].latitude},${locations[0].longitude}`}
                                    allowFullScreen
                                />
                            </div>

                            {/* Open in Google Maps Button */}
                            {mapUrl && (
                                <div className="flex justify-center">
                                    <Button asChild size="lg" className="gap-2">
                                        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                                            <MapPin className="h-5 w-5" />
                                            Open Full Route in Google Maps
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Timeline */}
            {locations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Location Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
                            <div className="space-y-4">
                                {/* Start Point */}
                                <div className="relative flex items-start gap-4 pl-10">
                                    <div className="absolute left-2.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                    <div>
                                        <p className="font-medium text-green-600">Trip Started</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(trip.start_time), 'HH:mm:ss')} - {trip.start_location}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Odometer: {trip.start_mileage?.toLocaleString()} km
                                        </p>
                                    </div>
                                </div>

                                {/* Sample Points */}
                                {locations.length > 2 && (
                                    <div className="relative flex items-start gap-4 pl-10">
                                        <div className="absolute left-2.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                                        <div>
                                            <p className="font-medium text-blue-600">{locations.length} GPS Points</p>
                                            <p className="text-sm text-muted-foreground">
                                                Location tracked every ~30 seconds
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* End Point */}
                                {trip.status === 'COMPLETED' && trip.end_time && (
                                    <div className="relative flex items-start gap-4 pl-10">
                                        <div className="absolute left-2.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                                        <div>
                                            <p className="font-medium text-red-600">Trip Ended</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(trip.end_time), 'HH:mm:ss')} - {trip.end_location}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Odometer: {trip.end_mileage?.toLocaleString()} km
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
