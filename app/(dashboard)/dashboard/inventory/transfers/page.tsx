'use client'

import { useMemo, useState } from 'react'
import { useLocation } from '@/components/providers/location-provider'
import { useStockTransfers, useUpdateTransferStatus, useDeleteTransfer } from '@/lib/queries/stock-transfers'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, ArrowRight, Check, X, Trash2, Eye, Send, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ListSortControls } from '@/components/list-sort-controls'

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

export default function StockTransfersPage() {
    return (
        <PermissionGuard permission="inventory.stock.transfer">
            <StockTransfersContent />
        </PermissionGuard>
    )
}

function StockTransfersContent() {
    const { currentLocationId } = useLocation()
    const { data: allTransfersData, isLoading } = useStockTransfers()
    const updateStatus = useUpdateTransferStatus()
    const [sortBy, setSortBy] = useState('transfer_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Filter transfers based on location selection
    // Show transfer if it corresponds to FROM or TO the selected location
    const allTransfers = allTransfersData?.filter(transfer => {
        if (!currentLocationId || currentLocationId === '') return true
        return (
            transfer.from_location_id === currentLocationId ||
            transfer.to_location_id === currentLocationId
        )
    })
    const deleteTransfer = useDeleteTransfer()
    const [itemToDelete, setItemToDelete] = useState<{ id: string, number: string } | null>(null)

    const getStatusColor = (status: string) => {
        const colors = {
            DRAFT: 'secondary' as const,
            PENDING_APPROVAL: 'default' as const,
            APPROVED: 'default' as const,
            IN_TRANSIT: 'default' as const,
            COMPLETED: 'default' as const,
            CANCELLED: 'destructive' as const,
        }
        return colors[status as keyof typeof colors] || 'secondary'
    }

    const formatDate = (value: string | null | undefined, pattern: string) => {
        if (!value) return '-'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '-'
        return format(date, pattern)
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        console.log(`🎯 UI: handleStatusChange called - ID: ${id}, New Status: ${newStatus}`)
        try {
            await updateStatus.mutateAsync({ id, status: newStatus })
            console.log(`✅ UI: Status change successful`)
            toast.success('Success', {
                description: `Transfer ${newStatus.toLowerCase()}`,
            })
        } catch (error: any) {
            console.error(`❌ UI: Status change failed:`, error)
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    const handleDelete = (id: string, transferNumber: string) => {
        setItemToDelete({ id, number: transferNumber })
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return

        try {
            await deleteTransfer.mutateAsync(itemToDelete.id)
            toast.success('Success', {
                description: 'Transfer deleted',
            })
            setItemToDelete(null)
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                <p className="text-slate-500 font-medium">Loading transfers...</p>
            </div>
        )
    }

    const sortTransfers = useMemo(() => {
        const sorters: Record<string, (row: any) => string | number> = {
            transfer_date: (row) => new Date(row.transfer_date || row.created_at).getTime(),
            transfer_number: (row) => String(row.transfer_number || ''),
            status: (row) => String(row.status || ''),
            items: (row) => Number(row.items_count || row.transfer_items?.length || 0),
        }
        const getValue = sorters[sortBy] || sorters.transfer_date
        return (list?: any[]) => {
            const data = list ? [...list] : []
            data.sort((a, b) => {
                const av = getValue(a)
                const bv = getValue(b)
                if (av < bv) return sortOrder === 'asc' ? -1 : 1
                if (av > bv) return sortOrder === 'asc' ? 1 : -1
                return 0
            })
            return data
        }
    }, [sortBy, sortOrder])

    const draftTransfers = sortTransfers(allTransfers?.filter(t => t.status === 'DRAFT'))
    const pendingTransfers = sortTransfers(allTransfers?.filter(t => t.status === 'PENDING_APPROVAL'))
    const inProgressTransfers = sortTransfers(allTransfers?.filter(t => ['APPROVED', 'IN_TRANSIT'].includes(t.status)))
    const completedTransfers = sortTransfers(allTransfers?.filter(t => t.status === 'COMPLETED'))
    const sortedAllTransfers = sortTransfers(allTransfers)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stock Transfers</h1>
                    <p className="text-slate-500">
                        {currentLocationId
                            ? 'Showing transfers for selected location'
                            : 'Manage movement of goods between locations (all locations)'}
                    </p>
                </div>
                <Link href="/dashboard/inventory/transfers/new">
                    <Button className="w-full md:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        New Transfer
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
                <div className="flex justify-end">
                    <ListSortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={setSortBy}
                        onSortOrderChange={setSortOrder}
                        options={[
                            { value: 'transfer_date', label: 'Date Added' },
                            { value: 'transfer_number', label: 'Transfer #' },
                            { value: 'items', label: 'Items' },
                            { value: 'status', label: 'Status' },
                        ]}
                    />
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-lg border">
                    <TabsList className="bg-transparent">
                        <TabsTrigger value="all" className="data-[state=active]:bg-slate-100">All ({allTransfers?.length || 0})</TabsTrigger>
                        <TabsTrigger value="draft" className="data-[state=active]:bg-slate-100">Draft ({draftTransfers?.length || 0})</TabsTrigger>
                        <TabsTrigger value="pending" className="data-[state=active]:bg-slate-100">Pending ({pendingTransfers?.length || 0})</TabsTrigger>
                        <TabsTrigger value="in-progress" className="data-[state=active]:bg-slate-100">In Progress ({inProgressTransfers?.length || 0})</TabsTrigger>
                        <TabsTrigger value="completed" className="data-[state=active]:bg-slate-100">Completed ({completedTransfers?.length || 0})</TabsTrigger>
                    </TabsList>
                </div>

                {['all', 'draft', 'pending', 'in-progress', 'completed'].map(tab => {
                    const transfers =
                        tab === 'all' ? sortedAllTransfers :
                            tab === 'draft' ? draftTransfers :
                                tab === 'pending' ? pendingTransfers :
                                    tab === 'in-progress' ? inProgressTransfers :
                                        completedTransfers

                    return (
                        <TabsContent key={tab} value={tab} className="mt-0">
                            <Card>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Transfer #</TableHead>
                                                    <TableHead>From</TableHead>
                                                    <TableHead></TableHead>
                                                    <TableHead>To</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Items</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transfers?.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                                            <p className="font-medium">No transfers found in this category</p>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    transfers?.map((transfer) => (
                                                        <TableRow key={transfer.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <TableCell className="font-bold text-slate-900">
                                                                {transfer.transfer_number}
                                                            </TableCell>
                                                            <TableCell className="font-medium">{transfer.from_location?.name || 'Unknown'}</TableCell>
                                                            <TableCell className="text-slate-400">
                                                                <ArrowRight className="h-4 w-4" />
                                                            </TableCell>
                                                            <TableCell className="font-medium">{transfer.to_location?.name || 'Unknown'}</TableCell>
                                                            <TableCell className="text-slate-600">
                                                                {formatDate(transfer.transfer_date, 'MMM dd, yyyy')}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="font-normal">
                                                                    {transfer.stock_transfer_items?.length || 0} Products
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={getStatusColor(transfer.status)} className="rounded-full px-2">
                                                                    {transfer.status.replace('_', ' ')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <Link href={`/dashboard/inventory/transfers/${transfer.id}`}>
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View
                                                                        </Link>
                                                                    </Button>

                                                                    {transfer.status === 'DRAFT' && (
                                                                        <>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleStatusChange(transfer.id, 'PENDING_APPROVAL')}
                                                                            >
                                                                                <Send className="mr-2 h-4 w-4" />
                                                                                Submit
                                                                            </Button>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => handleDelete(transfer.id, transfer.transfer_number)}
                                                                            >
                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                Delete
                                                                            </Button>
                                                                        </>
                                                                    )}

                                                                    {transfer.status === 'PENDING_APPROVAL' && (
                                                                        <>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleStatusChange(transfer.id, 'APPROVED')}
                                                                            >
                                                                                <Check className="mr-2 h-4 w-4" />
                                                                                Approve
                                                                            </Button>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => handleStatusChange(transfer.id, 'CANCELLED')}
                                                                            >
                                                                                <X className="mr-2 h-4 w-4" />
                                                                                Cancel
                                                                            </Button>
                                                                        </>
                                                                    )}

                                                                    {transfer.status === 'APPROVED' && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleStatusChange(transfer.id, 'COMPLETED')}
                                                                        >
                                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                                            Complete
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transfer?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete transfer <span className="font-medium text-slate-900">{itemToDelete?.number}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Transfer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
