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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { FleetMaintenance, FleetVehicle } from "@/types/fleet"
import { emitSoftRefresh } from "@/lib/soft-refresh"

const formSchema = z.object({
    vehicle_id: z.string().min(1, "Vehicle is required"),
    service_type: z.enum(["ROUTINE", "REPAIR", "INSPECTION"]),
    service_date: z.string().min(1, "Date is required"),
    odometer_reading: z.string().min(1, "Odometer required"),
    cost: z.string().min(1, "Cost is required"),
    description: z.string().optional(),
    vendor_name: z.string().optional(),
    next_service_due_date: z.string().optional(),
    next_service_due_mileage: z.string().optional(),
    payment_method: z.enum(["CASH", "CREDIT", "ADVANCE"]),
})

type FormValues = z.infer<typeof formSchema>

interface MaintenanceDialogProps {
    maintenance?: FleetMaintenance
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
}

export function MaintenanceDialog({ maintenance, trigger, open, onOpenChange, onSuccess }: MaintenanceDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
    const supabase = createClient()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            vehicle_id: "",
            service_type: "ROUTINE",
            service_date: new Date().toISOString().slice(0, 10),
            odometer_reading: "0",
            cost: "0",
            description: "",
            vendor_name: "",
            next_service_due_date: "",
            next_service_due_mileage: "",
            payment_method: "CASH",
        },
    })

    useEffect(() => {
        const fetchVehicles = async () => {
            const { data } = await supabase.from("fleet_vehicles").select("*").eq("status", "ACTIVE")
            if (data) setVehicles(data)
        }
        fetchVehicles()
    }, [supabase])

    useEffect(() => {
        if (maintenance) {
            form.reset({
                vehicle_id: maintenance.vehicle_id,
                service_type: maintenance.service_type as FormValues["service_type"],
                service_date: maintenance.service_date,
                odometer_reading: String(maintenance.odometer_reading),
                cost: String(maintenance.cost),
                description: maintenance.description || "",
                vendor_name: maintenance.vendor_name || "",
                next_service_due_date: maintenance.next_service_due_date || "",
                next_service_due_mileage: maintenance.next_service_due_mileage ? String(maintenance.next_service_due_mileage) : "",
                payment_method: maintenance.payment_method || "CASH",
            })
        }
    }, [maintenance, form])

    const onSubmit = async (values: FormValues) => {
        try {
            const odometer_reading = parseFloat(values.odometer_reading) || 0
            const cost = parseFloat(values.cost) || 0
            const next_service_due_mileage = values.next_service_due_mileage ? parseFloat(values.next_service_due_mileage) : null

            const dataToSave = {
                vehicle_id: values.vehicle_id,
                service_type: values.service_type,
                service_date: values.service_date,
                odometer_reading,
                cost,
                description: values.description || null,
                vendor_name: values.vendor_name || null,
                next_service_due_date: values.next_service_due_date || null,
                next_service_due_mileage,
                payment_method: values.payment_method,
            }

            if (maintenance) {
                const { error } = await supabase
                    .from("fleet_maintenance")
                    .update(dataToSave)
                    .eq("id", maintenance.id)

                if (error) throw error
                toast.success("Maintenance record updated")
            } else {
                // Insert new maintenance record
                const { data: insertedData, error } = await supabase
                    .from("fleet_maintenance")
                    .insert(dataToSave)
                    .select("id")
                    .single()

                if (error) throw error

                // Auto-post to accounting
                const { data: postResult, error: postError } = await supabase
                    .rpc("post_fleet_maintenance_expense", { p_maintenance_id: insertedData.id })

                if (postError) {
                    console.error("Failed to post to accounting:", postError)
                    toast.success("Maintenance record created (accounting post failed)")
                } else if (postResult?.success) {
                    toast.success(`Maintenance recorded - ${postResult.journal_number}`)
                } else {
                    toast.success("Maintenance record created")
                }
            }

            emitSoftRefresh()
            setIsOpen(false)
            onOpenChange?.(false)
            onSuccess?.()
            if (!maintenance) form.reset()
        } catch (error: any) {
            toast.error(error.message || "Failed to save maintenance record")
        }
    }

    return (
        <Dialog open={open ?? isOpen} onOpenChange={onOpenChange ?? setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{maintenance ? "Edit Maintenance" : "Log Maintenance"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="vehicle_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vehicle</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select vehicle" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {vehicles.map((v) => (
                                                    <SelectItem key={v.id} value={v.id}>
                                                        {v.registration_number}
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
                                name="service_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ROUTINE">Routine</SelectItem>
                                                <SelectItem value="REPAIR">Repair</SelectItem>
                                                <SelectItem value="INSPECTION">Inspection</SelectItem>
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
                                name="service_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="vendor_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vendor</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Garage/Mechanic" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="odometer_reading"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Odometer</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cost</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="CASH">Cash</SelectItem>
                                            <SelectItem value="CREDIT">Credit (Payable)</SelectItem>
                                            <SelectItem value="ADVANCE">Driver Advance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Details of work done..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="next_service_due_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Next Due Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="next_service_due_mileage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Next Due Mileage</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit">
                                {maintenance ? "Save Changes" : "Create Record"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
