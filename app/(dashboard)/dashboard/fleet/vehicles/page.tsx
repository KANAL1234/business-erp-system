'use client'

import { useState, useEffect } from "react"
import { PermissionGuard } from "@/components/permission-guard"
import { createClient } from "@/lib/supabase/client"
import { FleetVehicle } from "@/types/fleet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Search, Pencil, Trash } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { VehicleDialog } from "@/components/fleet/vehicle-dialog"
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

export default function VehiclesPage() {
    return (
        <PermissionGuard permission="fleet:vehicles:view">
            <VehiclesContent />
        </PermissionGuard>
    )
}

function VehiclesContent() {
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | undefined>()
    const [deletingVehicle, setDeletingVehicle] = useState<FleetVehicle | null>(null)
    const supabase = createClient()

    const fetchVehicles = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("fleet_vehicles")
            .select("*")
            .order("created_at", { ascending: false })

        if (error) {
            toast.error("Error fetching vehicles")
        } else {
            setVehicles(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchVehicles()
    }, [])

    const handleDelete = async () => {
        if (!deletingVehicle) return

        const { error } = await supabase
            .from("fleet_vehicles")
            .delete()
            .eq("id", deletingVehicle.id)

        if (error) {
            toast.error("Error deleting vehicle")
        } else {
            toast.success("Vehicle deleted successfully")
            fetchVehicles()
            emitSoftRefresh()
        }
        setDeletingVehicle(null)
    }

    const filteredVehicles = vehicles.filter(v =>
        v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
        v.make.toLowerCase().includes(search.toLowerCase()) ||
        v.model.toLowerCase().includes(search.toLowerCase())
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-800'
            case 'MAINTENANCE': return 'bg-yellow-100 text-yellow-800'
            case 'RETIRED': return 'bg-red-100 text-red-800'
            default: return 'bg-slate-100 text-slate-800'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
                    <p className="text-muted-foreground">Manage fleet vehicles and status</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Vehicle List</CardTitle>
                    <div className="relative w-full sm:w-[250px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vehicles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Registration</TableHead>
                                <TableHead>Make / Model</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Mileage</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : filteredVehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No vehicles found</TableCell>
                                </TableRow>
                            ) : (
                                filteredVehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell className="font-medium">{vehicle.registration_number}</TableCell>
                                        <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                                        <TableCell>{vehicle.year}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusColor(vehicle.status)}>
                                                {vehicle.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{vehicle.current_mileage.toLocaleString()} km</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingVehicle(vehicle)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setDeletingVehicle(vehicle)}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <VehicleDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                onSuccess={fetchVehicles}
            />

            <VehicleDialog
                vehicle={editingVehicle}
                open={!!editingVehicle}
                onOpenChange={(open) => !open && setEditingVehicle(undefined)}
                onSuccess={fetchVehicles}
            />

            <AlertDialog open={!!deletingVehicle} onOpenChange={(open) => !open && setDeletingVehicle(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the vehicle
                            and all associated records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600" onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
