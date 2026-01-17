'use client'

import { useEffect, useMemo, useState } from "react"
import { PermissionGuard } from "@/components/permission-guard"
import { createClient } from "@/lib/supabase/client"
import { FleetTrip, FleetFuelLog } from "@/types/fleet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash, DollarSign, Fuel, MapPin } from "lucide-react"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ListSortControls } from "@/components/list-sort-controls"
import { TripDialog } from "@/components/fleet/trip-dialog"
import { FuelDialog } from "@/components/fleet/fuel-dialog"
import { CashDepositDialog } from "@/components/fleet/cash-deposit-dialog"
import { FuelAllowanceDialog } from "@/components/fleet/fuel-allowance-dialog"
import { format } from "date-fns"
import { toast } from "sonner"
import { emitSoftRefresh } from "@/lib/soft-refresh"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function TripsPage() {
    return (
        <PermissionGuard permission="fleet:trips:view">
            <TripsContent />
        </PermissionGuard>
    )
}

function TripsContent() {
    const [trips, setTrips] = useState<FleetTrip[]>([])
    const [dateFilter, setDateFilter] = useState<string>("")
    const [fuelLogs, setFuelLogs] = useState<FleetFuelLog[]>([])
    const [loading, setLoading] = useState(true)
    const [isTripAddOpen, setIsTripAddOpen] = useState(false)
    const [isFuelAddOpen, setIsFuelAddOpen] = useState(false)
    const [editingTrip, setEditingTrip] = useState<FleetTrip | undefined>()
    const [deletingTrip, setDeletingTrip] = useState<FleetTrip | null>(null)
    const [cashDepositTrip, setCashDepositTrip] = useState<FleetTrip | null>(null)
    const [fuelAllowanceTrip, setFuelAllowanceTrip] = useState<FleetTrip | null>(null)
    const [tripSortBy, setTripSortBy] = useState('start_time')
    const [tripSortOrder, setTripSortOrder] = useState<'asc' | 'desc'>('desc')
    const [fuelSortBy, setFuelSortBy] = useState('log_date')
    const [fuelSortOrder, setFuelSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()

    const fetchTrips = async () => {
        let query = supabase
            .from("fleet_trips")
            .select(`
                *, 
                vehicle:fleet_vehicles(registration_number, make, model), 
                driver:fleet_drivers(*, employee:employees(full_name, employee_code))
            `)
            .order("start_time", { ascending: false })

        if (dateFilter) {
            query = query
                .gte('start_time', `${dateFilter}T00:00:00`)
                .lte('start_time', `${dateFilter}T23:59:59`)
        }

        const { data, error } = await query

        if (error) {
            toast.error("Error fetching trips")
        } else if (data) {
            setTrips(data as any)
        }
    }

    const fetchFuelLogs = async () => {
        const { data, error } = await supabase
            .from("fleet_fuel_logs")
            .select("*, vehicle:fleet_vehicles(registration_number)")
            .order("log_date", { ascending: false })

        if (error) {
            toast.error("Error fetching fuel logs")
        } else if (data) {
            setFuelLogs(data)
        }
    }

    const handleDeleteTrip = async () => {
        if (!deletingTrip) return

        const { error } = await supabase
            .from("fleet_trips")
            .delete()
            .eq("id", deletingTrip.id)

        if (error) {
            toast.error("Error deleting trip")
        } else {
            toast.success("Trip deleted successfully")
            fetchTrips()
            emitSoftRefresh()
        }
        setDeletingTrip(null)
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            await Promise.all([fetchTrips(), fetchFuelLogs()])
            setLoading(false)
        }
        load()
    }, [dateFilter])

    const sortedTrips = useMemo(() => {
        const data = trips ? [...trips] : []
        const sorters: Record<string, (row: any) => string | number> = {
            start_time: (row) => new Date(row.start_time).getTime(),
            status: (row) => String(row.status || ''),
            vehicle: (row) => String(row.vehicle?.registration_number || ''),
            driver: (row) => String(row.driver?.employee?.full_name || ''),
        }
        const getValue = sorters[tripSortBy] || sorters.start_time
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return tripSortOrder === 'asc' ? -1 : 1
            if (av > bv) return tripSortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [trips, tripSortBy, tripSortOrder])

    const sortedFuelLogs = useMemo(() => {
        const data = fuelLogs ? [...fuelLogs] : []
        const sorters: Record<string, (row: any) => string | number> = {
            log_date: (row) => new Date(row.log_date).getTime(),
            liters: (row) => Number(row.liters || 0),
            total_cost: (row) => Number(row.total_cost || 0),
            vehicle: (row) => String(row.vehicle?.registration_number || ''),
        }
        const getValue = sorters[fuelSortBy] || sorters.log_date
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return fuelSortOrder === 'asc' ? -1 : 1
            if (av > bv) return fuelSortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [fuelLogs, fuelSortBy, fuelSortOrder])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trips & Fuel</h1>
                    <p className="text-muted-foreground">Track fleet trips, fuel logs, and cash deposits</p>
                </div>
            </div>

            <Tabs defaultValue="trips">
                <TabsList>
                    <TabsTrigger value="trips">Trips</TabsTrigger>
                    <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="trips" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
                            <CardTitle className="text-base font-medium">Trip List</CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Filter Date:</span>
                                <Input
                                    type="date"
                                    className="w-[180px]"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                                {dateFilter && (
                                    <Button variant="outline" size="sm" onClick={() => setDateFilter("")}>
                                        Clear
                                    </Button>
                                )}
                                <ListSortControls
                                    sortBy={tripSortBy}
                                    sortOrder={tripSortOrder}
                                    onSortByChange={setTripSortBy}
                                    onSortOrderChange={setTripSortOrder}
                                    options={[
                                        { value: 'start_time', label: 'Date Added' },
                                        { value: 'vehicle', label: 'Vehicle' },
                                        { value: 'driver', label: 'Driver' },
                                        { value: 'status', label: 'Status' },
                                    ]}
                                />
                            </div>
                            <Button onClick={() => setIsTripAddOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> New Trip
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Route / Purpose</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading trips...</TableCell></TableRow>
                                    ) : sortedTrips.map((trip) => (
                                        <TableRow key={trip.id}>
                                            <TableCell>
                                                {format(new Date(trip.start_time), "MMM dd, HH:mm")}
                                            </TableCell>
                                            <TableCell>{trip.vehicle?.registration_number}</TableCell>
                                            <TableCell>{trip.driver?.employee?.full_name || 'N/A'}</TableCell>
                                            <TableCell>{trip.start_location} → {trip.end_location || '...'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{trip.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link href={`/dashboard/fleet/trips/${trip.id}/gps`}>
                                                            <MapPin className="mr-2 h-4 w-4" />
                                                            GPS Trail
                                                        </Link>
                                                    </Button>
                                                    {trip.status === 'COMPLETED' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setCashDepositTrip(trip)}
                                                        >
                                                            <DollarSign className="mr-2 h-4 w-4" />
                                                            Cash Deposit
                                                        </Button>
                                                    )}
                                                    {trip.status === 'IN_PROGRESS' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setFuelAllowanceTrip(trip)}
                                                        >
                                                            <Fuel className="mr-2 h-4 w-4" />
                                                            Fuel Allowance
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingTrip(trip)}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setDeletingTrip(trip)}
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && sortedTrips.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No trips found</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="fuel" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <CardTitle className="text-base font-medium">Fuel Logs</CardTitle>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <ListSortControls
                                    sortBy={fuelSortBy}
                                    sortOrder={fuelSortOrder}
                                    onSortByChange={setFuelSortBy}
                                    onSortOrderChange={setFuelSortOrder}
                                    options={[
                                        { value: 'log_date', label: 'Date Added' },
                                        { value: 'vehicle', label: 'Vehicle' },
                                        { value: 'liters', label: 'Liters' },
                                        { value: 'total_cost', label: 'Cost' },
                                    ]}
                                />
                                <Button onClick={() => setIsFuelAddOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" /> Log Fuel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Liters</TableHead>
                                        <TableHead>Cost</TableHead>
                                        <TableHead>Odometer</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Loading fuel logs...</TableCell></TableRow>
                                    ) : sortedFuelLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {format(new Date(log.log_date), "MMM dd, HH:mm")}
                                            </TableCell>
                                            <TableCell>{log.vehicle?.registration_number}</TableCell>
                                            <TableCell>{log.liters} L</TableCell>
                                            <TableCell>Rs. {log.total_cost?.toFixed(2)}</TableCell>
                                            <TableCell>{log.odometer_reading?.toLocaleString()} km</TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && sortedFuelLogs.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No fuel logs found</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <TripDialog
                open={isTripAddOpen}
                onOpenChange={setIsTripAddOpen}
                onSuccess={fetchTrips}
            />

            <TripDialog
                trip={editingTrip}
                open={!!editingTrip}
                onOpenChange={(open) => !open && setEditingTrip(undefined)}
                onSuccess={fetchTrips}
            />

            <FuelDialog
                open={isFuelAddOpen}
                onOpenChange={setIsFuelAddOpen}
                onSuccess={fetchFuelLogs}
            />

            <CashDepositDialog
                open={!!cashDepositTrip}
                onOpenChange={(open) => !open && setCashDepositTrip(null)}
                tripId={cashDepositTrip?.id}
                driverId={cashDepositTrip?.driver_id}
                vehicleId={cashDepositTrip?.vehicle_id}
            />

            <FuelAllowanceDialog
                open={!!fuelAllowanceTrip}
                onOpenChange={(open) => !open && setFuelAllowanceTrip(null)}
                tripId={fuelAllowanceTrip?.id}
                driverId={fuelAllowanceTrip?.driver_id}
                vehicleId={fuelAllowanceTrip?.vehicle_id}
            />

            <AlertDialog open={!!deletingTrip} onOpenChange={(open) => !open && setDeletingTrip(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the trip record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600" onClick={handleDeleteTrip}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
