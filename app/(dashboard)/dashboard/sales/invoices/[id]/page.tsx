'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer, Download, CheckCircle } from 'lucide-react'
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
import { useSalesInvoice, useUpdateInvoiceStatus } from '@/lib/queries/sales-invoices'
import { generateInvoicePDF } from '@/lib/utils/export'

export default function SalesInvoiceDetailsPage() {
    return (
        <PermissionGuard permission="sales.invoices.read">
            <SalesInvoiceDetailsContent />
        </PermissionGuard>
    )
}

function SalesInvoiceDetailsContent() {
    const params = useParams<{ id: string }>()
    const invoiceId = params?.id || ''
    const { data: invoice, isLoading } = useSalesInvoice(invoiceId)
    const updateStatus = useUpdateInvoiceStatus()

    if (isLoading) {
        return <div className="p-8 text-center">Loading invoice...</div>
    }

    if (!invoice) {
        return <div className="p-8 text-center text-muted-foreground">Invoice not found.</div>
    }

    const handleDownload = () => {
        generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (invoice.sales_invoice_items || []).map(item => ({
                description: item.products?.name || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                amount: item.line_total,
            })),
            subtotal: invoice.subtotal,
            tax_amount: invoice.tax_amount,
            total_amount: invoice.total_amount,
            notes: invoice.notes || undefined,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        }, {
            filename: `Invoice_${invoice.invoice_number}.pdf`,
        })
    }

    const handlePrint = () => {
        const doc = generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (invoice.sales_invoice_items || []).map(item => ({
                description: item.products?.name || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                amount: item.line_total,
            })),
            subtotal: invoice.subtotal,
            tax_amount: invoice.tax_amount,
            total_amount: invoice.total_amount,
            notes: invoice.notes || undefined,
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
                    <Link href="/dashboard/sales/invoices">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{invoice.invoice_number}</h1>
                        <p className="text-muted-foreground">Sales invoice details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant="outline">{invoice.status}</Badge>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={invoice.status === 'posted' || updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: invoice.id, status: 'posted' })}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Post Invoice
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Invoice Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Line Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoice.sales_invoice_items?.length ? (
                                    invoice.sales_invoice_items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.products?.name || 'Item'}
                                                {item.products?.sku && (
                                                    <div className="text-xs text-muted-foreground">{item.products.sku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{item.line_total.toLocaleString()}</TableCell>
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
                            <div className="font-medium">{invoice.customers?.name || '—'}</div>
                            <div className="text-sm text-muted-foreground">Customer Code</div>
                            <div className="font-medium">{invoice.customers?.customer_code || '—'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Invoice Date</div>
                            <div className="font-medium">{formatDate(invoice.invoice_date)}</div>
                            <div className="text-sm text-muted-foreground">Due Date</div>
                            <div className="font-medium">{formatDate(invoice.due_date)}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Totals</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{invoice.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Discount</span>
                                <span>{invoice.discount_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Tax</span>
                                <span>{invoice.tax_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Shipping</span>
                                <span>{invoice.shipping_charges.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-semibold border-t pt-2">
                                <span>Total</span>
                                <span>{invoice.total_amount.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
