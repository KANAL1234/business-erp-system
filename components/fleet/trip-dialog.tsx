'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { FleetTrip, FleetVehicle, FleetDriver } from "@/types/fleet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TripTrackingView } from "./trip-tracking-view"
import { emitSoftRefresh } from "@/lib/soft-refresh"

const formSchema = z.object({
    vehicle_id: z.string().min(1, "Vehicle is required"),
    driver_id: z.string().min(1, "Driver is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().optional(),
    start_location: z.string().min(1, "Start location is required"),
    end_location: z.string().optional(),
    start_mileage: z.string().min(1, "Start mileage is required"),
    end_mileage: z.string().optional(),
    trip_purpose: z.string().optional(),
    status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
})

type FormValues = z.infer<typeof formSchema>

interface TripDialogProps {
    trip?: FleetTrip
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
}

export function TripDialog({ trip, trigger, open, onOpenChange, onSuccess }: TripDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
    const [drivers, setDrivers] = useState<FleetDriver[]>([])
    const supabase = createClient()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            vehicle_id: "",
            driver_id: "",
            start_time: new Date().toISOString().slice(0, 16),
            end_time: "",
            start_location: "Main Warehouse",
            end_location: "",
            start_mileage: "0",
            end_mileage: "",
            trip_purpose: "",
            status: "PLANNED",
        },
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active vehicles
                const { data: vehiclesData, error: vehiclesError } = await supabase
                    .from("fleet_vehicles")
                    .select("*")
                    .eq("status", "ACTIVE")
                    .order("registration_number")

                if (vehiclesError) throw vehiclesError
                if (vehiclesData) setVehicles(vehiclesData)

                // Fetch active drivers with employee info
                const { data: driversData, error: driversError } = await supabase
                    .from("fleet_drivers")
                    .select("*, employee:employees(full_name, employee_code)")
                    .eq("status", "ACTIVE")

                if (driversError) throw driversError
                if (driversData) setDrivers(driversData)
            } catch (error: any) {
                console.error("Error fetching data:", error)
                toast.error(error.message || "Failed to load data")
            }
        }

        fetchData()
    }, [supabase])

    useEffect(() => {
        if (trip) {
            form.reset({
                vehicle_id: trip.vehicle_id,
                driver_id: trip.driver_id,
                start_time: trip.start_time ? new Date(trip.start_time).toISOString().slice(0, 16) : "",
                end_time: trip.end_time ? new Date(trip.end_time).toISOString().slice(0, 16) : "",
                start_location: trip.start_location,
                end_location: trip.end_location || "",
                start_mileage: String(trip.start_mileage),
                end_mileage: trip.end_mileage ? String(trip.end_mileage) : "",
                trip_purpose: trip.trip_purpose || "",
                status: trip.status as FormValues["status"],
            })
        } else {
            form.reset({
                vehicle_id: "",
                driver_id: "",
                start_time: new Date().toISOString().slice(0, 16),
                end_time: "",
                start_location: "Main Warehouse",
                end_location: "",
                start_mileage: "0",
                end_mileage: "",
                trip_purpose: "",
                status: "PLANNED",
            })
        }
    }, [trip, form])

    const onSubmit = async (values: FormValues) => {
        try {
            const startMileage = parseFloat(values.start_mileage) || 0
            const endMileage = values.end_mileage ? parseFloat(values.end_mileage) : null

            const dataToSave = {
                vehicle_id: values.vehicle_id,
                driver_id: values.driver_id,
                start_time: new Date(values.start_time).toISOString(),
                end_time: values.end_time ? new Date(values.end_time).toISOString() : null,
                start_location: values.start_location,
                end_location: values.end_location || null,
                start_mileage: startMileage,
                end_mileage: endMileage,
                trip_purpose: values.trip_purpose || null,
                status: values.status,
            }

            if (trip) {
                const { error } = await supabase
                    .from("fleet_trips")
                    .update(dataToSave)
                    .eq("id", trip.id)

                if (error) throw error
                toast.success("Trip updated successfully")
            } else {
                const { error } = await supabase
                    .from("fleet_trips")
                    .insert(dataToSave)

                if (error) throw error
                toast.success("Trip created successfully")
            }

            emitSoftRefresh()
            setIsOpen(false)
            onOpenChange?.(false)
            onSuccess?.()
            if (!trip) form.reset()
        } catch (error: any) {
            console.error("Error saving trip:", error)
            toast.error(error.message || "Failed to save trip")
        }
    }

    return (
        <Dialog open={open ?? isOpen} onOpenChange={onOpenChange ?? setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{trip ? "Edit Trip" : "New Trip"}</DialogTitle>
                </DialogHeader>

                {trip ? (
                    <Tabs defaultValue="form" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="form">Trip Details</TabsTrigger>
                            <TabsTrigger value="tracking">Tracking & Results</TabsTrigger>
                        </TabsList>
                        <TabsContent value="form">
                            <TripForm form={form} onSubmit={onSubmit} vehicles={vehicles} drivers={drivers} trip={trip} onCancel={() => {
                                setIsOpen(false)
                                onOpenChange?.(false)
                            }} />
                        </TabsContent>
                        <TabsContent value="tracking">
                            <TripTrackingView tripId={trip.id} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <TripForm form={form} onSubmit={onSubmit} vehicles={vehicles} drivers={drivers} trip={trip} onCancel={() => {
                        setIsOpen(false)
                        onOpenChange?.(false)
                    }} />
                )}
            </DialogContent>
        </Dialog>
    )
}

function TripForm({ form, onSubmit, vehicles, drivers, trip, onCancel }: any) {
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="vehicle_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vehicle *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select vehicle" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {vehicles.map((v: any) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.registration_number} - {v.make} {v.model}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="driver_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Driver *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select driver" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {drivers.map((d: any) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.employee?.full_name || "Unknown"} ({d.employee?.employee_code || "N/A"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Time *</FormLabel>
                                <FormControl>
                                    <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                    <Input type="datetime-local" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="start_location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Location *</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Warehouse A" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="end_location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Location</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Warehouse B" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="start_mileage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Odometer (km) *</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="end_mileage"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Odometer (km)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="trip_purpose"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Trip Purpose</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Customer delivery, Stock pickup" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="PLANNED">Planned</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button type="submit">
                        {trip ? "Save Changes" : "Create Trip"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
