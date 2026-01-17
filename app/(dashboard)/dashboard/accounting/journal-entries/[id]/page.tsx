'use client'

import { use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
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
import { PermissionGuard } from '@/components/permission-guard'
import {
    useJournalEntry,
    usePostJournalEntry,
    useDeleteJournalEntry,
    useReverseJournalEntry
} from '@/lib/queries/journal-entries'
import { formatDate } from '@/lib/utils'
import {
    ArrowLeft,
    Printer,
    FileDown,
    Send,
    Pencil,
    Trash2,
    RotateCcw,
    BookOpen,
    Eye
} from 'lucide-react'

interface PageProps {
    params: Promise<{ id: string }>
}

export default function JournalEntryDetailPage({ params }: PageProps) {
    const { id } = use(params)

    return (
        <PermissionGuard permission="accounting.journal_entries.read">
            <JournalEntryDetail entryId={id} />
        </PermissionGuard>
    )
}

function JournalEntryDetail({ entryId }: { entryId: string }) {
    const router = useRouter()
    const printRef = useRef<HTMLDivElement>(null)

    const { data: entry, isLoading, error } = useJournalEntry(entryId)
    const postEntry = usePostJournalEntry()
    const deleteEntry = useDeleteJournalEntry()
    const reverseEntry = useReverseJournalEntry()

    const handlePrint = () => {
        window.print()
    }

    const handleDownloadPDF = async () => {
        const { jsPDF } = await import('jspdf')
        const doc = new jsPDF()

        if (!entry) return

        // Header
        doc.setFontSize(18)
        doc.text('Journal Entry', 105, 20, { align: 'center' })

        doc.setFontSize(12)
        doc.text(`Journal #: ${entry.journal_number}`, 20, 35)
        doc.text(`Date: ${formatDate(entry.journal_date)}`, 20, 42)
        doc.text(`Type: ${getTypeLabel(entry.journal_type)}`, 20, 49)
        doc.text(`Status: ${entry.status.toUpperCase()}`, 20, 56)

        if (entry.narration) {
            doc.text(`Narration: ${entry.narration}`, 20, 63)
        }

        // Table header
        let y = 80
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Account', 20, y)
        doc.text('Description', 80, y)
        doc.text('Debit', 140, y, { align: 'right' })
        doc.text('Credit', 180, y, { align: 'right' })

        doc.line(20, y + 2, 190, y + 2)

        // Table rows
        doc.setFont('helvetica', 'normal')
        y += 10

        entry.journal_entry_lines?.forEach((line) => {
            doc.text(`${line.chart_of_accounts.account_code} - ${line.chart_of_accounts.account_name}`, 20, y)
            doc.text(line.description || '', 80, y)
            doc.text(line.debit_amount ? `PKR ${line.debit_amount.toLocaleString()}` : '', 140, y, { align: 'right' })
            doc.text(line.credit_amount ? `PKR ${line.credit_amount.toLocaleString()}` : '', 180, y, { align: 'right' })
            y += 8
        })

        // Totals
        doc.line(20, y, 190, y)
        y += 8
        doc.setFont('helvetica', 'bold')
        doc.text('Total', 80, y)
        doc.text(`PKR ${entry.total_debit.toLocaleString()}`, 140, y, { align: 'right' })
        doc.text(`PKR ${entry.total_credit.toLocaleString()}`, 180, y, { align: 'right' })

        // Footer
        y += 20
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated on ${new Date().toLocaleString()}`, 20, y)

        doc.save(`${entry.journal_number}.pdf`)
    }

    const handlePost = async () => {
        await postEntry.mutateAsync(entryId)
    }

    const handleDelete = async () => {
        await deleteEntry.mutateAsync(entryId)
        router.push('/dashboard/accounting/journal-entries')
    }

    const handleReverse = async () => {
        const result = await reverseEntry.mutateAsync(entryId)
        if (result?.id) {
            router.push(`/dashboard/accounting/journal-entries/${result.id}`)
        }
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'draft': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'posted': 'bg-green-100 text-green-800 border-green-300',
            'cancelled': 'bg-red-100 text-red-800 border-red-300'
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'OPENING': 'Opening Balance',
            'MANUAL': 'Manual Entry',
            'AUTO': 'Automatic',
            'ADJUSTMENT': 'Adjustment',
            'CLOSING': 'Closing Entry',
            'REVERSAL': 'Reversal Entry'
        }
        return labels[type] || type
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-slate-600">Loading journal entry...</p>
                </div>
            </div>
        )
    }

    if (error || !entry) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <h2 className="text-xl font-semibold text-slate-900">Journal Entry Not Found</h2>
                <p className="text-slate-600 mt-2">The requested journal entry could not be found.</p>
                <Button asChild className="mt-4">
                    <Link href="/dashboard/accounting/journal-entries">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Journal Entries
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/accounting/journal-entries">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {entry.journal_number}
                            </h1>
                            <Badge className={getStatusBadge(entry.status)} variant="outline">
                                {entry.status.toUpperCase()}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {getTypeLabel(entry.journal_type)} • {formatDate(entry.journal_date)}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Standard Actions - Always Available */}
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>

                    <Separator orientation="vertical" className="h-8 mx-2" />

                    {/* Status-Based Actions */}
                    {entry.status === 'draft' && (
                        <>
                            <PermissionGuard permission="accounting.journal_entries.post">
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handlePost}
                                    disabled={postEntry.isPending}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    {postEntry.isPending ? 'Posting...' : 'Post Entry'}
                                </Button>
                            </PermissionGuard>

                            <PermissionGuard permission="accounting.journal_entries.write">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/accounting/journal-entries/${entryId}/edit`}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </Link>
                                </Button>
                            </PermissionGuard>

                            <PermissionGuard permission="accounting.journal_entries.delete">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete journal entry <strong>{entry.journal_number}</strong>?
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-red-600 hover:bg-red-700"
                                                disabled={deleteEntry.isPending}
                                            >
                                                {deleteEntry.isPending ? 'Deleting...' : 'Delete'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </PermissionGuard>
                        </>
                    )}

                    {entry.status === 'posted' && (
                        <>
                            <PermissionGuard permission="accounting.journal_entries.reverse">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            Reverse Entry
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reverse Journal Entry?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will create a new journal entry with opposite debits and credits
                                                to reverse the effect of <strong>{entry.journal_number}</strong>.
                                                The original entry will remain unchanged.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleReverse}
                                                disabled={reverseEntry.isPending}
                                            >
                                                {reverseEntry.isPending ? 'Creating Reversal...' : 'Create Reversal'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </PermissionGuard>

                            <Button variant="outline" size="sm" asChild>
                                <Link href="/dashboard/accounting/chart-of-accounts">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    View in Ledger
                                </Link>
                            </Button>
                        </>
                    )}

                    {entry.status === 'cancelled' && (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">View Only</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Entry Details Card */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Debit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            PKR {entry.total_debit.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Credit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            PKR {entry.total_credit.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${entry.total_debit === entry.total_credit ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.total_debit === entry.total_credit ? 'Balanced' : 'Unbalanced'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Narration */}
            {entry.narration && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Narration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-700">{entry.narration}</p>
                    </CardContent>
                </Card>
            )}

            {/* Journal Entry Lines */}
            <Card ref={printRef}>
                <CardHeader>
                    <CardTitle>Journal Entry Lines</CardTitle>
                    <CardDescription>Debit and credit entries affecting general ledger accounts</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Account Code</TableHead>
                                <TableHead>Account Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Debit (PKR)</TableHead>
                                <TableHead className="text-right">Credit (PKR)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entry.journal_entry_lines?.map((line, index) => (
                                <TableRow key={line.id || index}>
                                    <TableCell className="font-mono font-medium">
                                        {line.chart_of_accounts.account_code}
                                    </TableCell>
                                    <TableCell>{line.chart_of_accounts.account_name}</TableCell>
                                    <TableCell className="text-slate-600">{line.description || '-'}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {line.debit_amount ? line.debit_amount.toLocaleString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {line.credit_amount ? line.credit_amount.toLocaleString() : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Totals Row */}
                            <TableRow className="bg-slate-50 font-semibold">
                                <TableCell colSpan={3} className="text-right">
                                    Total
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {entry.total_debit.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {entry.total_credit.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Entry Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div>
                            <p className="text-slate-500">Created</p>
                            <p className="font-medium">{formatDate(entry.created_at)}</p>
                        </div>
                        {entry.posted_at && (
                            <div>
                                <p className="text-slate-500">Posted</p>
                                <p className="font-medium">{formatDate(entry.posted_at)}</p>
                            </div>
                        )}
                        {entry.reference_number && (
                            <div>
                                <p className="text-slate-500">Reference</p>
                                <p className="font-medium">{entry.reference_number}</p>
                            </div>
                        )}
                        {entry.reference_type && (
                            <div>
                                <p className="text-slate-500">Source Type</p>
                                <p className="font-medium">{entry.reference_type}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .space-y-6, .space-y-6 * {
                        visibility: visible;
                    }
                    .space-y-6 {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    button, a[href] {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
