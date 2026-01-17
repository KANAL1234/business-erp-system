'use client'

import React, { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { PermissionGuard } from '@/components/permission-guard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useGoodsReceipt } from '@/lib/queries/goods-receipts'

function GoodsReceiptDetailContent({ id }: { id: string }) {
    const { data: grn, isLoading } = useGoodsReceipt(id)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="secondary">Draft</Badge>
            case 'PENDING':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
            case 'RECEIVED':
                return <Badge className="bg-green-500 hover:bg-green-600">Received</Badge>
            case 'CANCELLED':
                return <Badge variant="destructive">Cancelled</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading details...</div>
    if (!grn) return <div className="p-8 text-center text-red-500">Goods receipt not found</div>

    const items = grn.goods_receipt_items || []

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/purchases/grn">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {grn.grn_number}
                            {getStatusBadge(grn.status)}
                        </h1>
                        <p className="text-muted-foreground">
                            Vendor: <span className="font-medium text-foreground">{grn.vendors?.name}</span>
                        </p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Receipt Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground">Receipt Date</div>
                            <div className="font-medium">{format(new Date(grn.receipt_date), 'MMM dd, yyyy')}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Location</div>
                            <div className="font-medium">{grn.locations?.name || '-'}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">PO Number</div>
                            {grn.purchase_orders?.po_number ? (
                                <Link
                                    href={`/dashboard/purchases/orders/${grn.po_id}`}
                                    className="font-medium text-primary hover:underline"
                                >
                                    {grn.purchase_orders.po_number}
                                </Link>
                            ) : (
                                <div className="font-medium">-</div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground">Subtotal</div>
                            <div className="font-semibold">PKR {Number(grn.subtotal || 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Total Amount</div>
                            <div className="font-semibold">PKR {Number(grn.total_amount || 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Received By</div>
                            <div className="font-semibold">{(grn as any).received_by_user?.full_name || '-'}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No items found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.products?.name || 'Item'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(item.quantity_received).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            PKR {Number(item.unit_cost).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            PKR {Number(item.quantity_received * item.unit_cost).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    return (
        <PermissionGuard permission="procurement.grn.read">
            <GoodsReceiptDetailContent id={id} />
        </PermissionGuard>
    )
}
