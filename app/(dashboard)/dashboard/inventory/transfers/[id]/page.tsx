'use client'

import { useParams, useRouter } from 'next/navigation'
import { useStockTransfer } from '@/lib/queries/stock-transfers'
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
import { ArrowLeft, ArrowRight, Package, Calendar, StickyNote } from 'lucide-react'
import { format } from 'date-fns'

export default function TransferDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const { data: transfer, isLoading, error } = useStockTransfer(id)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                <p className="text-slate-500 font-medium">Loading transfer details...</p>
            </div>
        )
    }

    if (error || !transfer) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 font-medium">Transfer not found or access denied.</p>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

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

    const totalQuantity = transfer.stock_transfer_items?.reduce((sum: number, item: any) => {
        return sum + Number(item.quantity_requested || 0)
    }, 0) || 0
    const totalValue = transfer.stock_transfer_items?.reduce((sum: number, item: any) => {
        return sum + (Number(item.quantity_requested || 0) * Number(item.unit_cost || 0))
    }, 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-slate-900">{transfer.transfer_number}</h2>
                        <Badge variant={getStatusColor(transfer.status)} className="rounded-full px-3 py-1">
                            {transfer.status.replace('_', ' ')}
                        </Badge>
                    </div>
                    <p className="text-slate-500 text-sm">Created on {formatDate(transfer.created_at, 'MMMM dd, yyyy')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Package className="h-4 w-4" /> Logistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                                <p className="text-xs text-slate-400 mb-1">From</p>
                                <p className="font-bold text-slate-900">{transfer.from_location?.name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{transfer.from_location?.code || '-'}</p>
                            </div>
                            <div className="px-4 text-slate-300">
                                <ArrowRight className="h-6 w-6" />
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-xs text-slate-400 mb-1">To</p>
                                <p className="font-bold text-slate-900">{transfer.to_location?.name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{transfer.to_location?.code || '-'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Transfer Date:</span>
                            <span className="font-medium">{formatDate(transfer.transfer_date, 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-slate-500">Last Updated:</span>
                            <span className="font-medium">{formatDate(transfer.updated_at, 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <StickyNote className="h-4 w-4" /> Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Total Items:</span>
                            <span className="font-bold">{transfer.stock_transfer_items?.length || 0}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-slate-500">Total Quantity:</span>
                            <span className="font-bold">{totalQuantity.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-slate-500">Total Value:</span>
                            <span className="font-bold text-slate-900">Rs. {totalValue.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {transfer.notes && (
                <Card className="bg-slate-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-700">{transfer.notes}</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Transfer Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Requested</TableHead>
                                <TableHead className="text-right">Sent</TableHead>
                                <TableHead className="text-right">Received</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfer.stock_transfer_items?.map((item: any) => {
                                const requestedQty = Number(item.quantity_requested || 0)
                                const unitCost = Number(item.unit_cost || 0)
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium text-slate-900">{item.products?.name || 'Unknown product'}</TableCell>
                                        <TableCell className="text-slate-500 text-xs">{item.products?.sku || '-'}</TableCell>
                                        <TableCell className="text-right font-medium">{requestedQty.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{item.quantity_sent != null ? Number(item.quantity_sent).toLocaleString() : '-'}</TableCell>
                                        <TableCell className="text-right font-bold text-slate-900">{item.quantity_received != null ? Number(item.quantity_received).toLocaleString() : '-'}</TableCell>
                                        <TableCell className="text-right text-slate-500">Rs. {unitCost.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-bold">Rs. {(requestedQty * unitCost).toLocaleString()}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
