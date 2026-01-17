'use client'

import { useState, useEffect } from 'react'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useCreateCashDeposit } from '@/lib/queries/fleet-workflow'
import { useBankAccounts } from '@/lib/queries/bank-accounts'
import { createClient } from '@/lib/supabase/client'
import { DollarSign, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const formSchema = z.object({
    trip_id: z.string().min(1, 'Trip is required'),
    driver_id: z.string().min(1, 'Driver is required'),
    vehicle_id: z.string().min(1, 'Vehicle is required'),
    expected_cash: z.string().min(1, 'Expected cash is required'),
    actual_cash: z.string().min(1, 'Actual cash is required'),
    deposit_date: z.string().min(1, 'Deposit date is required'),
    deposit_time: z.string().min(1, 'Deposit time is required'),
    bank_account_id: z.string().optional(),
    deposit_slip_number: z.string().optional(),
    notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CashDepositDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tripId?: string
    driverId?: string
    vehicleId?: string
    expectedCash?: number
}

export function CashDepositDialog({
    open,
    onOpenChange,
    tripId,
    driverId,
    vehicleId,
    expectedCash,
}: CashDepositDialogProps) {
    const [userId, setUserId] = useState<string>('')
    const createDeposit = useCreateCashDeposit()
    const { data: bankAccounts } = useBankAccounts()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            trip_id: tripId || '',
            driver_id: driverId || '',
            vehicle_id: vehicleId || '',
            expected_cash: expectedCash?.toString() || '',
            actual_cash: '',
            deposit_date: new Date().toISOString().split('T')[0],
            deposit_time: new Date().toTimeString().slice(0, 5),
            bank_account_id: '',
            deposit_slip_number: '',
            notes: '',
        },
    })

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient()
            const { data } = await supabase.auth.getUser()
            if (data.user) {
                setUserId(data.user.id)
            }
        }
        getUser()
    }, [])

    useEffect(() => {
        if (tripId) form.setValue('trip_id', tripId)
        if (driverId) form.setValue('driver_id', driverId)
        if (vehicleId) form.setValue('vehicle_id', vehicleId)
        if (expectedCash) form.setValue('expected_cash', expectedCash.toString())
    }, [tripId, driverId, vehicleId, expectedCash, form])

    const watchedExpected = form.watch('expected_cash')
    const watchedActual = form.watch('actual_cash')

    const variance = watchedActual && watchedExpected
        ? parseFloat(watchedActual) - parseFloat(watchedExpected)
        : 0

    const variancePercentage = watchedExpected && parseFloat(watchedExpected) > 0
        ? (variance / parseFloat(watchedExpected)) * 100
        : 0

    const onSubmit = async (values: FormValues) => {
        await createDeposit.mutateAsync({
            ...values,
            expected_cash: parseFloat(values.expected_cash),
            actual_cash: parseFloat(values.actual_cash),
            submitted_by: userId,
            status: 'PENDING',
        })
        form.reset()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Record Cash Deposit
                    </DialogTitle>
                    <DialogDescription>
                        Record end-of-day cash deposit from fleet driver
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="expected_cash"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expected Cash (Rs.)</FormLabel>
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
                                name="actual_cash"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Actual Cash (Rs.)</FormLabel>
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

                        {variance !== 0 && (
                            <Alert variant={Math.abs(variancePercentage) > 5 ? 'destructive' : 'default'}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Variance Detected:</strong> Rs. {variance.toFixed(2)} (
                                    {variancePercentage > 0 ? '+' : ''}
                                    {variancePercentage.toFixed(2)}%)
                                    {Math.abs(variancePercentage) > 5 && (
                                        <span className="block mt-1 text-sm">
                                            This variance exceeds the 5% threshold and will trigger an alert.
                                        </span>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="deposit_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Deposit Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="deposit_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Deposit Time</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="bank_account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bank Account (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select bank account" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {bankAccounts?.map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.account_name} - {account.account_number}
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
                            name="deposit_slip_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Deposit Slip Number (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter slip number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                disabled={createDeposit.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {createDeposit.isPending ? 'Recording...' : 'Record Deposit'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
