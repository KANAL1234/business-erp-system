'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Eye, Download, CheckCircle, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
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
import { useSalesInvoices, useUpdateInvoiceStatus } from '@/lib/queries/sales-invoices'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { isPast, parseISO } from 'date-fns'
import { formatDate } from '@/lib/utils'
import { SalesInvoice } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { generateInvoicePDF } from '@/lib/utils/export'
import { ListSortControls } from '@/components/list-sort-controls'

export default function SalesInvoicesPage() {
    return (
        <PermissionGuard permission="sales.invoices.read">
            <SalesInvoicesContent />
        </PermissionGuard>
    )
}

function SalesInvoicesContent() {
    const { currentLocationId } = useLocation()
    const { data: invoices, isLoading } = useSalesInvoices()
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()
    const updateStatus = useUpdateInvoiceStatus()

    const handleDownload = async (invoiceId: string) => {
        const { data: invoice, error } = await supabase
            .from('sales_invoices')
            .select(`
                *,
                customers (
                    id,
                    name,
                    customer_code
                ),
                sales_invoice_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            toast.error('Failed to download invoice PDF')
            return
        }

        generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (invoice.sales_invoice_items || []).map((item: any) => ({
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

    const handlePrint = async (invoiceId: string) => {
        const { data: invoice, error } = await supabase
            .from('sales_invoices')
            .select(`
                *,
                customers (
                    id,
                    name,
                    customer_code
                ),
                sales_invoice_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            toast.error('Failed to print invoice')
            return
        }

        const doc = generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (invoice.sales_invoice_items || []).map((item: any) => ({
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

    const filteredInvoices = invoices?.filter(invoice => {
        // Location filter
        if (currentLocationId) {
            const locationId = (invoice as any).location_id
            if (locationId && locationId !== currentLocationId) {
                return false
            }
        }

        // Search filter
        if (searchTerm) {
            return invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                invoice.sales_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
        }

        return true
    })

    const getStatusBadge = (status: SalesInvoice['status'], dueDate: string) => {
        const isOverdue = status !== 'paid' && status !== 'void' && isPast(parseISO(dueDate));

        if (status === 'paid') return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>
        if (status === 'void') return <Badge variant="destructive">Void</Badge>
        if (isOverdue) return <Badge variant="destructive">Overdue</Badge>
        if (status === 'posted') return <Badge className="bg-primary/50 hover:bg-primary">Posted</Badge>

        return <Badge variant="secondary">Draft</Badge>
    }

    const sortedInvoices = useMemo(() => {
        const data = filteredInvoices ? [...filteredInvoices] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.invoice_date).getTime(),
            invoice_date: (row) => new Date(row.invoice_date).getTime(),
            due_date: (row) => new Date(row.due_date).getTime(),
            invoice_number: (row) => String(row.invoice_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            balance: (row) => Number(row.total_amount || 0) - Number(row.amount_paid || 0),
            status: (row) => String(row.status || ''),
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
    }, [filteredInvoices, sortBy, sortOrder])

    if (isLoading) {
        return <div className="p-8 text-center">Loading invoices...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Invoices</h1>
                    <p className="text-muted-foreground">
                        {currentLocationId
                            ? 'Showing invoices for selected location'
                            : 'Manage your sales invoices and payments (all locations)'}
                    </p>
                </div>
                <Link href="/dashboard/sales/invoices/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Invoice
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">
                        Recent Invoices
                    </CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search invoices..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                { value: 'invoice_date', label: 'Invoice Date' },
                                { value: 'due_date', label: 'Due Date' },
                                { value: 'invoice_number', label: 'Invoice #' },
                                { value: 'total_amount', label: 'Total Amount' },
                                { value: 'balance', label: 'Balance' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Based On</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedInvoices?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedInvoices?.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                        <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{invoice.customers?.name}</div>
                                            <div className="text-xs text-muted-foreground">{invoice.customers?.customer_code}</div>
                                        </TableCell>
                                        <TableCell>
                                            {invoice.sales_orders?.order_number || '-'}
                                        </TableCell>
                                        <TableCell>{formatDate(invoice.due_date)}</TableCell>
                                        <TableCell>{getStatusBadge(invoice.status, invoice.due_date)}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            Rs. {invoice.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600">
                                            Rs. {(invoice.total_amount - invoice.amount_paid).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/sales/invoices/${invoice.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePrint(invoice.id)}
                                                >
                                                    <Printer className="mr-2 h-4 w-4" />
                                                    Print
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={invoice.status === 'posted' || updateStatus.isPending}
                                                    onClick={() => updateStatus.mutate({ id: invoice.id, status: 'posted' })}
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Post
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(invoice.id)}
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
