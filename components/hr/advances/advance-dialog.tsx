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
import { useCreateAdvance, useEmployees } from '@/lib/queries/hr'
import { toast } from 'sonner'

interface AdvanceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AdvanceDialog({ open, onOpenChange }: AdvanceDialogProps) {
    const { data: employees } = useEmployees()
    const createAdvance = useCreateAdvance()
    const [loading, setLoading] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data = {
            employee_id: formData.get('employee_id') as string,
            advance_type: formData.get('advance_type') as 'ADVANCE' | 'LOAN',
            amount: parseFloat(formData.get('amount') as string) || 0,
            reason: formData.get('reason') as string,
            installments: parseInt(formData.get('installments') as string) || 1,
        }

        try {
            const result: any = await createAdvance.mutateAsync(data)
            if (result.success) {
                toast.success(result.message || 'Advance issued successfully')
                onOpenChange(false)
            } else {
                toast.error(result.message || 'Failed to issue advance')
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
                        <DialogTitle>Issue Advance/Loan</DialogTitle>
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="advance_type">Type *</Label>
                                <Select name="advance_type" defaultValue="ADVANCE" required>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADVANCE">Salary Advance</SelectItem>
                                        <SelectItem value="LOAN">Long-term Loan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount (PKR) *</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="installments">Number of Installments *</Label>
                            <Input
                                id="installments"
                                name="installments"
                                type="number"
                                min="1"
                                max="60"
                                defaultValue="1"
                                required
                            />
                            <p className="text-[10px] text-muted-foreground">
                                For Advances, usually 1. For Loans, specify number of months.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason *</Label>
                            <Textarea
                                id="reason"
                                name="reason"
                                placeholder="Briefly explain the reason"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Issue Advance'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
