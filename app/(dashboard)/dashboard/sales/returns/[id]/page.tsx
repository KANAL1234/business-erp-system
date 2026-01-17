'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { formatDate } from '@/lib/utils'
import { PermissionGuard } from '@/components/permission-guard'
import { useSalesReturn } from '@/lib/queries/sales-returns'
import { createSalesReturnPDF } from '@/lib/utils/export'

export default function SalesReturnDetailsPage() {
    return (
        <PermissionGuard permission="sales.returns.read">
            <SalesReturnDetailsContent />
        </PermissionGuard>
    )
}

function SalesReturnDetailsContent() {
    const params = useParams<{ id: string }>()
    const returnId = params?.id || ''
    const { data: salesReturn, isLoading } = useSalesReturn(returnId)

    if (isLoading) {
        return <div className="p-8 text-center">Loading return...</div>
    }

    if (!salesReturn) {
        return <div className="p-8 text-center text-muted-foreground">Return not found.</div>
    }

    const handleDownload = () => {
        const doc = createSalesReturnPDF({
            return_number: salesReturn.return_number,
            return_date: formatDate(salesReturn.return_date),
            status: salesReturn.status,
            reason: salesReturn.reason,
            customer_name: salesReturn.customers?.name || 'Customer',
            customer_code: salesReturn.customers?.customer_code || '',
            invoice_number: salesReturn.sales_invoices?.invoice_number || '',
            refund_amount: salesReturn.refund_amount,
            items: (salesReturn.sales_return_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_returned: item.quantity_returned,
                condition: item.condition,
                action: item.action,
            })),
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
        doc.save(`SalesReturn_${salesReturn.return_number}.pdf`)
    }

    const handlePrint = () => {
        const doc = createSalesReturnPDF({
            return_number: salesReturn.return_number,
            return_date: formatDate(salesReturn.return_date),
            status: salesReturn.status,
            reason: salesReturn.reason,
            customer_name: salesReturn.customers?.name || 'Customer',
            customer_code: salesReturn.customers?.customer_code || '',
            invoice_number: salesReturn.sales_invoices?.invoice_number || '',
            refund_amount: salesReturn.refund_amount,
            items: (salesReturn.sales_return_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_returned: item.quantity_returned,
                condition: item.condition,
                action: item.action,
            })),
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/sales/returns">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{salesReturn.return_number}</h1>
                        <p className="text-muted-foreground">Sales return details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant="outline">{salesReturn.status}</Badge>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Returned Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qty Returned</TableHead>
                                    <TableHead className="text-right">Condition</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {salesReturn.sales_return_items?.length ? (
                                    salesReturn.sales_return_items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.products?.name || 'Item'}
                                                {item.products?.sku && (
                                                    <div className="text-xs text-muted-foreground">{item.products.sku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity_returned}</TableCell>
                                            <TableCell className="text-right">{item.condition || '—'}</TableCell>
                                            <TableCell className="text-right">{item.action || '—'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No items found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Name</div>
                            <div className="font-medium">{salesReturn.customers?.name || '—'}</div>
                            <div className="text-sm text-muted-foreground">Customer Code</div>
                            <div className="font-medium">{salesReturn.customers?.customer_code || '—'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Return Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Return Date</div>
                            <div className="font-medium">{formatDate(salesReturn.return_date)}</div>
                            <div className="text-sm text-muted-foreground">Invoice #</div>
                            <div className="font-medium">{salesReturn.sales_invoices?.invoice_number || '—'}</div>
                            <div className="text-sm text-muted-foreground">Refund Amount</div>
                            <div className="font-medium">{salesReturn.refund_amount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
