'use client'

import { useParams, useRouter } from 'next/navigation'
import { useStockAdjustment } from '@/lib/queries/stock-adjustments'
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
import { ArrowLeft, Warehouse, Calendar, StickyNote, Activity } from 'lucide-react'
import { format } from 'date-fns'

export default function AdjustmentDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const { data: adjustment, isLoading, error } = useStockAdjustment(id)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                <p className="text-slate-500 font-medium">Loading adjustment details...</p>
            </div>
        )
    }

    if (error || !adjustment) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 font-medium">Adjustment not found or access denied.</p>
                <Button variant="link" onClick={() => router.back()}>Go Back</Button>
            </div>
        )
    }

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

    const netImpactQuantity = adjustment.stock_adjustment_items?.reduce((sum: number, item: any) => {
        return sum + (Number(item.physical_quantity || 0) - Number(item.system_quantity || 0))
    }, 0) || 0
    const netImpactValue = adjustment.stock_adjustment_items?.reduce((sum: number, item: any) => {
        return sum + ((Number(item.physical_quantity || 0) - Number(item.system_quantity || 0)) * Number(item.unit_cost || 0))
    }, 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-slate-900">{adjustment.adjustment_number}</h2>
                        <Badge variant={getStatusColor(adjustment.status)} className="rounded-full px-3 py-1">
                            {adjustment.status.replace('_', ' ')}
                        </Badge>
                    </div>
                    <p className="text-slate-500 text-sm">Created on {formatDate(adjustment.created_at, 'MMMM dd, yyyy')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Warehouse className="h-4 w-4" /> Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-bold text-slate-900">{adjustment.locations?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 font-mono">{adjustment.locations?.code || '-'}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Type
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                            {getTypeLabel(adjustment.adjustment_type)}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-2">Reason provided: {adjustment.reason || 'None'}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Date
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-medium text-slate-900">{formatDate(adjustment.adjustment_date, 'MMMM dd, yyyy')}</p>
                        <p className="text-xs text-slate-400 mt-1 italic">Effective date</p>
                    </CardContent>
                </Card>

                <Card className={netImpactValue < 0 ? 'bg-red-50/30' : 'bg-green-50/30'}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <StickyNote className="h-4 w-4" /> Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500">Qty:</span>
                            <span className={`font-bold ${netImpactQuantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {netImpactQuantity > 0 ? '+' : ''}{netImpactQuantity.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline border-t pt-1">
                            <span className="text-xs text-slate-500">Value:</span>
                            <span className={`font-bold ${netImpactValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                Rs. {netImpactValue > 0 ? '+' : ''}{netImpactValue.toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Adjustment Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">System Qty</TableHead>
                                <TableHead className="text-right">Physical Qty</TableHead>
                                <TableHead className="text-right font-bold">Variance</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right font-bold">Total Impact</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adjustment.stock_adjustment_items?.map((item: any) => {
                                const physicalQty = Number(item.physical_quantity || 0)
                                const systemQty = Number(item.system_quantity || 0)
                                const unitCost = Number(item.unit_cost || 0)
                                const variance = physicalQty - systemQty
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{item.products?.name || 'Unknown product'}</div>
                                            <div className="text-xs text-slate-500">{item.products?.sku || '-'}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{systemQty.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-medium">{physicalQty.toLocaleString()}</TableCell>
                                        <TableCell className={`text-right font-bold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : ''}`}>
                                            {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-500">Rs. {unitCost.toLocaleString()}</TableCell>
                                        <TableCell className={`text-right font-bold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : ''}`}>
                                            Rs. {variance > 0 ? '+' : ''}{(variance * unitCost).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">{item.notes || '-'}</TableCell>
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
