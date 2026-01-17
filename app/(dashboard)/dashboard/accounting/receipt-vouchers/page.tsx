'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useReceiptVouchers } from '@/lib/queries/receipt-vouchers'
import { PermissionGuard } from '@/components/permission-guard'
import { DollarSign, Calendar, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ListSortControls } from '@/components/list-sort-controls'
import { useMemo, useState } from 'react'

export default function ReceiptVouchersPage() {
    return (
        <PermissionGuard permission="accounting.receipt_vouchers.read">
            <ReceiptVouchersContent />
        </PermissionGuard>
    )
}

function ReceiptVouchersContent() {
    const { data: vouchers, isLoading } = useReceiptVouchers()
    const [sortBy, setSortBy] = useState('receipt_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const totalReceived = vouchers?.reduce((sum, v) => sum + v.amount, 0) || 0

    const sortedVouchers = useMemo(() => {
        const data = vouchers ? [...vouchers] : []
        const sorters: Record<string, (row: any) => string | number> = {
            receipt_date: (row) => new Date(row.receipt_date || row.created_at).getTime(),
            voucher_number: (row) => String(row.voucher_number || ''),
            amount: (row) => Number(row.amount || 0),
            customer: (row) => String(row.customers?.name || ''),
            method: (row) => String(row.payment_method || ''),
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
    }, [vouchers, sortBy, sortOrder])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Receipt Vouchers</h1>
                    <p className="text-muted-foreground">Customer receipts and allocations</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vouchers?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">PKR {totalReceived.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {vouchers?.filter(v => {
                                const vDate = new Date(v.receipt_date)
                                const now = new Date()
                                return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear()
                            }).length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Vouchers List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-base font-medium">Receipt History</CardTitle>
                        <CardDescription>All customer receipts with GL posting</CardDescription>
                    </div>
                    <ListSortControls
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSortByChange={setSortBy}
                        onSortOrderChange={setSortOrder}
                        options={[
                            { value: 'receipt_date', label: 'Date Added' },
                            { value: 'voucher_number', label: 'Voucher #' },
                            { value: 'customer', label: 'Customer' },
                            { value: 'amount', label: 'Amount' },
                            { value: 'method', label: 'Method' },
                        ]}
                    />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : sortedVouchers && sortedVouchers.length > 0 ? (
                        <div className="space-y-4">
                            {sortedVouchers.map((voucher: any) => (
                                <div key={voucher.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-semibold">{voucher.voucher_number}</span>
                                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                                {voucher.payment_method}
                                            </Badge>
                                            <Badge variant="outline" className="bg-primary/5 text-primary">
                                                Posted to GL
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            <span>{voucher.customers?.name}</span>
                                            <span>•</span>
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDate(voucher.receipt_date)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-600">PKR {voucher.amount.toLocaleString()}</div>
                                        {voucher.bank_accounts && (
                                            <p className="text-sm text-muted-foreground">{voucher.bank_accounts.account_name}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            No receipt vouchers found
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-primary">Automatic GL Posting</h3>
                            <p className="text-sm text-primary mt-1">
                                All receipt vouchers automatically post to the General Ledger.
                                Debit: Bank/Cash | Credit: Accounts Receivable
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
