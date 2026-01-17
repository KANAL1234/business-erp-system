'use client'

import { useMemo, useState } from 'react'
import { useStockAdjustments, useSubmitAdjustment, useApproveAdjustment, useDeleteAdjustment } from '@/lib/queries/stock-adjustments'
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
import { Plus, Check, X, Trash2, Settings2, Send, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ListSortControls } from '@/components/list-sort-controls'

import { useLocation } from '@/components/providers/location-provider'

// ... imports remain the same

export default function StockAdjustmentsPage() {
    return (
        <PermissionGuard permission="inventory.stock.adjust">
            <StockAdjustmentsContent />
        </PermissionGuard>
    )
}

function StockAdjustmentsContent() {
    const { currentLocationId } = useLocation()
    const { data: allAdjustmentsData, isLoading } = useStockAdjustments()
    const submitAdjustment = useSubmitAdjustment()
    const approveAdjustment = useApproveAdjustment()
    const deleteAdjustment = useDeleteAdjustment()
    const [sortBy, setSortBy] = useState('adjustment_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Filter adjustments based on location selection
    const allAdjustments = allAdjustmentsData?.filter(adjustment => {
        if (!currentLocationId || currentLocationId === '') return true
        return adjustment.location_id === currentLocationId
    })

    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [selectedAdjustment, setSelectedAdjustment] = useState<{ id: string, number: string } | null>(null)
    const [adjustmentToDelete, setAdjustmentToDelete] = useState<{ id: string, number: string } | null>(null)

    const getStatusColor = (status: string) => {
        const colors = {
            DRAFT: 'secondary' as const,
            PENDING_APPROVAL: 'default' as const,
            APPROVED: 'default' as const,
        }
        return colors[status as keyof typeof colors] || 'secondary'
    }

    const getTypeLabel = (type: string) => {
        const labels = {
            CYCLE_COUNT: 'Cycle Count',
            DAMAGE: 'Damage',
            EXPIRY: 'Expiry',
            LOSS: 'Loss',
            FOUND: 'Found',
            OTHER: 'Other',
        }
        return labels[type as keyof typeof labels] || type
    }

    const formatDate = (value: string | null | undefined, pattern: string) => {
        if (!value) return '-'
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return '-'
        return format(date, pattern)
    }

    const handleSubmit = async (id: string, adjustmentNumber: string) => {
        try {
            await submitAdjustment.mutateAsync(id)
            toast.success('Success', {
                description: `Adjustment ${adjustmentNumber} submitted for approval.`,
            })
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    const handleApprove = (id: string, adjustmentNumber: string) => {
        setSelectedAdjustment({ id, number: adjustmentNumber })
        setShowApproveDialog(true)
    }

    const performApproval = async () => {
        if (!selectedAdjustment) return

        console.log('🔄 Starting approval for adjustment:', selectedAdjustment.number)

        try {
            await approveAdjustment.mutateAsync(selectedAdjustment.id)
            console.log('✅ Adjustment approved successfully!')
            toast.success('Success', {
                description: 'Adjustment approved and inventory synced.',
                duration: 5000,
            })
            setShowApproveDialog(false)
            setSelectedAdjustment(null)
        } catch (error: any) {
            console.error('❌ Approval failed:', error)
            toast.error('Error', {
                description: error.message,
                duration: 5000,
            })
        }
    }

    const handleDelete = (id: string, adjustmentNumber: string) => {
        setAdjustmentToDelete({ id, number: adjustmentNumber })
    }

    const confirmDelete = async () => {
        if (!adjustmentToDelete) return

        try {
            await deleteAdjustment.mutateAsync(adjustmentToDelete.id)
            toast.success('Success', {
                description: 'Adjustment deleted',
            })
            setAdjustmentToDelete(null)
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
                <p className="text-slate-500 font-medium">Syncing adjustments...</p>
            </div>
        )
    }

    const sortAdjustments = useMemo(() => {
        const sorters: Record<string, (row: any) => string | number> = {
            adjustment_date: (row) => new Date(row.adjustment_date || row.created_at).getTime(),
            adjustment_number: (row) => String(row.adjustment_number || ''),
            status: (row) => String(row.status || ''),
            type: (row) => String(row.adjustment_type || ''),
        }
        const getValue = sorters[sortBy] || sorters.adjustment_date
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

    const draftAdjustments = sortAdjustments(allAdjustments?.filter(a => a.status === 'DRAFT'))
    const pendingAdjustments = sortAdjustments(allAdjustments?.filter(a => a.status === 'PENDING_APPROVAL'))
    const approvedAdjustments = sortAdjustments(allAdjustments?.filter(a => a.status === 'APPROVED'))
    const sortedAllAdjustments = sortAdjustments(allAdjustments)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stock Adjustments</h1>
                    <p className="text-slate-500">
                        {currentLocationId
                            ? 'Showing adjustments for selected location'
                            : 'Correct inventory levels and record losses (all locations)'}
                    </p>
                </div>
                <Link href="/dashboard/inventory/adjustments/new">
                    <Button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800">
                        <Plus className="mr-2 h-4 w-4" />
                        New Adjustment
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
                            { value: 'adjustment_date', label: 'Date Added' },
                            { value: 'adjustment_number', label: 'Adjustment #' },
                            { value: 'type', label: 'Type' },
                            { value: 'status', label: 'Status' },
                        ]}
                    />
                </div>
                <div className="flex justify-between items-center bg-white p-1 rounded-lg border">
                    <TabsList className="bg-transparent">
                        <TabsTrigger value="all" className="data-[state=active]:bg-slate-100">All ({allAdjustments?.length || 0})</TabsTrigger>
                        <TabsTrigger value="draft" className="data-[state=active]:bg-slate-100">Draft ({draftAdjustments?.length || 0})</TabsTrigger>
                        <TabsTrigger value="pending" className="data-[state=active]:bg-slate-100">Pending ({pendingAdjustments?.length || 0})</TabsTrigger>
                        <TabsTrigger value="approved" className="data-[state=active]:bg-slate-100">Approved ({approvedAdjustments?.length || 0})</TabsTrigger>
                    </TabsList>
                </div>

                {['all', 'draft', 'pending', 'approved'].map(tab => {
                    const adjustments =
                        tab === 'all' ? sortedAllAdjustments :
                            tab === 'draft' ? draftAdjustments :
                                tab === 'pending' ? pendingAdjustments :
                                    approvedAdjustments

                    return (
                        <TabsContent key={tab} value={tab} className="mt-0">
                            <Card>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Adjustment #</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Impact</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {adjustments?.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                            <p className="font-medium">No adjustments found in this category</p>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    adjustments?.map((adjustment) => (
                                                        <TableRow key={adjustment.id} className="hover:bg-slate-50/50 transition-colors">
                                                            <TableCell className="font-bold text-slate-900">
                                                                {adjustment.adjustment_number}
                                                            </TableCell>
                                                            <TableCell className="font-medium">{adjustment.locations?.name || 'Unknown'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                                                                    {getTypeLabel(adjustment.adjustment_type)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-slate-600">
                                                                {formatDate(adjustment.adjustment_date, 'MMM dd, yyyy')}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant="secondary" className="font-normal">
                                                                    {adjustment.stock_adjustment_items?.length || 0} Products
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={getStatusColor(adjustment.status)} className="rounded-full px-2">
                                                                    {adjustment.status.replace('_', ' ')}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Button asChild variant="outline" size="sm">
                                                                        <Link href={`/dashboard/inventory/adjustments/${adjustment.id}`}>
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View
                                                                        </Link>
                                                                    </Button>

                                                                    {adjustment.status === 'DRAFT' && (
                                                                        <>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleSubmit(adjustment.id, adjustment.adjustment_number)}
                                                                            >
                                                                                <Send className="mr-2 h-4 w-4" />
                                                                                Submit
                                                                            </Button>
                                                                            <Button
                                                                                variant="destructive"
                                                                                size="sm"
                                                                                onClick={() => handleDelete(adjustment.id, adjustment.adjustment_number)}
                                                                            >
                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                Delete
                                                                            </Button>
                                                                        </>
                                                                    )}

                                                                    {adjustment.status === 'PENDING_APPROVAL' && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleApprove(adjustment.id, adjustment.adjustment_number)}
                                                                        >
                                                                            <Check className="mr-2 h-4 w-4" />
                                                                            Approve
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

            {/* Approval Confirmation Dialog */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Stock Adjustment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to approve adjustment <strong>{selectedAdjustment?.number}</strong>?
                            <br /><br />
                            This will permanently update stock levels and cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => console.log('❌ User cancelled approval')}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={performApproval}
                            className="bg-green-600 text-white hover:bg-green-700"
                        >
                            Yes, Approve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!adjustmentToDelete} onOpenChange={(open) => !open && setAdjustmentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Adjustment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete adjustment <span className="font-medium text-slate-900">{adjustmentToDelete?.number}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
