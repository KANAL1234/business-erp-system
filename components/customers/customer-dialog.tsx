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
import { useCreateCustomer, useUpdateCustomer } from '@/lib/queries/customers'
import { toast } from 'sonner'
import type { Customer } from '@/lib/types/database'

interface CustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer?: Customer
}

export function CustomerDialog({ open, onOpenChange, customer }: CustomerDialogProps) {
    const isEditing = !!customer
    const createCustomer = useCreateCustomer()
    const updateCustomer = useUpdateCustomer()
    const [loading, setLoading] = useState(false)

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data: any = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            customer_type: formData.get('customer_type') as 'INDIVIDUAL' | 'BUSINESS',
            credit_limit: parseFloat(formData.get('credit_limit') as string) || 0,
            credit_days: parseInt(formData.get('credit_days') as string) || 0,
        }

        try {
            if (isEditing) {
                await updateCustomer.mutateAsync({ id: customer!.id, ...data })
                toast.success('Customer updated successfully')
            } else {
                await createCustomer.mutateAsync(data)
                toast.success('Customer created successfully')
            }
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to save customer')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Business/Customer Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={customer?.name}
                                placeholder="Enter name"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                name="phone"
                                defaultValue={customer?.phone}
                                placeholder="03xx-xxxxxxx"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="customer_type">Customer Type</Label>
                            <Select name="customer_type" defaultValue={customer?.customer_type || 'INDIVIDUAL'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                    <SelectItem value="BUSINESS">Business</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="credit_limit">Credit Limit (PKR)</Label>
                                <Input
                                    id="credit_limit"
                                    name="credit_limit"
                                    type="number"
                                    defaultValue={customer?.credit_limit || 0}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="credit_days">Credit Days</Label>
                                <Input
                                    id="credit_days"
                                    name="credit_days"
                                    type="number"
                                    defaultValue={customer?.credit_days || 0}
                                    placeholder="30"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Customer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
