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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRequestLeave, useLeaveTypes, useEmployees } from '@/lib/queries/hr'
import { toast } from 'sonner'

interface LeaveRequestDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LeaveRequestDialog({ open, onOpenChange }: LeaveRequestDialogProps) {
    const { data: employees } = useEmployees()
    const { data: leaveTypes } = useLeaveTypes()
    const requestLeave = useRequestLeave()
    const [loading, setLoading] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            employee_id: formData.get('employee_id') as string,
            leave_type_id: formData.get('leave_type_id') as string,
            from_date: formData.get('from_date') as string,
            to_date: formData.get('to_date') as string,
            reason: formData.get('reason') as string,
        }

        try {
            const result: any = await requestLeave.mutateAsync(data)
            if (result.success) {
                toast.success(result.message || 'Leave request submitted')
                onOpenChange(false)
            } else {
                toast.error(result.message || 'Failed to submit request')
            }
        } catch (error: any) {
            toast.error(error.message || 'Error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Request Leave</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="employee_id">Employee *</Label>
                            <Select name="employee_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.filter(e => e.employment_status === 'ACTIVE').map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.full_name} ({emp.employee_code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="leave_type_id">Leave Type *</Label>
                            <Select name="leave_type_id" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypes?.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.leave_type_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="from_date">From Date *</Label>
                                <Input id="from_date" name="from_date" type="date" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="to_date">To Date *</Label>
                                <Input id="to_date" name="to_date" type="date" required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason *</Label>
                            <Textarea
                                id="reason"
                                name="reason"
                                placeholder="Briefly explain the reason for leave"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
