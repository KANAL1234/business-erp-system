'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/utils/export'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'

export default function CustomerInvoiceDetailPage() {
    const [invoice, setInvoice] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [productsById, setProductsById] = useState<Map<string, any>>(new Map())
    const [itemLines, setItemLines] = useState<any[]>([])
    const supabase = createClient()
    const params = useParams<{ id?: string }>()
    const effectiveId = params?.id ? decodeURIComponent(params.id) : undefined

    const isUuid = (value: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    useEffect(() => {
        const loadInvoice = async () => {
            setLoading(true)
            if (!effectiveId || effectiveId === 'undefined') {
                toast.error('Invalid invoice reference')
                setInvoice(null)
                setLoading(false)
                return
            }

            const query = supabase
                .from('customer_invoices_accounting')
                .select(`
                    *,
                    customers (
                        id,
                        name,
                        customer_code
                    ),
                    customer_invoice_items_accounting (*)
                `)

            const { data, error } = isUuid(effectiveId)
                ? await query.eq('id', effectiveId).single()
                : await query.eq('invoice_number', effectiveId).single()

            if (error) {
                console.error('Failed to load customer invoice', error)
                toast.error(error.message || 'Failed to load invoice')
                setInvoice(null)
                setProductsById(new Map())
                setItemLines([])
            } else {
                setInvoice(data)
                let items = data?.customer_invoice_items_accounting || []

                if (items.length === 0 && data?.invoice_number) {
                    if (data.invoice_number.startsWith('INV-POS')) {
                        const { data: posSale, error: posError } = await supabase
                            .from('pos_sales')
                            .select('id')
                            .eq('sale_number', data.invoice_number)
                            .maybeSingle()
                        if (posError) {
                            console.error('Failed to load POS sale for invoice', posError)
                        } else if (posSale?.id) {
                            const { data: posItems, error: posItemsError } = await supabase
                                .from('pos_sale_items')
                                .select('id, product_id, quantity, unit_price, line_total')
                                .eq('sale_id', posSale.id)
                            if (posItemsError) {
                                console.error('Failed to load POS sale items for invoice', posItemsError)
                            } else {
                                items = posItems || []
                            }
                        }
                    } else if (data.invoice_number.startsWith('INV-SALE')) {
                        const { data: salesInvoice, error: salesError } = await supabase
                            .from('sales_invoices')
                            .select('id')
                            .eq('invoice_number', data.invoice_number)
                            .maybeSingle()
                        if (salesError) {
                            console.error('Failed to load sales invoice for customer invoice', salesError)
                        } else if (salesInvoice?.id) {
                            const { data: salesItems, error: salesItemsError } = await supabase
                                .from('sales_invoice_items')
                                .select('id, product_id, quantity, unit_price, line_total')
                                .eq('invoice_id', salesInvoice.id)
                            if (salesItemsError) {
                                console.error('Failed to load sales invoice items', salesItemsError)
                            } else {
                                items = salesItems || []
                            }
                        }
                    }
                }

                setItemLines(items || [])

                const productIds = Array.from(new Set((items || [])
                    .map((item: any) => item.product_id)
                    .filter(Boolean)))
                if (productIds.length) {
                    const { data: products, error: productsError } = await supabase
                        .from('products')
                        .select('id, name, sku')
                        .in('id', productIds)
                    if (productsError) {
                        console.error('Failed to load products for invoice', productsError)
                        setProductsById(new Map())
                    } else {
                        setProductsById(new Map((products || []).map((product: any) => [product.id, product])))
                    }
                } else {
                    setProductsById(new Map())
                }
            }
            setLoading(false)
        }

        loadInvoice()
    }, [effectiveId, supabase])

    const buildPDF = () => {
        if (!invoice) return null
        return generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (itemLines || []).map((item: any) => ({
                description: productsById.get(item.product_id)?.name || item.description || 'Item',
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
    }

    const handleDownload = () => {
        const doc = buildPDF()
        if (!doc) return
        doc.save(`Invoice_${invoice.invoice_number}.pdf`)
    }

    const handlePrint = () => {
        const doc = buildPDF()
        if (!doc) return
        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const paymentBadge = (status: string) => {
        const map: Record<string, string> = {
            unpaid: 'bg-red-100 text-red-800',
            partial: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            overdue: 'bg-red-100 text-red-800',
        }
        return map[status] || 'bg-gray-100 text-gray-800'
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading invoice...</div>
    }

    if (!invoice) {
        return <div className="p-8 text-center text-muted-foreground">Invoice not found.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/accounting/customer-invoices">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
                        <p className="text-muted-foreground">Customer invoice details</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div>
                        <div className="text-sm text-muted-foreground">Customer</div>
                        <div className="font-medium">{invoice.customers?.name || 'Customer'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Invoice Date</div>
                        <div className="font-medium">{formatDate(invoice.invoice_date)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Due Date</div>
                        <div className="font-medium">{formatDate(invoice.due_date)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="font-medium">PKR {Number(invoice.total_amount || 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Amount Due</div>
                        <div className="font-medium">PKR {Number(invoice.amount_due || 0).toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Payment Status</div>
                        <Badge variant="outline" className={paymentBadge(invoice.payment_status)}>
                            {invoice.payment_status}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Invoice Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(itemLines || []).length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                        No items recorded for this invoice.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                itemLines.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{productsById.get(item.product_id)?.name || item.description || 'Item'}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">PKR {Number(item.unit_price || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">PKR {Number(item.line_total || 0).toLocaleString()}</TableCell>
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
