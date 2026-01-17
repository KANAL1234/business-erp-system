'use client'

import { useEffect, useMemo, useState } from "react"
import { PermissionGuard } from "@/components/permission-guard"
import { createClient } from "@/lib/supabase/client"
import { FleetMaintenance } from "@/types/fleet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Pencil, Trash } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { MaintenanceDialog } from "@/components/fleet/maintenance-dialog"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { emitSoftRefresh } from "@/lib/soft-refresh"
import { ListSortControls } from "@/components/list-sort-controls"
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

export default function MaintenancePage() {
    return (
        <PermissionGuard permission="fleet:maintenance:view">
            <MaintenanceContent />
        </PermissionGuard>
    )
}

function MaintenanceContent() {
    const [maintenanceRecords, setMaintenanceRecords] = useState<FleetMaintenance[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingMaintenance, setEditingMaintenance] = useState<FleetMaintenance | undefined>()
    const [deletingMaintenance, setDeletingMaintenance] = useState<FleetMaintenance | null>(null)
    const [sortBy, setSortBy] = useState('service_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()

    const fetchMaintenance = async () => {
        setLoading(true)
        const { data } = await supabase
            .from("fleet_maintenance")
            .select("*, vehicle:fleet_vehicles(registration_number)")
            .order("service_date", { ascending: false })

        if (data) setMaintenanceRecords(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchMaintenance()
    }, [])

    const handleDelete = async () => {
        if (!deletingMaintenance) return

        const { error } = await supabase
            .from("fleet_maintenance")
            .delete()
            .eq("id", deletingMaintenance.id)

        if (error) {
            toast.error("Error deleting maintenance record")
        } else {
            toast.success("Record deleted successfully")
            fetchMaintenance()
            emitSoftRefresh()
        }
        setDeletingMaintenance(null)
    }

    const sortedRecords = useMemo(() => {
        const data = maintenanceRecords ? [...maintenanceRecords] : []
        const sorters: Record<string, (row: any) => string | number> = {
            service_date: (row) => new Date(row.service_date).getTime(),
            vehicle: (row) => String(row.vehicle?.registration_number || ''),
            service_type: (row) => String(row.service_type || ''),
            vendor: (row) => String(row.vendor_name || ''),
            cost: (row) => Number(row.cost || 0),
        }
        const getValue = sorters[sortBy] || sorters.service_date
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [maintenanceRecords, sortBy, sortOrder])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
                    <p className="text-muted-foreground">Manage vehicle service and maintenance records</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Log Maintenance
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Maintenance Records</CardTitle>
                    <ListSortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={setSortBy}
                        onSortOrderChange={setSortOrder}
                        options={[
                            { value: 'service_date', label: 'Date Added' },
                            { value: 'vehicle', label: 'Vehicle' },
                            { value: 'service_type', label: 'Type' },
                            { value: 'vendor', label: 'Vendor' },
                            { value: 'cost', label: 'Cost' },
                        ]}
                    />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Loading...</TableCell>
                                </TableRow>
                            ) : sortedRecords.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No records found</TableCell>
                                </TableRow>
                            ) : (
                                sortedRecords.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            {format(new Date(record.service_date), "MMM dd, yyyy")}
                                        </TableCell>
                                        <TableCell>{record.vehicle?.registration_number}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{record.service_type}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={record.description || ""}>
                                            {record.description}
                                        </TableCell>
                                        <TableCell>{record.vendor_name}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            Rs. {record.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingMaintenance(record)}
                                                >
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setDeletingMaintenance(record)}
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

            <MaintenanceDialog
                open={isAddOpen || !!editingMaintenance}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsAddOpen(false)
                        setEditingMaintenance(undefined)
                    }
                }}
                maintenance={editingMaintenance}
                onSuccess={fetchMaintenance}
            />

            <AlertDialog open={!!deletingMaintenance} onOpenChange={(open) => !open && setDeletingMaintenance(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the maintenance record.
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
