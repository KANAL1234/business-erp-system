'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, Printer, Download, Pencil, FileText } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
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
import { formatDate } from '@/lib/utils'
import { useSalesQuotation, useDeleteSalesQuotation } from '@/lib/queries/sales-quotations'
import { useConvertQuotationToOrder } from '@/lib/queries/sales-orders'
import { PermissionGuard } from '@/components/permission-guard'
import { SalesQuotation } from '@/lib/types/database'
import { createQuotationPDF } from '@/lib/utils/export'

export default function SalesQuotationDetailsPage() {
    return (
        <PermissionGuard permission="sales.quotations.read">
            <SalesQuotationDetailsContent />
        </PermissionGuard>
    )
}

function SalesQuotationDetailsContent() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const quotationId = params?.id || ''
    const { data: quotation, isLoading } = useSalesQuotation(quotationId)
    const deleteQuotation = useDeleteSalesQuotation()
    const convertToOrder = useConvertQuotationToOrder()

    const buildQuotationPDF = () => {
        if (!quotation) return null
        return createQuotationPDF({
            quotation_number: quotation.quotation_number,
            quotation_date: new Date(quotation.quotation_date).toLocaleDateString(),
            valid_until: new Date(quotation.valid_until).toLocaleDateString(),
            reference_number: quotation.reference_number,
            customer_name: quotation.customers?.name || 'Customer',
            customer_code: quotation.customers?.customer_code || '',
            items: (quotation.sales_quotation_items || []).map((item: any) => ({
                description: item.products?.name || item.description || 'Item',
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total,
            })),
            subtotal: quotation.subtotal,
            tax_amount: quotation.tax_amount,
            discount_amount: quotation.discount_amount,
            shipping_charges: quotation.shipping_charges,
            total_amount: quotation.total_amount,
            notes: quotation.notes,
            term_and_conditions: quotation.term_and_conditions,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
    }

    const handlePrint = () => {
        const doc = buildQuotationPDF()
        if (!doc) return
        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleDownload = () => {
        const doc = buildQuotationPDF()
        if (!doc) return
        const quoteNumber = quotation?.quotation_number || 'Quotation'
        doc.save(`Quotation_${quoteNumber}.pdf`)
    }

    const statusBadge = useMemo(() => {
        const status = quotation?.status as SalesQuotation['status'] | undefined
        switch (status) {
            case 'draft': return <Badge variant="secondary">Draft</Badge>
            case 'pending': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
            case 'approved': return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>
            case 'converted': return <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>
            case 'expired': return <Badge variant="outline" className="text-gray-500">Expired</Badge>
            default: return <Badge variant="outline">{status || 'Unknown'}</Badge>
        }
    }, [quotation?.status])

    if (isLoading) {
        return <div className="p-8 text-center">Loading quotation...</div>
    }

    if (!quotation) {
        return <div className="p-8 text-center text-muted-foreground">Quotation not found.</div>
    }

    const canDelete = quotation.status === 'draft'

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/sales/quotations">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{quotation.quotation_number}</h1>
                        <p className="text-muted-foreground">Sales quotation details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    {statusBadge}
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/sales/quotations/${quotationId}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={quotation.status === 'converted' || convertToOrder.isPending}
                        onClick={() => {
                            convertToOrder.mutate({
                                ...quotation,
                                items: quotation.sales_quotation_items || [],
                            } as any)
                        }}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Convert to Order
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={!canDelete || deleteQuotation.isPending}
                        title={canDelete ? 'Delete draft quotation' : 'Only draft quotations can be deleted'}
                        onClick={() => {
                            if (!canDelete) return
                            if (confirm('Are you sure you want to delete this draft?')) {
                                deleteQuotation.mutate(quotation.id, {
                                    onSuccess: () => router.push('/dashboard/sales/quotations'),
                                })
                            }
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Draft
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Quotation Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Line Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotation.sales_quotation_items?.length ? (
                                    quotation.sales_quotation_items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.products?.name || 'Item'}
                                                {item.products?.sku && (
                                                    <div className="text-xs text-muted-foreground">{item.products.sku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>{item.description || '-'}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{item.unit_price.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{item.line_total.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                            <div className="font-medium">{quotation.customers?.name || '—'}</div>
                            <div className="text-sm text-muted-foreground">Customer Code</div>
                            <div className="font-medium">{quotation.customers?.customer_code || '—'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Quotation Date</div>
                            <div className="font-medium">{formatDate(quotation.quotation_date)}</div>
                            <div className="text-sm text-muted-foreground">Valid Until</div>
                            <div className="font-medium">{formatDate(quotation.valid_until)}</div>
                            {quotation.reference_number && (
                                <>
                                    <div className="text-sm text-muted-foreground">Reference</div>
                                    <div className="font-medium">{quotation.reference_number}</div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Totals</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{quotation.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Discount</span>
                                <span>{quotation.discount_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Tax</span>
                                <span>{quotation.tax_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span>Shipping</span>
                                <span>{quotation.shipping_charges.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-lg font-semibold border-t pt-2">
                                <span>Total</span>
                                <span>{quotation.total_amount.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {(quotation.notes || quotation.term_and_conditions) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notes & Terms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {quotation.notes && (
                            <div>
                                <div className="text-sm text-muted-foreground">Notes</div>
                                <div className="whitespace-pre-line">{quotation.notes}</div>
                            </div>
                        )}
                        {quotation.term_and_conditions && (
                            <div>
                                <div className="text-sm text-muted-foreground">Terms & Conditions</div>
                                <div className="whitespace-pre-line">{quotation.term_and_conditions}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
