'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
    useCreateFuelAllowance,
    useUpdateFuelAllowance,
    useIssueFuelAllowance,
    useReturnFuelAllowanceCash
} from '@/lib/queries/fleet-workflow'
import { Fuel, Banknote, ArrowDownLeft, CheckCircle, AlertCircle } from 'lucide-react'
import type { FleetFuelAllowance } from '@/types/fleet'

const formSchema = z.object({
    trip_id: z.string().min(1, 'Trip is required'),
    driver_id: z.string().min(1, 'Driver is required'),
    vehicle_id: z.string().min(1, 'Vehicle is required'),
    allowance_date: z.string().min(1, 'Date is required'),
    budgeted_fuel_liters: z.string().min(1, 'Budgeted liters is required'),
    budgeted_fuel_cost: z.string().min(1, 'Budgeted cost is required'),
    notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface FuelAllowanceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    allowance?: FleetFuelAllowance | null
    tripId?: string
    driverId?: string
    vehicleId?: string
}

export function FuelAllowanceDialog({
    open,
    onOpenChange,
    allowance,
    tripId,
    driverId,
    vehicleId,
}: FuelAllowanceDialogProps) {
    const createAllowance = useCreateFuelAllowance()
    const updateAllowance = useUpdateFuelAllowance()
    const issueCash = useIssueFuelAllowance()
    const returnCash = useReturnFuelAllowanceCash()
    const [returnAmount, setReturnAmount] = useState('')

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            trip_id: tripId || '',
            driver_id: driverId || '',
            vehicle_id: vehicleId || '',
            allowance_date: new Date().toISOString().split('T')[0],
            budgeted_fuel_liters: '',
            budgeted_fuel_cost: '',
            notes: '',
        },
    })

    useEffect(() => {
        if (allowance) {
            form.reset({
                trip_id: allowance.trip_id,
                driver_id: allowance.driver_id,
                vehicle_id: allowance.vehicle_id,
                allowance_date: allowance.allowance_date,
                budgeted_fuel_liters: allowance.budgeted_fuel_liters.toString(),
                budgeted_fuel_cost: allowance.budgeted_fuel_cost.toString(),
                notes: allowance.notes || '',
            })
        } else {
            form.reset({
                trip_id: tripId || '',
                driver_id: driverId || '',
                vehicle_id: vehicleId || '',
                allowance_date: new Date().toISOString().split('T')[0],
                budgeted_fuel_liters: '',
                budgeted_fuel_cost: '',
                notes: '',
            })
        }
        setReturnAmount('')
    }, [allowance, tripId, driverId, vehicleId, form, open])

    const watchedLiters = form.watch('budgeted_fuel_liters')
    const watchedCost = form.watch('budgeted_fuel_cost')

    const costPerLiter = watchedLiters && watchedCost && parseFloat(watchedLiters) > 0
        ? parseFloat(watchedCost) / parseFloat(watchedLiters)
        : 0

    // Calculate cash status
    const cashIssued = allowance?.cash_issued || 0
    const actualSpent = allowance?.actual_fuel_cost || 0
    const cashReturned = allowance?.cash_returned || 0
    const outstanding = cashIssued - actualSpent - cashReturned
    const isCashIssued = cashIssued > 0

    const onSubmit = async (values: FormValues) => {
        const data = {
            ...values,
            budgeted_fuel_liters: parseFloat(values.budgeted_fuel_liters),
            budgeted_fuel_cost: parseFloat(values.budgeted_fuel_cost),
            actual_fuel_liters: 0,
            actual_fuel_cost: 0,
            status: 'ACTIVE' as const,
        }

        if (allowance) {
            await updateAllowance.mutateAsync({
                id: allowance.id,
                ...data,
            })
        } else {
            await createAllowance.mutateAsync(data)
        }

        form.reset()
        onOpenChange(false)
    }

    const handleIssueCash = async () => {
        if (allowance) {
            await issueCash.mutateAsync(allowance.id)
        }
    }

    const handleReturnCash = async () => {
        if (allowance && returnAmount) {
            await returnCash.mutateAsync({
                allowanceId: allowance.id,
                returnAmount: parseFloat(returnAmount),
            })
            setReturnAmount('')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Fuel className="h-5 w-5 text-primary" />
                        {allowance ? 'Manage Fuel Allowance' : 'Set Fuel Allowance'}
                    </DialogTitle>
                    <DialogDescription>
                        {allowance ? 'Manage cash issuance and returns for this fuel allowance' : 'Set daily fuel budget for this trip'}
                    </DialogDescription>
                </DialogHeader>

                {/* Cash Status Section - Only show for existing allowances */}
                {allowance && (
                    <>
                        <div className="grid grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Budgeted</p>
                                <p className="text-lg font-semibold">Rs. {allowance.budgeted_fuel_cost.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Cash Issued</p>
                                <p className="text-lg font-semibold text-blue-600">Rs. {cashIssued.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Actual Spent</p>
                                <p className="text-lg font-semibold text-orange-600">Rs. {actualSpent.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">Outstanding</p>
                                <p className={`text-lg font-semibold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    Rs. {outstanding.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Issue Cash Button */}
                        {!isCashIssued && (
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                                <div className="flex items-center gap-3">
                                    <Banknote className="h-8 w-8 text-blue-600" />
                                    <div>
                                        <p className="font-medium">Issue Cash to Driver</p>
                                        <p className="text-sm text-muted-foreground">
                                            Give Rs. {allowance.budgeted_fuel_cost.toLocaleString()} to driver for fuel
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleIssueCash}
                                    disabled={issueCash.isPending}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {issueCash.isPending ? 'Issuing...' : 'Issue Cash'}
                                </Button>
                            </div>
                        )}

                        {/* Cash Issued Confirmation */}
                        {isCashIssued && outstanding <= 0 && (
                            <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 border-green-200">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-800">Allowance Settled</p>
                                    <p className="text-sm text-green-600">
                                        All cash has been accounted for
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Return Cash Section */}
                        {isCashIssued && outstanding > 0 && (
                            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowDownLeft className="h-5 w-5 text-amber-600" />
                                    <p className="font-medium text-amber-800">Return Cash from Driver</p>
                                </div>
                                <p className="text-sm text-amber-700 mb-3">
                                    Driver has Rs. {outstanding.toLocaleString()} outstanding to return
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Enter return amount"
                                        value={returnAmount}
                                        onChange={(e) => setReturnAmount(e.target.value)}
                                        max={outstanding}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleReturnCash}
                                        disabled={returnCash.isPending || !returnAmount || parseFloat(returnAmount) <= 0}
                                        variant="outline"
                                        className="border-amber-300 text-amber-700 hover:bg-amber-100"
                                    >
                                        {returnCash.isPending ? 'Recording...' : 'Record Return'}
                                    </Button>
                                    <Button
                                        onClick={() => setReturnAmount(outstanding.toString())}
                                        variant="ghost"
                                        size="sm"
                                        className="text-amber-600"
                                    >
                                        Full Amount
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Warning if overspent */}
                        {outstanding < 0 && (
                            <div className="flex items-center gap-3 p-4 border rounded-lg bg-red-50 border-red-200">
                                <AlertCircle className="h-6 w-6 text-red-600" />
                                <div>
                                    <p className="font-medium text-red-800">Overspent</p>
                                    <p className="text-sm text-red-600">
                                        Driver spent Rs. {Math.abs(outstanding).toLocaleString()} more than issued
                                    </p>
                                </div>
                            </div>
                        )}

                        <Separator />
                    </>
                )}

                {/* Original Form - Only show for new allowances or collapsed for existing */}
                {!allowance && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="allowance_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Allowance Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="budgeted_fuel_liters"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Budgeted Fuel (Liters)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="budgeted_fuel_cost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Budgeted Cost (Rs.)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {costPerLiter > 0 && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                                    <p className="text-sm text-primary">
                                        <strong>Cost per Liter:</strong> Rs. {costPerLiter.toFixed(2)}
                                    </p>
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add any additional notes..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createAllowance.isPending || updateAllowance.isPending}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {createAllowance.isPending || updateAllowance.isPending
                                        ? 'Saving...'
                                        : 'Set Allowance'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}

                {/* Close button for existing allowances */}
                {allowance && (
                    <div className="flex justify-end pt-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
