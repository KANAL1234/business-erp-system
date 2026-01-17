'use client'

import React, { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Printer,
    Download,
    CheckCircle,
    XCircle,
    Trash2,
    Truck,
    Clock,
    User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createPurchaseOrderPDF } from '@/lib/utils/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import {
    usePurchaseOrder,
    useUpdatePOStatus,
    useDeletePurchaseOrder
} from '@/lib/queries/purchase-orders'
import { toast } from 'sonner'
import { PurchaseOrder } from '@/lib/types/database'

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { data: po, isLoading } = usePurchaseOrder(id)
    const updateStatus = useUpdatePOStatus()
    const deletePO = useDeletePurchaseOrder()

    const handleStatusUpdate = async (newStatus: PurchaseOrder['status']) => {
        try {
            await updateStatus.mutateAsync({ id, status: newStatus })
            toast.success(`Purchase Order ${newStatus.toLowerCase()}`)
        } catch (error) {
            // Error handled by mutation
        }
    }

    const handleDelete = async () => {
        try {
            await deletePO.mutateAsync(id)
            router.push('/dashboard/procurement/purchase-orders')
            toast.success('Purchase Order deleted')
        } catch (error) {
            // Error handled by mutation
        }
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

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading details...</div>
    if (!po) return <div className="p-8 text-center text-red-500">Purchase Order not found</div>

    const buildPDF = () => {
        return createPurchaseOrderPDF({
            po_number: po.po_number,
            po_date: format(new Date(po.po_date), 'MMM dd, yyyy'),
            expected_delivery_date: po.expected_delivery_date ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy') : null,
            status: po.status,
            vendor_name: po.vendors?.name || 'Vendor',
            vendor_code: po.vendors?.vendor_code || null,
            location_name: po.locations ? `${po.locations.name} (${po.locations.code})` : null,
            items: (po.purchase_order_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total || item.quantity * item.unit_price,
            })),
            subtotal: po.subtotal || 0,
            tax_amount: po.tax_amount || 0,
            discount_amount: po.discount_amount || 0,
            total_amount: po.total_amount || 0,
            notes: po.notes || undefined,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
    }

    const handlePrint = () => {
        const doc = buildPDF()
        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleDownload = () => {
        const doc = buildPDF()
        doc.save(`PurchaseOrder_${po.po_number}.pdf`)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/procurement/purchase-orders">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {po.po_number}
                            {getStatusBadge(po.status)}
                        </h1>
                        <p className="text-muted-foreground">
                            Vendor: <span className="font-medium text-foreground">{po.vendors?.name}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                    </Button>

                    {po.status === 'DRAFT' && (
                        <>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the draft order.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleStatusUpdate('APPROVED')}
                                disabled={updateStatus.isPending}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve Order
                            </Button>
                        </>
                    )}

                    {po.status === 'APPROVED' && (
                        <Link href={`/dashboard/purchases/grn/new?po=${po.id}`}>
                            <Button>
                                <Truck className="mr-2 h-4 w-4" />
                                Receive Goods
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">PO Date:</span>
                            <span>{format(new Date(po.po_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Expected:</span>
                            <span>
                                {po.expected_delivery_date
                                    ? format(new Date(po.expected_delivery_date), 'MMM dd, yyyy')
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span>{po.locations?.name} ({po.locations?.code})</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Vendor Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="font-medium">{po.vendors?.name}</div>
                        <div className="text-muted-foreground">{po.vendors?.address || 'No address'}</div>
                        <div className="text-muted-foreground">{po.vendors?.phone || 'No phone'}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Workflow</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <div className="text-xs text-muted-foreground">Requested By</div>
                                <div>{po.requested_by_user?.full_name || 'System'}</div>
                            </div>
                        </div>
                        {po.approved_by_user && (
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <div>
                                    <div className="text-xs text-muted-foreground">Approved By</div>
                                    <div>{po.approved_by_user?.full_name}</div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Items Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">Product</TableHead>
                                <TableHead className="text-right">Ordered</TableHead>
                                <TableHead className="text-right">Received</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Tax %</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {po.purchase_order_items?.map((item: any) => {
                                // Calculate display values manually if line_total is missing from projection
                                // But usually it's in the DB. If not, compute it.
                                const lineTotal = item.line_total || (
                                    (item.quantity * item.unit_price) * (1 + (item.tax_percentage || 0) / 100)
                                )
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.products?.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.products?.sku}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={
                                                item.quantity_received >= item.quantity
                                                    ? 'text-green-600 border-green-600'
                                                    : 'text-yellow-600 border-yellow-600'
                                            }>
                                                {item.quantity_received} / {item.quantity}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">Rs. {item.unit_price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{item.tax_percentage}%</TableCell>
                                        <TableCell className="text-right font-medium">
                                            Rs. {lineTotal.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Totals Section */}
            <div className="flex justify-end">
                <Card className="w-full md:w-1/3">
                    <CardContent className="p-6 space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>Rs. {po.subtotal?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Tax</span>
                            <span>Rs. {po.tax_amount?.toFixed(2)}</span>
                        </div>
                        {po.discount_amount > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>Discount</span>
                                <span>-Rs. {po.discount_amount?.toFixed(2)}</span>
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>Rs. {po.total_amount?.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notes */}
            {(po.notes || po.terms_and_conditions) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {po.notes && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>{po.notes}</CardContent>
                        </Card>
                    )}
                    {po.terms_and_conditions && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Terms & Conditions</CardTitle>
                            </CardHeader>
                            <CardContent>{po.terms_and_conditions}</CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
