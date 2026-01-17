'use client'

import { useState, useEffect, useMemo } from "react"
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
import { FleetDriver } from "@/types/fleet"
import { emitSoftRefresh } from "@/lib/soft-refresh"

const formSchema = z.object({
    employee_id: z.string().min(1, "Employee is required"),
    license_number: z.string().min(1, "License number is required"),
    license_expiry: z.string().min(1, "License expiry is required"),
    status: z.enum(["ACTIVE", "SUSPENDED", "ON_LEAVE"]),
})

interface DriverDialogProps {
    driver?: FleetDriver
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onSuccess?: () => void
}

export function DriverDialog({ driver, trigger, open, onOpenChange, onSuccess }: DriverDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [employees, setEmployees] = useState<{ id: string, full_name: string }[]>([])
    const supabase = useMemo(() => createClient(), [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            employee_id: "",
            license_number: "",
            license_expiry: "",
            status: "ACTIVE",
        },
    })

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                // Fetch active employees
                const { data, error } = await supabase
                    .from("employees")
                    .select("id, full_name")
                    .eq("employment_status", "ACTIVE")
                    .order("full_name")

                if (error) throw error

                // If no active employees, maybe try fetching all to see if any exist
                if (!data || data.length === 0) {
                    const { data: allData } = await supabase
                        .from("employees")
                        .select("id, full_name")
                        .limit(50)
                    if (allData) setEmployees(allData)
                } else {
                    setEmployees(data)
                }
            } catch (err: any) {
                console.error("Error fetching employees:", err)
                toast.error("Failed to load employees list")
            }
        }
        fetchEmployees()
    }, [supabase])

    useEffect(() => {
        if (driver) {
            form.reset({
                employee_id: driver.employee_id,
                license_number: driver.license_number,
                license_expiry: driver.license_expiry,
                status: driver.status,
            })
        } else {
            form.reset({
                employee_id: "",
                license_number: "",
                license_expiry: "",
                status: "ACTIVE",
            })
        }
    }, [driver, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (driver) {
                const { error } = await supabase
                    .from("fleet_drivers")
                    .update(values)
                    .eq("id", driver.id)

                if (error) throw error
                toast.success("Driver updated successfully")
            } else {
                const { error } = await supabase
                    .from("fleet_drivers")
                    .insert(values)

                if (error) throw error
                toast.success("Driver added successfully")
            }

            emitSoftRefresh()
            setIsOpen(false)
            onOpenChange?.(false)
            onSuccess?.()
            if (!driver) form.reset()
        } catch (error: any) {
            toast.error(error.message || "Failed to save driver")
        }
    }

    return (
        <Dialog open={open ?? isOpen} onOpenChange={onOpenChange ?? setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{driver ? "Edit Driver" : "Add Driver"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="employee_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Employee</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!driver}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select employee" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    No active employees found
                                                </SelectItem>
                                            ) : (
                                                employees.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.full_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="license_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>License Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="LIC-12345" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="license_expiry"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>License Expiry</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
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
                                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">
                                {driver ? "Save Changes" : "Add Driver"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
