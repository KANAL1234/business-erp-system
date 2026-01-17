'use client'

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
import { Pencil, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { emitSoftRefresh } from '@/lib/soft-refresh'

export function VendorsTable({ vendors, isLoading }: { vendors: any[], isLoading: boolean }) {
    const [deletingVendor, setDeletingVendor] = useState<any>(null)
    const supabase = createClient()
    const handleDelete = async () => {
        if (!deletingVendor) return

        const { error } = await supabase
            .from('vendors')
            .delete()
            .eq('id', deletingVendor.id)

        if (error) {
            toast.error('Failed to delete vendor')
        } else {
            toast.success('Vendor deleted successfully')
            emitSoftRefresh()
        }
        setDeletingVendor(null)
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                Loading vendors...
                            </TableCell>
                        </TableRow>
                    ) : vendors.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                No vendors found. Add your first vendor!
                            </TableCell>
                        </TableRow>
                    ) : (
                        vendors.map((vendor) => (
                            <TableRow key={vendor.id}>
                                <TableCell className="font-medium text-xs">{vendor.code || '-'}</TableCell>
                                <TableCell className="font-medium">{vendor.name}</TableCell>
                                <TableCell>{vendor.contact_person || '-'}</TableCell>
                                <TableCell>{vendor.email || '-'}</TableCell>
                                <TableCell>{vendor.phone || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                                        {vendor.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dashboard/vendors/${vendor.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dashboard/vendors/${vendor.id}`}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setDeletingVendor(vendor)}
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

            <AlertDialog open={!!deletingVendor} onOpenChange={(open) => !open && setDeletingVendor(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the vendor <strong>{deletingVendor?.name}</strong> and remove all associated data. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-medium" onClick={handleDelete}>
                            Delete Vendor
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
