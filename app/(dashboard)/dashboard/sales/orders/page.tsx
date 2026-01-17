'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, FileText, Download, Truck, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSalesOrders } from '@/lib/queries/sales-orders'
import { formatDate } from '@/lib/utils'
import { SalesOrder } from '@/lib/types/database'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { createClient } from '@/lib/supabase/client'
import { createSalesOrderPDF } from '@/lib/utils/export'
import { useGenerateInvoiceFromOrder } from '@/lib/queries/sales-invoices'
import { useDeliveryNotes } from '@/lib/queries/delivery-notes'
import { useSalesInvoices } from '@/lib/queries/sales-invoices'
import { ListSortControls } from '@/components/list-sort-controls'

export default function SalesOrdersPage() {
    return (
        <PermissionGuard permission="sales.orders.read">
            <SalesOrdersContent />
        </PermissionGuard>
    )
}

function SalesOrdersContent() {
    const { currentLocationId } = useLocation()
    const { data: orders, isLoading } = useSalesOrders()
    const { data: deliveryNotes } = useDeliveryNotes()
    const { data: invoices } = useSalesInvoices()
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()
    const generateInvoice = useGenerateInvoiceFromOrder()
    const deliveredOrderIds = new Set((deliveryNotes || []).map(note => note.sales_order_id).filter(Boolean))
    const invoicedOrderIds = new Set((invoices || []).map(invoice => (invoice as any).sales_order_id).filter(Boolean))

    const handleDownload = async (orderId: string) => {
        const { data: order, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                customers (
                    id,
                    name,
                    customer_code
                ),
                sales_order_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', orderId)
            .single()

        if (error || !order) {
            toast.error('Failed to download order PDF')
            return
        }

        const doc = createSalesOrderPDF({
            order_number: order.order_number,
            order_date: formatDate(order.order_date),
            expected_delivery_date: order.expected_delivery_date ? formatDate(order.expected_delivery_date) : null,
            status: order.status,
            payment_status: order.payment_status,
            customer_name: order.customers?.name || 'Customer',
            customer_code: order.customers?.customer_code || '',
            items: (order.sales_order_items || []).map((item: any) => ({
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

    const handleGenerateInvoice = async (orderId: string) => {
        const { data: order, error } = await supabase
            .from('sales_orders')
            .select(`
                *,
                sales_order_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', orderId)
            .single()

        if (error || !order) {
            toast.error('Failed to generate invoice')
            return
        }

        generateInvoice.mutate({
            ...order,
            items: order.sales_order_items || [],
        })
    }

    // Filter orders by selected location and search term
    const filteredOrders = orders?.filter(order => {
        // Location filter: Only show orders from selected location
        if (currentLocationId) {
            const warehouseId = (order as any).warehouse_location_id
            if (warehouseId && warehouseId !== currentLocationId) {
                return false
            }
        }

        // Search filter
        if (searchQuery) {
            return order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        }

        return true
    })

    const sortedOrders = useMemo(() => {
        const data = filteredOrders ? [...filteredOrders] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.order_date).getTime(),
            order_date: (row) => new Date(row.order_date).getTime(),
            delivery_date: (row) => row.delivery_date ? new Date(row.delivery_date).getTime() : 0,
            order_number: (row) => String(row.order_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            status: (row) => String(row.status || ''),
            payment_status: (row) => String(row.payment_status || ''),
        }
        const getValue = sorters[sortBy] || sorters.created_at
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [filteredOrders, sortBy, sortOrder])

    const getStatusBadge = (status: SalesOrder['status']) => {
        switch (status) {
            case 'draft': return <Badge variant="secondary">Draft</Badge>
            case 'pending': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
            case 'confirmed': return <Badge className="bg-primary/50 hover:bg-primary">Confirmed</Badge>
            case 'processing': return <Badge className="bg-primary/50 hover:bg-primary">Processing</Badge>
            case 'shipped': return <Badge className="bg-primary/50 hover:bg-primary">Shipped</Badge>
            case 'delivered': return <Badge className="bg-green-500 hover:bg-green-600">Delivered</Badge>
            case 'completed': return <Badge className="bg-green-700 hover:bg-green-800">Completed</Badge>
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    const getPaymentBadge = (status: SalesOrder['payment_status']) => {
        switch (status) {
            case 'paid': return <Badge variant="outline" className="text-green-600 border-green-600">Paid</Badge>
            case 'partial': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Partial</Badge>
            case 'overdue': return <Badge variant="outline" className="text-red-600 border-red-600">Overdue</Badge>
            default: return <Badge variant="outline" className="text-gray-500">Unpaid</Badge>
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading orders...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
                    <p className="text-muted-foreground">
                        {currentLocationId
                            ? 'Showing orders for selected location'
                            : 'Manage your customer orders and fulfillment (all locations)'}
                    </p>
                </div>
                <Link href="/dashboard/sales/orders/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Order
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">
                        Recent Orders
                    </CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by order number or customer..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 w-[250px]"
                            />
                        </div>
                        <ListSortControls
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSortByChange={setSortBy}
                            onSortOrderChange={setSortOrder}
                            options={[
                                { value: 'created_at', label: 'Date Added' },
                                { value: 'order_date', label: 'Order Date' },
                                { value: 'delivery_date', label: 'Delivery Date' },
                                { value: 'order_number', label: 'Order #' },
                                { value: 'total_amount', label: 'Total Amount' },
                                { value: 'status', label: 'Status' },
                                { value: 'payment_status', label: 'Payment Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedOrders?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedOrders?.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>{formatDate(order.order_date)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{order.customers?.name}</div>
                                            <div className="text-xs text-muted-foreground">{order.customers?.customer_code}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell>{getPaymentBadge(order.payment_status)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            Rs. {order.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/sales/orders/${order.id}`}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                {(deliveredOrderIds.has(order.id) || invoicedOrderIds.has(order.id)) ? (
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
                                                {deliveredOrderIds.has(order.id) ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled
                                                        title="Delivery note already created for this order"
                                                    >
                                                        <Truck className="mr-2 h-4 w-4" />
                                                        Delivery
                                                    </Button>
                                                ) : (
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/dashboard/sales/deliveries/new?order_id=${order.id}`}>
                                                            <Truck className="mr-2 h-4 w-4" />
                                                            Delivery
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleGenerateInvoice(order.id)}
                                                    disabled={generateInvoice.isPending || invoicedOrderIds.has(order.id)}
                                                    title={invoicedOrderIds.has(order.id) ? 'Invoice already created for this order' : 'Generate invoice'}
                                                >
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Invoice
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(order.id)}
                                                >
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
