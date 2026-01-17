'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer, Download, Truck, FileText, Pencil } from 'lucide-react'
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
import { useSalesOrder } from '@/lib/queries/sales-orders'
import { useGenerateInvoiceFromOrder } from '@/lib/queries/sales-invoices'
import { createSalesOrderPDF } from '@/lib/utils/export'
import { useDeliveryNotes } from '@/lib/queries/delivery-notes'
import { useSalesInvoices } from '@/lib/queries/sales-invoices'

export default function SalesOrderDetailsPage() {
    return (
        <PermissionGuard permission="sales.orders.read">
            <SalesOrderDetailsContent />
        </PermissionGuard>
    )
}

function SalesOrderDetailsContent() {
    const params = useParams<{ id: string | string[] }>()
    const rawId = params?.id
    const orderId = Array.isArray(rawId) ? rawId[0] : rawId || ''
    const { data: order, isLoading } = useSalesOrder(orderId)
    const generateInvoice = useGenerateInvoiceFromOrder()
    const { data: deliveryNotes } = useDeliveryNotes()
    const { data: invoices } = useSalesInvoices()
    const hasDelivery = (deliveryNotes || []).some(note => note.sales_order_id === orderId)
    const hasInvoice = (invoices || []).some(invoice => (invoice as any).sales_order_id === orderId)

    if (isLoading) {
        return <div className="p-8 text-center">Loading order...</div>
    }

    if (!order) {
        return <div className="p-8 text-center text-muted-foreground">Order not found.</div>
    }

    const handleDownload = () => {
        const doc = createSalesOrderPDF({
            order_number: order.order_number,
            order_date: formatDate(order.order_date),
            expected_delivery_date: order.expected_delivery_date ? formatDate(order.expected_delivery_date) : null,
            status: order.status,
            payment_status: order.payment_status,
            customer_name: order.customers?.name || 'Customer',
            customer_code: order.customers?.customer_code || '',
            items: (order.sales_order_items || []).map(item => ({
                description: item.products?.name || item.description || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total,
            })),
            subtotal: order.subtotal,
            tax_amount: order.tax_amount,
            discount_amount: order.discount_amount,
            shipping_charges: order.shipping_charges,
            total_amount: order.total_amount,
            notes: order.notes,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
        doc.save(`SalesOrder_${order.order_number}.pdf`)
    }

    const handlePrint = () => {
        const doc = createSalesOrderPDF({
            order_number: order.order_number,
            order_date: formatDate(order.order_date),
            expected_delivery_date: order.expected_delivery_date ? formatDate(order.expected_delivery_date) : null,
            status: order.status,
            payment_status: order.payment_status,
            customer_name: order.customers?.name || 'Customer',
            customer_code: order.customers?.customer_code || '',
            items: (order.sales_order_items || []).map(item => ({
                description: item.products?.name || item.description || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total,
            })),
            subtotal: order.subtotal,
            tax_amount: order.tax_amount,
            discount_amount: order.discount_amount,
            shipping_charges: order.shipping_charges,
            total_amount: order.total_amount,
            notes: order.notes,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleGenerateInvoice = () => {
        generateInvoice.mutate({
            ...order,
            items: order.sales_order_items || [],
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/sales/orders">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
                        <p className="text-muted-foreground">Sales order details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant="outline">{order.status}</Badge>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                    {hasDelivery || hasInvoice ? (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title="Editing disabled after delivery or invoice"
                        >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/sales/orders/${order.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                    )}
                    {hasDelivery ? (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title="Delivery note already created for this order"
                        >
                            <Truck className="mr-2 h-4 w-4" />
                            Create Delivery
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/sales/deliveries/new?order_id=${order.id}`}>
                                <Truck className="mr-2 h-4 w-4" />
                                Create Delivery
                            </Link>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateInvoice}
                        disabled={generateInvoice.isPending || hasInvoice}
                        title={hasInvoice ? 'Invoice already created for this order' : 'Generate invoice'}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Invoice
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Order Items</CardTitle>
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
                                {order.sales_order_items?.length ? (
                                    order.sales_order_items.map((item) => (
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
                            <div className="font-medium">{order.customers?.name || '—'}</div>
                            <div className="text-sm text-muted-foreground">Customer Code</div>
                            <div className="font-medium">{order.customers?.customer_code || '—'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Order Date</div>
                            <div className="font-medium">{formatDate(order.order_date)}</div>
                            <div className="text-sm text-muted-foreground">Expected Delivery</div>
                            <div className="font-medium">{order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Totals</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{order.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Discount</span>
                                <span>{order.discount_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Tax</span>
                                <span>{order.tax_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Shipping</span>
                                <span>{order.shipping_charges.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-semibold border-t pt-2">
                                <span>Total</span>
                                <span>{order.total_amount.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
