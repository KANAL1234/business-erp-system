'use client'

import { useState, useEffect } from 'react'
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
import { useCreateEmployee, useUpdateEmployee, useDepartments } from '@/lib/queries/hr'
import { toast } from 'sonner'
import type { Employee } from '@/lib/types/hr'
import { Truck } from 'lucide-react'

// Predefined designations
const DESIGNATIONS = [
    'Manager',
    'Accountant',
    'Sales Executive',
    'Warehouse Staff',
    'Fleet Driver',
    'Delivery Person',
    'Admin',
    'Other'
]

interface EmployeeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    employee?: Employee
}

export function EmployeeDialog({ open, onOpenChange, employee }: EmployeeDialogProps) {
    const isEditing = !!employee
    const createEmployee = useCreateEmployee()
    const updateEmployee = useUpdateEmployee()
    const { data: departments } = useDepartments()
    const [loading, setLoading] = useState(false)
    const [designation, setDesignation] = useState(employee?.designation || '')

    // Reset designation when dialog opens with different employee
    useEffect(() => {
        setDesignation(employee?.designation || '')
    }, [employee])

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const data: any = {
            employee_code: formData.get('employee_code') as string,
            full_name: formData.get('full_name') as string,
            cnic: formData.get('cnic') as string,
            designation: designation, // Use state value
            department_id: (formData.get('department_id') === 'none' || !formData.get('department_id')) ? null : formData.get('department_id') as string,
            basic_salary: parseFloat(formData.get('basic_salary') as string) || 0,
            joining_date: formData.get('joining_date') as string,
            commission_rate: parseFloat(formData.get('commission_rate') as string) || 0,
            commission_type: formData.get('commission_type') as string || 'SALES_VALUE',
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
            employment_status: formData.get('employment_status') as string || 'ACTIVE',
        }

        // Add license fields if Fleet Driver
        if (designation === 'Fleet Driver') {
            data.license_number = formData.get('license_number') as string || null
            data.license_expiry = formData.get('license_expiry') as string || null
        }

        try {
            if (isEditing) {
                await updateEmployee.mutateAsync({ id: employee!.id, ...data })
                toast.success('Employee updated successfully')
            } else {
                await createEmployee.mutateAsync(data)
                toast.success('Employee created successfully')
            }
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to save employee')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? `Edit ${employee?.full_name}` : 'Add New Employee'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="employee_code">Employee Code *</Label>
                                <Input
                                    id="employee_code"
                                    name="employee_code"
                                    defaultValue={employee?.employee_code}
                                    placeholder="EMP001"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    name="full_name"
                                    defaultValue={employee?.full_name}
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cnic">CNIC *</Label>
                                <Input
                                    id="cnic"
                                    name="cnic"
                                    defaultValue={employee?.cnic}
                                    placeholder="12345-1234567-1"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="joining_date">Joining Date *</Label>
                                <Input
                                    id="joining_date"
                                    name="joining_date"
                                    type="date"
                                    defaultValue={employee?.joining_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="department_id">Department</Label>
                                <Select name="department_id" defaultValue={employee?.department_id || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Department</SelectItem>
                                        {departments?.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="designation">Designation *</Label>
                                <Select value={designation} onValueChange={setDesignation}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DESIGNATIONS.map((d) => (
                                            <SelectItem key={d} value={d}>
                                                {d === 'Fleet Driver' && <Truck className="w-4 h-4 mr-2 inline" />}
                                                {d}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Fleet Driver License Fields */}
                        {designation === 'Fleet Driver' && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="col-span-2 flex items-center gap-2 text-primary font-medium">
                                    <Truck className="w-4 h-4" />
                                    Driver Information
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="license_number">License Number</Label>
                                    <Input
                                        id="license_number"
                                        name="license_number"
                                        defaultValue={(employee as any)?.license_number || ''}
                                        placeholder="DL-12345678"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="license_expiry">License Expiry</Label>
                                    <Input
                                        id="license_expiry"
                                        name="license_expiry"
                                        type="date"
                                        defaultValue={(employee as any)?.license_expiry?.split('T')[0] || ''}
                                    />
                                </div>
                                <p className="col-span-2 text-xs text-primary">
                                    This employee will be automatically registered as a Fleet Driver and can use the mobile app.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="basic_salary">Basic Salary (PKR) *</Label>
                                <Input
                                    id="basic_salary"
                                    name="basic_salary"
                                    type="number"
                                    defaultValue={employee?.basic_salary || 0}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="employment_status">Status</Label>
                                <Select name="employment_status" defaultValue={employee?.employment_status || 'ACTIVE'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="PROBATION">Probation</SelectItem>
                                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                                <Input
                                    id="commission_rate"
                                    name="commission_rate"
                                    type="number"
                                    step="0.01"
                                    defaultValue={employee?.commission_rate || 0}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="commission_type">Commission Type</Label>
                                <Select name="commission_type" defaultValue={employee?.commission_type || 'SALES_VALUE'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SALES_VALUE">Sales Value</SelectItem>
                                        <SelectItem value="PROFIT_MARGIN">Profit Margin</SelectItem>
                                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    defaultValue={employee?.phone}
                                    placeholder="03xx-xxxxxxx"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={employee?.email}
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Employee'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
