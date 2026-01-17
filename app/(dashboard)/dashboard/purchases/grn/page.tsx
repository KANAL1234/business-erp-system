'use client'

import { useMemo, useState } from 'react'
import { useGoodsReceipts } from '@/lib/queries/goods-receipts'
import { createClient } from '@/lib/supabase/client'
import { createGoodsReceiptPDF } from '@/lib/utils/export'
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
import { Plus, Download, Printer } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ListSortControls } from '@/components/list-sort-controls'

export default function GoodsReceiptsPage() {
    return (
        <PermissionGuard permission="procurement.grn.read">
            <GoodsReceiptsContent />
        </PermissionGuard>
    )
}

function GoodsReceiptsContent() {
    const { data: grns, isLoading } = useGoodsReceipts()
    const supabase = createClient()
    const [sortBy, setSortBy] = useState('receipt_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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

    const formatDate = (date: string | null) => {
        if (!date) return '-'
        return format(new Date(date), 'MMM dd, yyyy')
    }

    const handleDownload = async (grnId: string) => {
        const { data: grn, error } = await supabase
            .from('goods_receipts')
            .select(`
                *,
                vendors(id, vendor_code, name),
                locations(id, code, name),
                purchase_orders(id, po_number),
                goods_receipt_items(
                    *,
                    products!goods_receipt_items_product_id_fkey(id, sku, name)
                )
            `)
            .eq('id', grnId)
            .single()

        if (error || !grn) {
            toast.error('Failed to download goods receipt PDF', {
                description: error?.message || 'Goods receipt not found',
            })
            return
        }

        createGoodsReceiptPDF({
            grn_number: grn.grn_number,
            receipt_date: formatDate(grn.receipt_date),
            status: grn.status,
            po_number: grn.purchase_orders?.po_number || null,
            vendor_name: grn.vendors?.name || 'Vendor',
            location_name: grn.locations ? `${grn.locations.name} (${grn.locations.code})` : null,
            items: (grn.goods_receipt_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_received: item.quantity_received,
                unit_cost: item.unit_cost,
                line_total: item.quantity_received * item.unit_cost,
            })),
            total_amount: grn.total_amount || 0,
            notes: grn.notes || undefined,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        }).save(`GRN_${grn.grn_number}.pdf`)
    }

    const handlePrint = async (grnId: string) => {
        const { data: grn, error } = await supabase
            .from('goods_receipts')
            .select(`
                *,
                vendors(id, vendor_code, name),
                locations(id, code, name),
                purchase_orders(id, po_number),
                goods_receipt_items(
                    *,
                    products!goods_receipt_items_product_id_fkey(id, sku, name)
                )
            `)
            .eq('id', grnId)
            .single()

        if (error || !grn) {
            toast.error('Failed to print goods receipt', {
                description: error?.message || 'Goods receipt not found',
            })
            return
        }

        const doc = createGoodsReceiptPDF({
            grn_number: grn.grn_number,
            receipt_date: formatDate(grn.receipt_date),
            status: grn.status,
            po_number: grn.purchase_orders?.po_number || null,
            vendor_name: grn.vendors?.name || 'Vendor',
            location_name: grn.locations ? `${grn.locations.name} (${grn.locations.code})` : null,
            items: (grn.goods_receipt_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_received: item.quantity_received,
                unit_cost: item.unit_cost,
                line_total: item.quantity_received * item.unit_cost,
            })),
            total_amount: grn.total_amount || 0,
            notes: grn.notes || undefined,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })

        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const sortedGrns = useMemo(() => {
        const data = grns ? [...grns] : []
        const sorters: Record<string, (row: any) => string | number> = {
            receipt_date: (row) => new Date(row.receipt_date || row.created_at).getTime(),
            grn_number: (row) => String(row.grn_number || ''),
            po_number: (row) => String(row.purchase_orders?.po_number || ''),
            vendor: (row) => String(row.vendors?.name || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            status: (row) => String(row.status || ''),
        }
        const getValue = sorters[sortBy] || sorters.receipt_date
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [grns, sortBy, sortOrder])

    if (isLoading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Goods Receipts</h1>
                    <p className="text-muted-foreground">Track received inventory and GRNs</p>
                </div>
                <Link href="/dashboard/purchases/grn/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New GRN
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Recent GRNs</CardTitle>
                    <ListSortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={setSortBy}
                        onSortOrderChange={setSortOrder}
                        options={[
                            { value: 'receipt_date', label: 'Date Added' },
                            { value: 'grn_number', label: 'GRN #' },
                            { value: 'po_number', label: 'PO #' },
                            { value: 'vendor', label: 'Vendor' },
                            { value: 'total_amount', label: 'Amount' },
                            { value: 'status', label: 'Status' },
                        ]}
                    />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>GRN #</TableHead>
                                <TableHead>PO #</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedGrns?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No goods receipts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedGrns?.map((grn) => (
                                    <TableRow key={grn.id}>
                                        <TableCell className="font-medium">
                                            {grn.grn_number}
                                        </TableCell>
                                        <TableCell>
                                            {grn.purchase_orders?.po_number ? (
                                                <Link href={`/dashboard/purchases/orders/${grn.po_id}`} className="text-primary hover:underline">
                                                    {grn.purchase_orders.po_number}
                                                </Link>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>{grn.vendors.name}</TableCell>
                                        <TableCell>
                                            {format(new Date(grn.receipt_date), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell>{grn.locations.name}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            Rs. {grn.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(grn.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handlePrint(grn.id)}>
                                                    <Printer className="mr-2 h-4 w-4" />
                                                    Print
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleDownload(grn.id)}>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    PDF
                                                </Button>
                                            </div>
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
