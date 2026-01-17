'use client'

import { useState } from 'react'
import { useCreateCustomer } from '@/lib/queries/customers'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'

type Props = {
    onCustomerCreated?: (customer: any) => void
}

export function QuickAddCustomer({ onCustomerCreated }: Props) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL')
    const [creditLimit, setCreditLimit] = useState('')

    const createCustomer = useCreateCustomer()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name || !phone) {
            toast.error('Error', {
                description: 'Name and phone are required',
            })
            return
        }

        try {
            const customer = await createCustomer.mutateAsync({
                name,
                phone,
                customer_type: customerType,
                credit_limit: Number(creditLimit) || 0,
            })

            toast.success('Success', {
                description: 'Customer created successfully',
            })

            if (onCustomerCreated) {
                onCustomerCreated(customer)
            }

            // Reset form
            setName('')
            setPhone('')
            setCustomerType('INDIVIDUAL')
            setCreditLimit('')
            setOpen(false)
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    New Customer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Quick Add Customer</DialogTitle>
                        <DialogDescription>
                            Add a new customer quickly for credit sales
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Customer name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="03XX-XXXXXXX"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Customer Type</Label>
                            <Select
                                value={customerType}
                                onValueChange={(value: any) => setCustomerType(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                    <SelectItem value="BUSINESS">Business</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="credit_limit">Credit Limit</Label>
                            <Input
                                id="credit_limit"
                                type="number"
                                value={creditLimit}
                                onChange={(e) => setCreditLimit(e.target.value)}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500">
                                Leave 0 for cash-only customers
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createCustomer.isPending}>
                            {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
