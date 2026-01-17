'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useVendorBills, useApproveVendorBill, useCancelVendorBill } from '@/lib/queries/vendor-bills'
import { useCreatePaymentVoucher } from '@/lib/queries/payment-vouchers'
import { useBankAccounts } from '@/lib/queries/bank-accounts'
import { PermissionGuard } from '@/components/permission-guard'
import { ListSortControls } from '@/components/list-sort-controls'
import {
    FileText,
    Plus,
    CheckCircle,
    Pencil,
    CreditCard,
    XCircle,
    Eye,
    Banknote
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { VendorBill } from '@/lib/types/database'

export default function VendorBillsPage() {
    return (
        <PermissionGuard permission="accounting.vendor_bills.read">
            <VendorBillsContent />
        </PermissionGuard>
    )
}

function VendorBillsContent() {
    const { data: bills, isLoading } = useVendorBills()
    const { data: bankAccounts } = useBankAccounts()
    const approveBill = useApproveVendorBill()
    const cancelBill = useCancelVendorBill()
    const createPayment = useCreatePaymentVoucher()

    // Payment dialog state
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [selectedBill, setSelectedBill] = useState<(VendorBill & { vendors?: { name: string } }) | null>(null)
    const [paymentForm, setPaymentForm] = useState({
        paymentMethod: 'BANK_TRANSFER' as 'CASH' | 'BANK_TRANSFER' | 'CHEQUE',
        bankAccountId: '',
        amount: 0,
        referenceNumber: '',
        paymentDate: new Date().toISOString().split('T')[0]
    })
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const openPaymentDialog = (bill: any) => {
        setSelectedBill(bill)
        setPaymentForm({
            paymentMethod: 'BANK_TRANSFER',
            bankAccountId: bankAccounts?.[0]?.id || '',
            amount: bill.amount_due,
            referenceNumber: '',
            paymentDate: new Date().toISOString().split('T')[0]
        })
        setPaymentDialogOpen(true)
    }

    const handleCreatePayment = async () => {
        if (!selectedBill) return

        await createPayment.mutateAsync({
            vendorId: selectedBill.vendor_id,
            bankAccountId: paymentForm.paymentMethod !== 'CASH' ? paymentForm.bankAccountId : undefined,
            paymentDate: paymentForm.paymentDate,
            paymentMethod: paymentForm.paymentMethod,
            amount: paymentForm.amount,
            referenceNumber: paymentForm.referenceNumber || undefined,
            billAllocations: [{
                bill_id: selectedBill.id,
                amount_allocated: paymentForm.amount
            }]
        })

        setPaymentDialogOpen(false)
        setSelectedBill(null)
    }

    const sortedBills = useMemo(() => {
        const data = bills ? [...bills] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.bill_date).getTime(),
            bill_date: (row) => new Date(row.bill_date).getTime(),
            due_date: (row) => new Date(row.due_date).getTime(),
            bill_number: (row) => String(row.bill_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            amount_due: (row) => Number(row.amount_due || 0),
            payment_status: (row) => String(row.payment_status || ''),
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
    }, [bills, sortBy, sortOrder])

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'draft': 'bg-yellow-100 text-yellow-800',
            'approved': 'bg-primary/10 text-primary',
            'posted': 'bg-primary/10 text-primary',
            'goods_received': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'draft': 'Draft',
            'approved': 'Approved',
            'posted': 'Posted',
            'goods_received': 'Goods Received',
            'cancelled': 'Cancelled'
        }
        return labels[status] || status
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
                    <h1 className="text-3xl font-bold tracking-tight">Vendor Bills</h1>
                    <p className="text-muted-foreground">Manage accounts payable</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/accounting/vendor-bills/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Vendor Bill
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bills?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            PKR {bills?.reduce((sum, bill) => sum + bill.amount_due, 0).toLocaleString() || 0}
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
                            {bills?.filter(b => b.payment_status === 'unpaid').length || 0}
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
                            {bills?.filter(b => b.payment_status === 'overdue').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">All Vendor Bills</CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <CardDescription>View and manage vendor bills</CardDescription>
                        <ListSortControls
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSortByChange={setSortBy}
                            onSortOrderChange={setSortOrder}
                            options={[
                                { value: 'created_at', label: 'Date Added' },
                                { value: 'bill_date', label: 'Bill Date' },
                                { value: 'due_date', label: 'Due Date' },
                                { value: 'bill_number', label: 'Bill #' },
                                { value: 'total_amount', label: 'Total Amount' },
                                { value: 'amount_due', label: 'Amount Due' },
                                { value: 'payment_status', label: 'Payment Status' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill #</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Bill Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-right">Amount Due</TableHead>
                                    <TableHead>Payment Status</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedBills?.map((bill) => {
                                    const isPayable = ['approved', 'posted', 'goods_received'].includes(bill.status)
                                    const canMakePayment = isPayable && bill.amount_due > 0
                                    const canEdit = bill.status === 'draft'
                                    const canCancel = bill.status !== 'draft' && bill.status !== 'cancelled'

                                    return (
                                        <TableRow key={bill.id}>
                                        <TableCell className="font-mono font-medium">{bill.bill_number}</TableCell>
                                        <TableCell>{(bill as any).vendors?.name}</TableCell>
                                        <TableCell>{formatDate(bill.bill_date)}</TableCell>
                                        <TableCell>{formatDate(bill.due_date)}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {bill.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {bill.amount_due.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getPaymentStatusBadge(bill.payment_status)} variant="outline">
                                                {bill.payment_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusBadge(bill.status)} variant="outline">
                                                {getStatusLabel(bill.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                {/* Status-based primary actions */}
                                                {bill.status === 'draft' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => approveBill.mutate(bill.id)}
                                                        disabled={approveBill.isPending}
                                                    >
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                        Approve & Post
                                                    </Button>
                                                )}

                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/dashboard/accounting/vendor-bills/${bill.id}`}>
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        View Details
                                                    </Link>
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant={bill.payment_status === 'overdue' ? 'destructive' : 'default'}
                                                    onClick={() => openPaymentDialog(bill)}
                                                    disabled={!canMakePayment}
                                                >
                                                    <CreditCard className="mr-1 h-3 w-3" />
                                                    Make Payment
                                                </Button>

                                                {canEdit && (
                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/dashboard/accounting/vendor-bills/${bill.id}/edit`}>
                                                            <Pencil className="mr-1 h-3 w-3" />
                                                            Edit
                                                        </Link>
                                                    </Button>
                                                )}

                                                {canCancel && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="sm" variant="destructive">
                                                                <XCircle className="mr-1 h-3 w-3" />
                                                                Cancel Bill
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Cancel Vendor Bill?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will cancel bill <strong>{bill.bill_number}</strong> and create
                                                                    a reversing journal entry. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Keep Bill</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => cancelBill.mutate(bill.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    Cancel Bill
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Make Payment Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            Make Payment
                        </DialogTitle>
                        <DialogDescription>
                            Create a payment voucher for {selectedBill?.bill_number}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedBill && (
                        <div className="space-y-4">
                            {/* Bill Info */}
                            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600">Vendor</span>
                                    <span className="font-medium">{(selectedBill as any).vendors?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600">Bill Total</span>
                                    <span className="font-mono">PKR {selectedBill.total_amount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-600">Amount Due</span>
                                    <span className="font-mono font-bold text-red-600">PKR {selectedBill.amount_due.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Payment Form */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="paymentDate">Payment Date</Label>
                                        <Input
                                            id="paymentDate"
                                            type="date"
                                            value={paymentForm.paymentDate}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="paymentMethod">Payment Method</Label>
                                        <Select
                                            value={paymentForm.paymentMethod}
                                            onValueChange={(value: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE') =>
                                                setPaymentForm({ ...paymentForm, paymentMethod: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CASH">Cash</SelectItem>
                                                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {paymentForm.paymentMethod !== 'CASH' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="bankAccount">Bank Account</Label>
                                        <Select
                                            value={paymentForm.bankAccountId}
                                            onValueChange={(value) => setPaymentForm({ ...paymentForm, bankAccountId: value })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select bank account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bankAccounts?.map((account: any) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.account_name} - {account.account_number}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount (PKR)</Label>
                                    <Input
                                        id="amount"
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                                        max={selectedBill.amount_due}
                                    />
                                    <p className="text-xs text-slate-500">
                                        Max: PKR {selectedBill.amount_due.toLocaleString()}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                                    <Input
                                        id="referenceNumber"
                                        placeholder="Cheque #, Transaction ID, etc."
                                        value={paymentForm.referenceNumber}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreatePayment}
                            disabled={createPayment.isPending || !paymentForm.amount}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {createPayment.isPending ? 'Processing...' : 'Create Payment Voucher'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
