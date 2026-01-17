'use client'

import { useMemo, useState } from 'react'
import { usePOSSales } from '@/lib/queries/pos-sales'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Receipt as ReceiptComponent } from '@/components/pos/receipt'
import { ArrowLeft, Receipt, Search, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatDate } from '@/lib/utils'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { ListSortControls } from '@/components/list-sort-controls'

export default function SalesHistoryPage() {
    return (
        <PermissionGuard permission="pos.sales.view">
            <SalesHistoryContent />
        </PermissionGuard>
    )
}

function SalesHistoryContent() {
    // Default to last 30 days to show mobile app sales
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState('sale_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const { allowedLocationIds, currentLocationId } = useLocation()

    const { data: sales, isLoading } = usePOSSales(currentLocationId || undefined, startDate, endDate)

    // Filter sales by LBAC - only show sales from allowed locations
    const accessibleSales = sales?.filter(sale =>
        allowedLocationIds.includes(sale.location_id)
    )

    // Filter by search
    const filteredSales = accessibleSales?.filter(sale => {
        const query = searchQuery.toLowerCase()
        return (
            sale.sale_number.toLowerCase().includes(query) ||
            (sale.customers?.name || '').toLowerCase().includes(query) ||
            (sale.cashier?.full_name || '').toLowerCase().includes(query)
        )
    })

    const sortedSales = useMemo(() => {
        const data = filteredSales ? [...filteredSales] : []
        const sorters: Record<string, (row: any) => string | number> = {
            sale_date: (row) => new Date(row.sale_date).getTime(),
            sale_number: (row) => String(row.sale_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
            items: (row) => Number(row.pos_sale_items?.length || 0),
            customer: (row) => String(row.customers?.name || ''),
        }
        const getValue = sorters[sortBy] || sorters.sale_date
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [filteredSales, sortBy, sortOrder])

    // Calculate summary
    const totalSales = filteredSales?.length || 0
    const totalAmount = filteredSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0
    const totalCash = filteredSales?.filter(s => s.payment_method === 'CASH')
        .reduce((sum, s) => sum + s.amount_paid, 0) || 0
    const totalCredit = filteredSales?.filter(s => s.payment_method === 'CREDIT')
        .reduce((sum, s) => sum + s.total_amount, 0) || 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
                    <p className="text-muted-foreground">Review POS sales and receipts</p>
                </div>
                <Link href="/dashboard/pos">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to POS
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSales}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rs. {totalAmount.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            Rs. {totalCash.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Credit Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            Rs. {totalCredit.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by sale #, customer, cashier..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <ListSortControls
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSortByChange={setSortBy}
                                onSortOrderChange={setSortOrder}
                                options={[
                                    { value: 'sale_date', label: 'Date Added' },
                                    { value: 'sale_number', label: 'Sale #' },
                                    { value: 'total_amount', label: 'Amount' },
                                    { value: 'items', label: 'Items' },
                                    { value: 'customer', label: 'Customer' },
                                ]}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Sales History</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Loading sales...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sale #</TableHead>
                                    <TableHead>Date/Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedSales?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                            No sales found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedSales?.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-medium">
                                                {sale.sale_number}
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(sale.sale_date)}
                                                <div className="text-xs text-gray-500">
                                                    {format(new Date(sale.sale_date), 'hh:mm a')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {sale.customers?.name || 'Walk-in'}
                                            </TableCell>
                                            <TableCell>
                                                {sale.pos_sale_items?.length || 0} items
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                Rs. {sale.total_amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        sale.payment_method === 'CASH'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {sale.payment_method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {sale.cashier?.full_name || '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedSaleId(sale.id)}
                                                >
                                                    <Receipt className="mr-2 h-4 w-4" />
                                                    Receipt
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Receipt Dialog */}
            <Dialog open={!!selectedSaleId} onOpenChange={() => setSelectedSaleId(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Sale Receipt</DialogTitle>
                    </DialogHeader>
                    {selectedSaleId && (
                        <ReceiptComponent
                            saleId={selectedSaleId}
                            onClose={() => setSelectedSaleId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
