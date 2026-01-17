'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Eye, Trash2, CreditCard } from 'lucide-react'
import Link from 'next/link'
import type { Customer } from '@/lib/types/database'
import { CustomerDialog } from './customer-dialog'
import { useDeleteCustomer } from '@/lib/queries/customers'
import { toast } from 'sonner'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CustomersTableProps {
    customers: Customer[]
    isLoading: boolean
}

export function CustomersTable({ customers, isLoading }: CustomersTableProps) {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const deleteCustomer = useDeleteCustomer()

    const handleDelete = async () => {
        if (!selectedCustomer) return
        try {
            await deleteCustomer.mutateAsync(selectedCustomer.id)
            toast.success('Customer deactivated successfully')
            setIsDeleteDialogOpen(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete customer')
        }
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[120px]">Code</TableHead>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Credit Limit</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                Loading customers...
                            </TableCell>
                        </TableRow>
                    ) : customers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                No customers found
                            </TableCell>
                        </TableRow>
                    ) : (
                        customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-mono text-xs text-slate-500">
                                    {customer.customer_code}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900">
                                    {customer.name}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-[10px] uppercase">
                                        {customer.customer_type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {customer.phone}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={customer.current_balance > 0 ? "text-red-600 font-bold" : "text-slate-900"}>
                                            PKR {customer.current_balance?.toLocaleString() || '0'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-500">
                                    PKR {customer.credit_limit?.toLocaleString() || '0'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={customer.is_active ? "default" : "secondary"} className={customer.is_active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}>
                                        {customer.is_active ? 'Active' : 'Deactivated'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dashboard/sales/customers/${customer.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedCustomer(customer)
                                                setIsEditDialogOpen(true)
                                            }}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedCustomer(customer)
                                                setIsDeleteDialogOpen(true)
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {selectedCustomer && (
                <>
                    <CustomerDialog
                        open={isEditDialogOpen}
                        onOpenChange={setIsEditDialogOpen}
                        customer={selectedCustomer}
                    />
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will deactivate the customer <strong>{selectedCustomer.name}</strong>.
                                    They will no longer appear in active lists but their history will be preserved.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    Deactivate
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </>
    )
}
