'use client'

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { FleetTrip, FleetTripVisit } from "@/types/fleet"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShoppingBag, Users, Navigation } from "lucide-react"
import dynamic from 'next/dynamic'

// Dynamically import the map to prevent SSR issues with Leaflet
const TripRouteMap = dynamic(() => import("./trip-route-map"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 text-xs">Loading map...</div>
})

interface TripTrackingViewProps {
    tripId: string
}

export function TripTrackingView({ tripId }: TripTrackingViewProps) {
    const [trip, setTrip] = useState<FleetTrip | null>(null)
    const [visits, setVisits] = useState<FleetTripVisit[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Fetch Trip with GPS
                const { data: tripData } = await supabase
                    .from("fleet_trips")
                    .select("*, vehicle:fleet_vehicles(*)")
                    .eq("id", tripId)
                    .single()

                if (tripData) setTrip(tripData)

                // Fetch GPS Points from locations table
                const { data: routeData } = await supabase
                    .from("fleet_trip_locations")
                    .select("latitude, longitude, recorded_at")
                    .eq("trip_id", tripId)
                    .order("recorded_at", { ascending: true })

                if (routeData && routeData.length > 0) {
                    const formattedPath = routeData.map(pt => ({
                        lat: pt.latitude,
                        lng: pt.longitude,
                        time: pt.recorded_at
                    }))
                    setTrip(prev => prev ? { ...prev, gps_path: formattedPath } : null)
                }

                // Fetch Visits
                const { data: visitData } = await supabase
                    .from("fleet_trip_visits")
                    .select("*, customer:customers(name, customer_code)")
                    .eq("trip_id", tripId)
                    .order("visit_time", { ascending: true })

                if (visitData) setVisits(visitData)

                // Fetch Linked Invoices
                const { data: invoiceData } = await supabase
                    .from("sales_invoices")
                    .select("*")
                    .eq("trip_id", tripId)
                    .order("created_at", { ascending: true })

                if (invoiceData) setInvoices(invoiceData)

            } catch (error) {
                console.error("Error fetching tracking data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [tripId, supabase])

    if (loading) return <div className="p-8 text-center text-slate-500">Loading tracking details...</div>
    if (!trip) return <div className="p-8 text-center text-red-500">Trip not found</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border">
                <div>
                    <h1 className="text-xl font-bold">Trip Live Monitoring</h1>
                    <p className="text-xs text-slate-500">Real-time data from {trip.vehicle?.registration_number}</p>
                </div>
                <Badge variant={trip.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                    {trip.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2 overflow-hidden border-slate-200">
                    <CardHeader className="pb-2 bg-slate-50/50 border-b">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-primary" />
                            Live GPS Route
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="h-[400px] w-full bg-slate-100">
                            <TripRouteMap gpsPath={trip.gps_path || []} />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4 text-green-500" />
                                Customer Visits
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{visits.length}</div>
                            <p className="text-xs text-slate-500 mt-1">Unique stops completed</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4 text-primary" />
                                Sales Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                Rs. {invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{invoices.length} invoices generated</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-xs text-slate-500 space-y-2">
                                <div className="flex justify-between">
                                    <span>Start Mileage:</span>
                                    <span className="font-medium text-slate-900">{trip.start_mileage} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Started at:</span>
                                    <span className="font-medium text-slate-900">{format(new Date(trip.start_time), "MMM d, HH:mm")}</span>
                                </div>
                                {trip.end_time && (
                                    <div className="flex justify-between">
                                        <span>Ended at:</span>
                                        <span className="font-medium text-slate-900">{format(new Date(trip.end_time), "MMM d, HH:mm")}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Visit Log</CardTitle>
                        <CardDescription>Customers visited during this session</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visits.map((visit) => (
                                    <TableRow key={visit.id}>
                                        <TableCell className="text-xs">
                                            {format(new Date(visit.visit_time), "HH:mm")}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {visit.customer?.name}
                                            <div className="text-[10px] text-slate-400">{visit.customer?.customer_code}</div>
                                        </TableCell>
                                        <TableCell className="text-xs italic">{visit.notes || "-"}</TableCell>
                                    </TableRow>
                                ))}
                                {visits.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400">No visits recorded</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Invoices</CardTitle>
                        <CardDescription>Direct sales from mobile store</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                        <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            Rs. {inv.total_amount?.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-[10px]">{inv.status}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {invoices.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-slate-400">No invoices generated</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
