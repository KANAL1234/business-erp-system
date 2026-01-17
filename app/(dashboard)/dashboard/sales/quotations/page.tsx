'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, FileText, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useSalesQuotations, useDeleteSalesQuotation } from '@/lib/queries/sales-quotations'
import { useConvertQuotationToOrder } from '@/lib/queries/sales-orders'
import { PermissionGuard } from '@/components/permission-guard'
import { formatDate } from '@/lib/utils'
import { SalesQuotation } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ListSortControls } from '@/components/list-sort-controls'

export default function SalesQuotationsPage() {
    return (
        <PermissionGuard permission="sales.quotations.read">
            <SalesQuotationsContent />
        </PermissionGuard>
    )
}

function SalesQuotationsContent() {
    const { data: quotations, isLoading } = useSalesQuotations()
    const deleteQuotation = useDeleteSalesQuotation()
    const convertToOrder = useConvertQuotationToOrder()
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()

    const handleConvert = async (quotationId: string) => {
        const { data: quotation, error } = await supabase
            .from('sales_quotations')
            .select(`
                *,
                sales_quotation_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', quotationId)
            .single()

        if (error || !quotation) {
            toast.error('Failed to load quotation for conversion')
            return
        }

        convertToOrder.mutate({
            ...quotation,
            items: quotation.sales_quotation_items || [],
        } as any)
    }

    const filteredQuotations = quotations?.filter(q =>
        q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const sortedQuotations = useMemo(() => {
        const data = filteredQuotations ? [...filteredQuotations] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.quotation_date).getTime(),
            quotation_date: (row) => new Date(row.quotation_date).getTime(),
            valid_until: (row) => new Date(row.valid_until).getTime(),
            quotation_number: (row) => String(row.quotation_number || ''),
            total_amount: (row) => Number(row.total_amount || 0),
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
    }, [filteredQuotations, sortBy, sortOrder])

    const getStatusBadge = (status: SalesQuotation['status']) => {
        switch (status) {
            case 'draft': return <Badge variant="secondary">Draft</Badge>
            case 'pending': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
            case 'approved': return <Badge className="bg-primary/50 hover:bg-primary">Approved</Badge>
            case 'rejected': return <Badge variant="destructive">Rejected</Badge>
            case 'converted': return <Badge className="bg-green-700 hover:bg-green-800">Completed</Badge>
            case 'expired': return <Badge variant="outline" className="text-gray-500">Expired</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading quotations...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Quotations</h1>
                    <p className="text-muted-foreground">Manage your sales quotations and estimates.</p>
                </div>
                <Link href="/dashboard/sales/quotations/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Quotation
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">
                        Recent Quotations
                    </CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search quotations..."
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
                                { value: 'quotation_date', label: 'Quotation Date' },
                                { value: 'valid_until', label: 'Valid Until' },
                                { value: 'quotation_number', label: 'Quotation #' },
                                { value: 'total_amount', label: 'Amount' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Valid Until</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedQuotations?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No quotations found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedQuotations?.map((quotation) => (
                                    <TableRow key={quotation.id}>
                                        <TableCell className="font-medium">
                                            {quotation.quotation_number}
                                            {quotation.reference_number && (
                                                <div className="text-xs text-muted-foreground">
                                                    Ref: {quotation.reference_number}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatDate(quotation.quotation_date)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{quotation.customers?.name}</div>
                                            <div className="text-xs text-muted-foreground">{quotation.customers?.customer_code}</div>
                                        </TableCell>
                                        <TableCell>{formatDate(quotation.valid_until)}</TableCell>
                                        <TableCell className="font-medium">
                                            Rs. {quotation.total_amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/sales/quotations/${quotation.id}`}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/sales/quotations/${quotation.id}/edit`}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={quotation.status === 'converted' || convertToOrder.isPending}
                                                    onClick={() => handleConvert(quotation.id)}
                                                >
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Convert
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={quotation.status !== 'draft' || deleteQuotation.isPending}
                                                    title={quotation.status === 'draft' ? 'Delete draft quotation' : 'Only draft quotations can be deleted'}
                                                    onClick={() => {
                                                        if (quotation.status !== 'draft') return
                                                        if (confirm('Are you sure you want to delete this draft?')) {
                                                            deleteQuotation.mutate(quotation.id)
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
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
