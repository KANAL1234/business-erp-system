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
import { FleetVehicle } from "@/types/fleet"
import { emitSoftRefresh } from "@/lib/soft-refresh"

const formSchema = z.object({
    registration_number: z.string().min(1, "Registration number is required"),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.string().min(1, "Year is required"),
    status: z.enum(["ACTIVE", "MAINTENANCE", "RETIRED"]),
    current_mileage: z.string().min(1, "Mileage is required"),
})

type FormValues = z.infer<typeof formSchema>

interface VehicleDialogProps {
    vehicle?: FleetVehicle
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
}

export function VehicleDialog({ vehicle, trigger, open, onOpenChange, onSuccess }: VehicleDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const supabase = createClient()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            registration_number: "",
            make: "",
            model: "",
            year: String(new Date().getFullYear()),
            status: "ACTIVE",
            current_mileage: "0",
        },
    })

    useEffect(() => {
        if (vehicle) {
            form.reset({
                registration_number: vehicle.registration_number,
                make: vehicle.make,
                model: vehicle.model,
                year: String(vehicle.year),
                status: vehicle.status,
                current_mileage: String(vehicle.current_mileage),
            })
        } else {
            form.reset({
                registration_number: "",
                make: "",
                model: "",
                year: String(new Date().getFullYear()),
                status: "ACTIVE",
                current_mileage: "0",
            })
        }
    }, [vehicle, form])

    const onSubmit = async (values: FormValues) => {
        try {
            const dataToSave = {
                registration_number: values.registration_number,
                make: values.make,
                model: values.model,
                year: parseInt(values.year) || new Date().getFullYear(),
                status: values.status,
                current_mileage: parseFloat(values.current_mileage) || 0,
            }

            if (vehicle) {
                // Update
                const { error } = await supabase
                    .from("fleet_vehicles")
                    .update(dataToSave)
                    .eq("id", vehicle.id)

                if (error) throw error
                toast.success("Vehicle updated successfully")
            } else {
                // Create
                const { error } = await supabase
                    .from("fleet_vehicles")
                    .insert(dataToSave)

                if (error) throw error
                toast.success("Vehicle created successfully")
            }

            emitSoftRefresh()
            setIsOpen(false)
            onOpenChange?.(false)
            onSuccess?.()
            if (!vehicle) form.reset()
        } catch (error: any) {
            toast.error(error.message || "Failed to save vehicle")
        }
    }

    return (
        <Dialog open={open ?? isOpen} onOpenChange={onOpenChange ?? setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="registration_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Registration Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ABC-1234" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="make"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Make</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Toyota" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Corolla" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Year</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                                <SelectItem value="RETIRED">Retired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="current_mileage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Mileage (km)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">
                                {vehicle ? "Save Changes" : "Create Vehicle"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
