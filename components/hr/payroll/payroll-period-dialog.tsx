'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreatePayrollPeriod } from '@/lib/queries/hr'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth } from 'date-fns'

interface PayrollPeriodDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function PayrollPeriodDialog({ open, onOpenChange }: PayrollPeriodDialogProps) {
    const createPeriod = useCreatePayrollPeriod()
    const [loading, setLoading] = useState(false)

    // Default to current month
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [name, setName] = useState(format(new Date(), 'MMMM yyyy'))

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        try {
            await createPeriod.mutateAsync({
                period_name: name,
                start_date: startDate,
                end_date: endDate,
                status: 'DRAFT'
            })
            toast.success('Payroll period created')
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to create period')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Payroll Period</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="period_name">Period Name *</Label>
                            <Input
                                id="period_name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. January 2024"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start_date">Start Date *</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end_date">End Date *</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Period'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
