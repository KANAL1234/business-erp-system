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
import { useCreateReceiptVoucher } from '@/lib/queries/customers'
import { toast } from 'sonner'
import type { Customer } from '@/lib/types/database'

interface CustomerPaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: Customer
}

export function CustomerPaymentDialog({ open, onOpenChange, customer }: CustomerPaymentDialogProps) {
    const createPayment = useCreateReceiptVoucher()
    const [loading, setLoading] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const amount = parseFloat(formData.get('amount') as string)

        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount')
            setLoading(false)
            return
        }

        const data = {
            customer_id: customer.id,
            amount: amount,
            payment_method: formData.get('payment_method') as 'CASH' | 'CHEQUE' | 'BANK_TRANSFER',
            receipt_date: new Date().toISOString().split('T')[0],
            notes: formData.get('notes') as string || `Payment received from ${customer.name}`,
        }

        try {
            await createPayment.mutateAsync(data)
            toast.success('Payment recorded and balance updated')
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to record payment')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Receive Payment - {customer.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-slate-50 p-3 rounded-md border text-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-500">Current Balance:</span>
                                <span className="font-bold text-slate-900 font-mono">
                                    PKR {customer.current_balance?.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount Received (PKR)</Label>
                            <Input
                                id="amount"
                                name="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                max={customer.current_balance}
                                required
                                autoFocus
                            />
                            <p className="text-[10px] text-slate-500">
                                Enter the partial or full amount paid by the customer.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="payment_method">Payment Method</Label>
                            <Select name="payment_method" defaultValue="CASH">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes/Reference</Label>
                            <Input
                                id="notes"
                                name="notes"
                                placeholder="Optional reference or memo"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                            {loading ? 'Processing...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
