'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, RotateCcw, Download } from 'lucide-react'
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
import { PermissionGuard } from '@/components/permission-guard'
import { useSalesReturns } from '@/lib/queries/sales-returns'
import { useLocation } from '@/components/providers/location-provider'
import { formatDate } from '@/lib/utils'
import { SalesReturn } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { createSalesReturnPDF } from '@/lib/utils/export'
import { ListSortControls } from '@/components/list-sort-controls'

export default function SalesReturnsPage() {
    return (
        <PermissionGuard permission="sales.returns.read">
            <SalesReturnsContent />
        </PermissionGuard>
    )
}

function SalesReturnsContent() {
    const { currentLocationId } = useLocation()
    const { data: returns, isLoading } = useSalesReturns()
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()

    const handleDownload = async (returnId: string) => {
        const { data: salesReturn, error } = await supabase
            .from('sales_returns')
            .select(`
                *,
                customers (
                    id,
                    name,
                    customer_code
                ),
                sales_invoices (invoice_number),
                sales_return_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', returnId)
            .single()

        if (error || !salesReturn) {
            toast.error('Failed to download return PDF')
            return
        }

        const doc = createSalesReturnPDF({
            return_number: salesReturn.return_number,
            return_date: formatDate(salesReturn.return_date),
            status: salesReturn.status,
            reason: salesReturn.reason,
            customer_name: salesReturn.customers?.name || 'Customer',
            customer_code: salesReturn.customers?.customer_code || '',
            invoice_number: salesReturn.sales_invoices?.invoice_number || '',
            refund_amount: salesReturn.refund_amount,
            items: (salesReturn.sales_return_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_returned: item.quantity_returned,
                condition: item.condition,
                action: item.action,
            })),
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })

        doc.save(`SalesReturn_${salesReturn.return_number}.pdf`)
    }

    const filteredReturns = returns?.filter(ret => {
        // Location filter
        if (currentLocationId) {
            const locationId = (ret as any).warehouse_location_id || (ret as any).location_id
            if (locationId && locationId !== currentLocationId) {
                return false
            }
        }

        // Search filter
        if (searchTerm) {
            return ret.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ret.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ret.sales_invoices?.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
        }

        return true
    })

    const sortedReturns = useMemo(() => {
        const data = filteredReturns ? [...filteredReturns] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.return_date).getTime(),
            return_date: (row) => new Date(row.return_date).getTime(),
            return_number: (row) => String(row.return_number || ''),
            status: (row) => String(row.status || ''),
            refund_amount: (row) => Number(row.refund_amount || 0),
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
    }, [filteredReturns, sortBy, sortOrder])

    const getStatusBadge = (status: SalesReturn['status']) => {
        switch (status) {
            case 'draft': return <Badge variant="secondary">Draft</Badge>
            case 'approved': return <Badge className="bg-primary/50">Approved</Badge>
            case 'completed': return <Badge className="bg-green-600">Completed</Badge>
            case 'refunded': return <Badge className="bg-primary">Refunded</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading returns...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Returns</h1>
                    <p className="text-muted-foreground">
                        {currentLocationId
                            ? 'Showing returns for selected location'
                            : 'Manage product returns and refunds (all locations)'}
                    </p>
                </div>
                <Link href="/dashboard/sales/returns/new">
                    <Button variant="destructive">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Return
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">
                        Recent Returns
                    </CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search returns..."
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
                                { value: 'return_date', label: 'Return Date' },
                                { value: 'return_number', label: 'Return #' },
                                { value: 'refund_amount', label: 'Refund Amount' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Return #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Refund Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedReturns?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No returns found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedReturns?.map((ret) => (
                                    <TableRow key={ret.id}>
                                        <TableCell className="font-medium">{ret.return_number}</TableCell>
                                        <TableCell>{formatDate(ret.return_date)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{ret.customers?.name}</div>
                                            <div className="text-xs text-muted-foreground">{ret.customers?.customer_code}</div>
                                        </TableCell>
                                        <TableCell>{ret.sales_invoices?.invoice_number || 'N/A'}</TableCell>
                                        <TableCell className="font-medium">Rs. {ret.refund_amount.toLocaleString()}</TableCell>
                                        <TableCell>{getStatusBadge(ret.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/sales/returns/${ret.id}`}>
                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(ret.id)}
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
