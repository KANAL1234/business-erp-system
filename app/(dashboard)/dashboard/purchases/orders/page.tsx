'use client'

import { useMemo, useState } from 'react'
import { usePurchaseOrders, useUpdatePOStatus, useDeletePurchaseOrder } from '@/lib/queries/purchase-orders'
import { useGoodsReceipts } from '@/lib/queries/goods-receipts'
import { createClient } from '@/lib/supabase/client'
import { createPurchaseOrderPDF } from '@/lib/utils/export'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { Plus, Check, X, Trash2, Send, Eye, Package, Download, Printer } from 'lucide-react'
import Link from 'next/link'
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

export default function PurchaseOrdersPage() {
    return (
        <PermissionGuard permission="procurement.purchase_orders.read">
            <PurchaseOrdersContent />
        </PermissionGuard>
    )
}

function PurchaseOrdersContent() {
    const { data: allOrders, isLoading } = usePurchaseOrders()
    const { data: grns } = useGoodsReceipts()
    const updateStatus = useUpdatePOStatus()
    const deletePO = useDeletePurchaseOrder()
    const [orderToDelete, setOrderToDelete] = useState<{ id: string, number: string } | null>(null)
    const [sortBy, setSortBy] = useState('po_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()

    const formatDate = (date: string | null) => {
        if (!date) return '-'
        return format(new Date(date), 'MMM dd, yyyy')
    }

    const handleDownload = async (orderId: string) => {
        const { data: order, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                vendors(id, vendor_code, name),
                locations(id, code, name),
                purchase_order_items!fk_po_items_po(
                    *,
                    products!fk_po_items_product(id, sku, name)
                )
            `)
            .eq('id', orderId)
            .single()

        if (error || !order) {
            toast.error('Failed to download purchase order PDF', {
                description: error?.message || 'Purchase order not found',
            })
            return
        }

        createPurchaseOrderPDF({
            po_number: order.po_number,
            po_date: formatDate(order.po_date),
            expected_delivery_date: order.expected_delivery_date ? formatDate(order.expected_delivery_date) : null,
            status: order.status,
            vendor_name: order.vendors?.name || 'Vendor',
            vendor_code: order.vendors?.vendor_code || null,
            location_name: order.locations ? `${order.locations.name} (${order.locations.code})` : null,
            items: (order.purchase_order_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total || item.quantity * item.unit_price,
            })),
            subtotal: order.subtotal || 0,
            tax_amount: order.tax_amount || 0,
            discount_amount: order.discount_amount || 0,
            total_amount: order.total_amount || 0,
            notes: order.notes || undefined,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        }).save(`PurchaseOrder_${order.po_number}.pdf`)
    }

    const handlePrint = async (orderId: string) => {
        const { data: order, error } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                vendors(id, vendor_code, name),
                locations(id, code, name),
                purchase_order_items!fk_po_items_po(
                    *,
                    products!fk_po_items_product(id, sku, name)
                )
            `)
            .eq('id', orderId)
            .single()

        if (error || !order) {
            toast.error('Failed to print purchase order', {
                description: error?.message || 'Purchase order not found',
            })
            return
        }

        const doc = createPurchaseOrderPDF({
            po_number: order.po_number,
            po_date: formatDate(order.po_date),
            expected_delivery_date: order.expected_delivery_date ? formatDate(order.expected_delivery_date) : null,
            status: order.status,
            vendor_name: order.vendors?.name || 'Vendor',
            vendor_code: order.vendors?.vendor_code || null,
            location_name: order.locations ? `${order.locations.name} (${order.locations.code})` : null,
            items: (order.purchase_order_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total || item.quantity * item.unit_price,
            })),
            subtotal: order.subtotal || 0,
            tax_amount: order.tax_amount || 0,
            discount_amount: order.discount_amount || 0,
            total_amount: order.total_amount || 0,
            notes: order.notes || undefined,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })

        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="secondary">Draft</Badge>
            case 'PENDING_APPROVAL':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
            case 'APPROVED':
                return <Badge className="bg-primary/50 hover:bg-primary">Approved</Badge>
            case 'SENT_TO_VENDOR':
                return <Badge className="bg-primary/50 hover:bg-primary">Sent</Badge>
            case 'PARTIALLY_RECEIVED':
                return <Badge className="bg-primary/50 hover:bg-primary">Partial</Badge>
            case 'RECEIVED':
                return <Badge className="bg-green-500 hover:bg-green-600">Received</Badge>
            case 'CANCELLED':
                return <Badge variant="destructive">Cancelled</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateStatus.mutateAsync({ id, status: newStatus })
            toast.success('Success', {
                description: `Purchase order ${newStatus.toLowerCase()}`,
            })
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    const handleDelete = async () => {
        if (!orderToDelete) return

        try {
            await deletePO.mutateAsync(orderToDelete.id)
            toast.success('Success', {
                description: 'Purchase order deleted',
            })
            setOrderToDelete(null)
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    const grnOrderIds = new Set((grns || []).map((grn: any) => grn.po_id).filter(Boolean))

    const sortOrders = useMemo(() => {
        const sorters: Record<string, (row: any) => string | number> = {
            po_date: (row) => new Date(row.po_date || row.created_at).getTime(),
            expected_delivery_date: (row) => row.expected_delivery_date ? new Date(row.expected_delivery_date).getTime() : 0,
            po_number: (row) => String(row.po_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            status: (row) => String(row.status || ''),
        }
        const getValue = sorters[sortBy] || sorters.po_date
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

    const draftOrders = sortOrders(allOrders?.filter(o => o.status === 'DRAFT'))
    const pendingOrders = sortOrders(allOrders?.filter(o => o.status === 'PENDING_APPROVAL'))
    const approvedOrders = sortOrders(allOrders?.filter(o => ['APPROVED', 'SENT_TO_VENDOR'].includes(o.status)))
    const receivedOrders = sortOrders(allOrders?.filter(o => ['PARTIALLY_RECEIVED', 'RECEIVED'].includes(o.status)))
    const sortedAllOrders = sortOrders(allOrders)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                    <p className="text-muted-foreground">Manage relationships and orders with your vendors.</p>
                </div>
                <Link href="/dashboard/purchases/orders/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Order
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
                            { value: 'po_date', label: 'Date Added' },
                            { value: 'po_number', label: 'PO #' },
                            { value: 'expected_delivery_date', label: 'Expected Delivery' },
                            { value: 'total_amount', label: 'Amount' },
                            { value: 'status', label: 'Status' },
                        ]}
                    />
                </div>
                <TabsList>
                    <TabsTrigger value="all">All ({allOrders?.length || 0})</TabsTrigger>
                    <TabsTrigger value="draft">Draft ({draftOrders?.length || 0})</TabsTrigger>
                    <TabsTrigger value="pending">Pending ({pendingOrders?.length || 0})</TabsTrigger>
                    <TabsTrigger value="approved">Approved ({approvedOrders?.length || 0})</TabsTrigger>
                    <TabsTrigger value="received">Received ({receivedOrders?.length || 0})</TabsTrigger>
                </TabsList>

                {['all', 'draft', 'pending', 'approved', 'received'].map(tab => {
                    const orders =
                        tab === 'all' ? sortedAllOrders :
                            tab === 'draft' ? draftOrders :
                                tab === 'pending' ? pendingOrders :
                                    tab === 'approved' ? approvedOrders :
                                        receivedOrders

                    return (
                        <TabsContent key={tab} value={tab}>
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>PO #</TableHead>
                                                <TableHead>Vendor</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Expected Delivery</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orders?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                        No purchase orders found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                orders?.map((order) => (
                                                    <TableRow key={order.id}>
                                                        <TableCell className="font-medium">
                                                            {order.po_number}
                                                        </TableCell>
                                                        <TableCell>{order.vendors?.name}</TableCell>
                                                        <TableCell>
                                                            {format(new Date(order.po_date), 'MMM dd, yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {order.expected_delivery_date
                                                                ? format(new Date(order.expected_delivery_date), 'MMM dd, yyyy')
                                                                : '-'
                                                            }
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            Rs. {order.total_amount.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            {getStatusBadge(order.status)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                <Button asChild variant="outline" size="sm">
                                                                    <Link href={`/dashboard/purchases/orders/${order.id}`}>
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View
                                                                    </Link>
                                                                </Button>
                                                                <Button variant="outline" size="sm" onClick={() => handlePrint(order.id)}>
                                                                    <Printer className="mr-2 h-4 w-4" />
                                                                    Print
                                                                </Button>
                                                                <Button variant="outline" size="sm" onClick={() => handleDownload(order.id)}>
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    PDF
                                                                </Button>

                                                                {order.status === 'DRAFT' && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleStatusChange(order.id, 'PENDING_APPROVAL')}
                                                                        >
                                                                            <Send className="mr-2 h-4 w-4" />
                                                                            Submit
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => setOrderToDelete({ id: order.id, number: order.po_number })}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {order.status === 'PENDING_APPROVAL' && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleStatusChange(order.id, 'APPROVED')}
                                                                        >
                                                                            <Check className="mr-2 h-4 w-4" />
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => handleStatusChange(order.id, 'CANCELLED')}
                                                                        >
                                                                            <X className="mr-2 h-4 w-4" />
                                                                            Cancel
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {order.status === 'APPROVED' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleStatusChange(order.id, 'SENT_TO_VENDOR')}
                                                                    >
                                                                        <Send className="mr-2 h-4 w-4" />
                                                                        Sent
                                                                    </Button>
                                                                )}
                                                                {(() => {
                                                                    const canReceive = ['APPROVED', 'SENT_TO_VENDOR', 'PARTIALLY_RECEIVED'].includes(order.status)
                                                                    const isDisabled = !canReceive || grnOrderIds.has(order.id)
                                                                    const title = grnOrderIds.has(order.id)
                                                                        ? 'GRN already created for this order'
                                                                        : !canReceive
                                                                            ? 'Receive is available after approval'
                                                                            : undefined

                                                                    return isDisabled ? (
                                                                        <Button variant="outline" size="sm" disabled title={title}>
                                                                            <Package className="mr-2 h-4 w-4" />
                                                                            Receive
                                                                        </Button>
                                                                    ) : (
                                                                        <Button asChild variant="outline" size="sm">
                                                                            <Link href={`/dashboard/purchases/grn/new?po=${order.id}`}>
                                                                                <Package className="mr-2 h-4 w-4" />
                                                                                Receive
                                                                            </Link>
                                                                        </Button>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>

            <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete purchase order <span className="font-medium text-slate-900">{orderToDelete?.number}</span>?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deletePO.isPending}
                        >
                            {deletePO.isPending ? 'Deleting...' : 'Delete Order'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
