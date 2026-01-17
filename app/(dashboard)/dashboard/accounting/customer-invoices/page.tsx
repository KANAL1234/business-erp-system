'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCustomerInvoices, useApproveCustomerInvoice } from '@/lib/queries/customer-invoices-accounting'
import { useCreateReceiptVoucher } from '@/lib/queries/receipt-vouchers'
import { useBankAccounts } from '@/lib/queries/bank-accounts'
import { PermissionGuard } from '@/components/permission-guard'
import { FileText, Plus, CheckCircle, Eye, Download, Printer, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { generateInvoicePDF } from '@/lib/utils/export'
import { useMemo, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { ListSortControls } from '@/components/list-sort-controls'

export default function CustomerInvoicesPage() {
    return (
        <PermissionGuard permission="accounting.customer_invoices.read">
            <CustomerInvoicesContent />
        </PermissionGuard>
    )
}

function CustomerInvoicesContent() {
    const { data: invoices, isLoading } = useCustomerInvoices()
    const approveInvoice = useApproveCustomerInvoice()
    const createReceipt = useCreateReceiptVoucher()
    const { data: bankAccounts } = useBankAccounts()
    const supabase = createClient()
    const router = useRouter()
    const [paymentOpen, setPaymentOpen] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH')
    const [bankAccountId, setBankAccountId] = useState<string>('')
    const [paymentAmount, setPaymentAmount] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const sortedInvoices = useMemo(() => {
        const data = invoices ? [...invoices] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.invoice_date).getTime(),
            invoice_date: (row) => new Date(row.invoice_date).getTime(),
            due_date: (row) => new Date(row.due_date).getTime(),
            invoice_number: (row) => String(row.invoice_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            amount_due: (row) => Number(row.amount_due || 0),
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
    }, [invoices, sortBy, sortOrder])

    const handleDownload = async (invoiceId: string) => {
        const { data: invoice, error } = await supabase
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
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            toast.error('Failed to download invoice PDF')
            return
        }

        const productIds = Array.from(new Set((invoice.customer_invoice_items_accounting || [])
            .map((item: any) => item.product_id)
            .filter(Boolean)))
        const { data: products } = productIds.length
            ? await supabase.from('products').select('id, name, sku').in('id', productIds)
            : { data: [] }
        const productsById = new Map((products || []).map((product: any) => [product.id, product]))

        generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (invoice.customer_invoice_items_accounting || []).map((item: any) => ({
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
        }, {
            filename: `Invoice_${invoice.invoice_number}.pdf`,
        })
    }

    const handlePrint = async (invoiceId: string) => {
        const { data: invoice, error } = await supabase
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
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            toast.error('Failed to print invoice')
            return
        }

        const productIds = Array.from(new Set((invoice.customer_invoice_items_accounting || [])
            .map((item: any) => item.product_id)
            .filter(Boolean)))
        const { data: products } = productIds.length
            ? await supabase.from('products').select('id, name, sku').in('id', productIds)
            : { data: [] }
        const productsById = new Map((products || []).map((product: any) => [product.id, product]))

        const doc = generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            invoice_date: formatDate(invoice.invoice_date),
            due_date: formatDate(invoice.due_date),
            customer_name: invoice.customers?.name || 'Customer',
            items: (invoice.customer_invoice_items_accounting || []).map((item: any) => ({
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

        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const openPayment = (invoice: any) => {
        setSelectedInvoice(invoice)
        setPaymentMethod('CASH')
        setBankAccountId('')
        setPaymentAmount(String(Number(invoice.amount_due || 0)))
        setPaymentOpen(true)
    }

    const submitPayment = async () => {
        if (!selectedInvoice) return
        const amountDue = Number(selectedInvoice.amount_due || 0)
        if (amountDue <= 0) {
            toast.error('This invoice is already fully paid')
            return
        }
        const amount = Number(paymentAmount || 0)
        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount')
            return
        }
        if (amount > amountDue) {
            toast.error('Payment amount cannot exceed amount due')
            return
        }

        const input = {
            customerId: selectedInvoice.customer_id,
            bankAccountId: paymentMethod === 'CASH' ? undefined : (bankAccountId || undefined),
            receiptDate: new Date().toISOString().split('T')[0],
            receiptMethod: paymentMethod,
            amount,
            notes: `Payment received for ${selectedInvoice.invoice_number}`,
            invoiceAllocations: [{
                invoice_id: selectedInvoice.id,
                amount_allocated: amount
            }]
        }

        try {
            await createReceipt.mutateAsync(input)
            toast.success('Payment recorded successfully')
            setPaymentOpen(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to record payment')
        }
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'draft': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-primary/10 text-primary',
            'posted': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const getPaymentStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'unpaid': 'bg-red-100 text-red-800',
            'partial': 'bg-yellow-100 text-yellow-800',
            'paid': 'bg-green-100 text-green-800',
            'overdue': 'bg-red-100 text-red-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Invoices</h1>
                    <p className="text-muted-foreground">Manage accounts receivable</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/accounting/customer-invoices/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Invoice
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{invoices?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Receivable</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            PKR {invoices?.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0).toLocaleString() || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {invoices?.filter(i => i.payment_status === 'unpaid').length || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {invoices?.filter(i => i.payment_status === 'overdue').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">All Customer Invoices</CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <CardDescription>View and manage customer invoices</CardDescription>
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
                                { value: 'amount_due', label: 'Amount Due' },
                                { value: 'payment_status', label: 'Payment Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Sales Source</TableHead>
                                        <TableHead>Invoice Date</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                        <TableHead className="text-right">Amount Due</TableHead>
                                        <TableHead>Payment Status</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedInvoices?.map((invoice) => {
                                        const isPaid = Number(invoice.amount_due || 0) <= 0
                                        return (
                                            <TableRow key={invoice.id}>
                                                <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                                                <TableCell>{(invoice as any).customers?.name}</TableCell>
                                                <TableCell>{(invoice as any).sales_source || '-'}</TableCell>
                                                <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                                                <TableCell>{formatDate(invoice.due_date)}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {Number(invoice.total_amount || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {Number(invoice.amount_due ?? (invoice.total_amount || 0) - (invoice.amount_received || 0)).toLocaleString()}
                                        </TableCell>
                                                <TableCell>
                                                    <Badge className={getPaymentStatusBadge(invoice.payment_status)} variant="outline">
                                                        {invoice.payment_status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusBadge(invoice.status)} variant="outline">
                                                        {invoice.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const targetId = invoice.id || invoice.invoice_number
                                                                if (!targetId) {
                                                                    toast.error('Missing invoice reference')
                                                                    return
                                                                }
                                                                router.push(`/dashboard/accounting/customer-invoices/${targetId}`)
                                                            }}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openPayment(invoice)}
                                                            disabled={isPaid}
                                                            title={isPaid ? 'Invoice is already fully paid' : 'Record payment'}
                                                        >
                                                            <CreditCard className="mr-2 h-4 w-4" />
                                                            Record Payment
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handlePrint(invoice.id)}>
                                                            <Printer className="mr-2 h-4 w-4" />
                                                            Print
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handleDownload(invoice.id)}>
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    {selectedInvoice && (
                        <div className="space-y-4">
                            <div className="rounded-md border bg-slate-50 p-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Invoice</span>
                                    <span className="font-mono font-semibold">{selectedInvoice.invoice_number}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Amount Due</span>
                                    <span className="font-mono font-semibold">PKR {Number(selectedInvoice.amount_due || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {paymentMethod !== 'CASH' && (
                                <div className="space-y-2">
                                    <Label>Bank Account</Label>
                                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select bank account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(bankAccounts || []).map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.account_name} • {account.account_number}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Amount (PKR)</Label>
                                <Input
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                        <Button onClick={submitPayment} disabled={createReceipt.isPending}>
                            {createReceipt.isPending ? 'Recording...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
