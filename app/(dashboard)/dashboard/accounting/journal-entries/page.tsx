'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useJournalEntries, usePostJournalEntry } from '@/lib/queries/journal-entries'
import { PermissionGuard } from '@/components/permission-guard'
import { FileText, Plus, CheckCircle, Eye, Send } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { ListSortControls } from '@/components/list-sort-controls'
import { useMemo, useState } from 'react'

export default function JournalEntriesPage() {
    return (
        <PermissionGuard permission="accounting.journal_entries.read">
            <JournalEntriesContent />
        </PermissionGuard>
    )
}

function JournalEntriesContent() {
    const { data: entries, isLoading } = useJournalEntries()
    const postEntry = usePostJournalEntry()
    const [sortBy, setSortBy] = useState('journal_date')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'draft': 'bg-yellow-100 text-yellow-800',
            'posted': 'bg-green-100 text-green-800',
            'cancelled': 'bg-red-100 text-red-800'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'OPENING': 'Opening',
            'MANUAL': 'Manual',
            'AUTO': 'Automatic',
            'ADJUSTMENT': 'Adjustment',
            'CLOSING': 'Closing'
        }
        return labels[type] || type
    }

    const sortedEntries = useMemo(() => {
        const data = entries ? [...entries] : []
        const sorters: Record<string, (row: any) => string | number> = {
            journal_date: (row) => new Date(row.journal_date).getTime(),
            journal_number: (row) => String(row.journal_number || ''),
            journal_type: (row) => String(row.journal_type || ''),
            total_debit: (row) => Number(row.total_debit || 0),
            total_credit: (row) => Number(row.total_credit || 0),
            status: (row) => String(row.status || ''),
        }
        const getValue = sorters[sortBy] || sorters.journal_date
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [entries, sortBy, sortOrder])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
                    <p className="text-muted-foreground">View and manage general ledger postings</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/accounting/journal-entries/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Journal Entry
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{entries?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posted</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {entries?.filter(e => e.status === 'posted').length || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Draft</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {entries?.filter(e => e.status === 'draft').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">All Journal Entries</CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <CardDescription>View all general ledger postings</CardDescription>
                        <ListSortControls
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSortByChange={setSortBy}
                            onSortOrderChange={setSortOrder}
                            options={[
                                { value: 'journal_date', label: 'Date Added' },
                                { value: 'journal_number', label: 'Journal #' },
                                { value: 'journal_type', label: 'Type' },
                                { value: 'total_debit', label: 'Debit' },
                                { value: 'total_credit', label: 'Credit' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Journal #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Narration</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedEntries?.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-mono font-medium">{entry.journal_number}</TableCell>
                                        <TableCell>{formatDate(entry.journal_date)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{getTypeLabel(entry.journal_type)}</Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">{entry.narration}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {entry.total_debit.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {entry.total_credit.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusBadge(entry.status)} variant="outline">
                                                {entry.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/accounting/journal-entries/${entry.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                {entry.status === 'draft' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => postEntry.mutate(entry.id)}
                                                        disabled={postEntry.isPending}
                                                    >
                                                        <Send className="mr-2 h-4 w-4" />
                                                        Post
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
