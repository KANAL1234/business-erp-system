'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useChartOfAccounts } from '@/lib/queries/chart-of-accounts'
import { useCreateJournalEntry } from '@/lib/queries/journal-entries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, AlertCircle, Save, FileText } from 'lucide-react'
import Link from 'next/link'
import { PermissionGuard } from '@/components/permission-guard'

type JournalLine = {
    id: string
    account_id: string
    account_name: string
    account_code: string
    description: string
    debit_amount: number
    credit_amount: number
}

type FormData = {
    journal_date: string
    reference_number: string
    narration: string
}

export default function NewJournalEntryPage() {
    return (
        <PermissionGuard permission="accounting.journal_entries.create">
            <NewJournalEntryContent />
        </PermissionGuard>
    )
}

function NewJournalEntryContent() {
    const router = useRouter()
    const { data: accounts } = useChartOfAccounts()
    const createEntry = useCreateJournalEntry()

    const [lines, setLines] = useState<JournalLine[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState('')
    const [accountSearch, setAccountSearch] = useState('')
    const [lineDescription, setLineDescription] = useState('')
    const [debitAmount, setDebitAmount] = useState('')
    const [creditAmount, setCreditAmount] = useState('')

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            journal_date: new Date().toISOString().split('T')[0],
            reference_number: '',
            narration: '',
        }
    })

    // Filter out accounts already used in lines
    const availableAccounts = accounts?.filter(
        acc => !lines.some(line => line.account_id === acc.id)
    )
    const filteredAccounts = availableAccounts?.filter((account) => {
        const query = accountSearch.trim().toLowerCase()
        if (!query) return true
        return `${account.account_code} ${account.account_name}`.toLowerCase().includes(query)
    })

    const handleAddLine = () => {
        if (!selectedAccountId) {
            toast.error('Please select an account')
            return
        }

        const debit = parseFloat(debitAmount) || 0
        const credit = parseFloat(creditAmount) || 0

        if (debit === 0 && credit === 0) {
            toast.error('Please enter either debit or credit amount')
            return
        }

        if (debit > 0 && credit > 0) {
            toast.error('A line cannot have both debit and credit amounts')
            return
        }

        const account = accounts?.find(a => a.id === selectedAccountId)
        if (!account) return

        const newLine: JournalLine = {
            id: Math.random().toString(),
            account_id: selectedAccountId,
            account_name: account.account_name,
            account_code: account.account_code,
            description: lineDescription || '',
            debit_amount: debit,
            credit_amount: credit,
        }

        setLines([...lines, newLine])
        setSelectedAccountId('')
        setAccountSearch('')
        setLineDescription('')
        setDebitAmount('')
        setCreditAmount('')
    }

    const handleRemoveLine = (id: string) => {
        setLines(lines.filter(line => line.id !== id))
    }

    const totalDebits = lines.reduce((sum, line) => sum + line.debit_amount, 0)
    const totalCredits = lines.reduce((sum, line) => sum + line.credit_amount, 0)
    const difference = totalDebits - totalCredits
    const isBalanced = Math.abs(difference) < 0.01

    const onSubmit = async (data: FormData, status: 'draft' | 'posted') => {
        if (lines.length < 2) {
            toast.error('Journal entry must have at least 2 lines')
            return
        }

        if (!isBalanced) {
            toast.error('Journal entry is not balanced. Debits must equal credits.')
            return
        }

        try {
            await createEntry.mutateAsync({
                entry: {
                    journal_type: 'MANUAL',
                    journal_date: data.journal_date,
                    reference_number: data.reference_number || undefined,
                    narration: data.narration || undefined,
                    status,
                },
                lines: lines.map(line => ({
                    account_id: line.account_id,
                    description: line.description,
                    debit_amount: line.debit_amount,
                    credit_amount: line.credit_amount,
                }))
            })

            router.push('/dashboard/accounting/journal-entries')
        } catch (error) {
            // Error handled by mutation
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/accounting/journal-entries">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">New Journal Entry</h2>
                    <p className="text-slate-500 mt-1">Create a manual general ledger posting</p>
                </div>
            </div>

            <form onSubmit={handleSubmit((data) => onSubmit(data, 'draft'))} className="space-y-6">
                {/* Header Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-slate-400" />
                            Entry Details
                        </CardTitle>
                        <CardDescription>Basic information about this journal entry</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="journal_date">Date *</Label>
                                <Input
                                    id="journal_date"
                                    type="date"
                                    {...register('journal_date', { required: 'Date is required' })}
                                    className={errors.journal_date ? 'border-red-500' : ''}
                                />
                                {errors.journal_date && (
                                    <p className="text-xs text-red-500 font-medium">{errors.journal_date.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reference_number">Reference Number</Label>
                                <Input
                                    id="reference_number"
                                    {...register('reference_number')}
                                    placeholder="e.g. REF-001"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="narration">Narration</Label>
                            <Textarea
                                id="narration"
                                {...register('narration')}
                                placeholder="Brief description of this journal entry..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Add Line Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Add Journal Lines</CardTitle>
                        <CardDescription>Select accounts and enter debit or credit amounts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label>Account *</Label>
                                <Select
                                    value={selectedAccountId}
                                    onValueChange={(value) => {
                                        setSelectedAccountId(value)
                                        setAccountSearch('')
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2 border-b">
                                            <Input
                                                value={accountSearch}
                                                onChange={(e) => setAccountSearch(e.target.value)}
                                                onKeyDown={(e) => e.stopPropagation()}
                                                placeholder="Search accounts..."
                                                className="h-8"
                                            />
                                        </div>
                                        {filteredAccounts?.length ? (
                                            filteredAccounts.map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.account_code} - {account.account_name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="px-2 py-3 text-sm text-slate-500">
                                                No accounts match your search.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Debit (Rs.)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={debitAmount}
                                    onChange={(e) => {
                                        setDebitAmount(e.target.value)
                                        if (e.target.value) setCreditAmount('')
                                    }}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Credit (Rs.)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={creditAmount}
                                    onChange={(e) => {
                                        setCreditAmount(e.target.value)
                                        if (e.target.value) setDebitAmount('')
                                    }}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex items-end">
                                <Button type="button" onClick={handleAddLine} className="w-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Line Description</Label>
                            <Input
                                value={lineDescription}
                                onChange={(e) => setLineDescription(e.target.value)}
                                placeholder="Optional description for this line..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Journal Lines Table */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg">Journal Lines</CardTitle>
                                <CardDescription>Review and verify all entries</CardDescription>
                            </div>
                            <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-sm">
                                {isBalanced ? 'Balanced' : 'Not Balanced'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {lines.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No journal lines added yet</p>
                                <p className="text-sm">Add at least 2 lines to create a journal entry</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Debit</TableHead>
                                        <TableHead className="text-right">Credit</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell>
                                                <div className="font-medium">{line.account_code}</div>
                                                <div className="text-sm text-slate-500">{line.account_name}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {line.description || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {line.debit_amount > 0 ? line.debit_amount.toFixed(2) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {line.credit_amount > 0 ? line.credit_amount.toFixed(2) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveLine(line.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-50 font-bold">
                                        <TableCell colSpan={2} className="text-right">TOTALS</TableCell>
                                        <TableCell className="text-right font-mono text-lg">
                                            {totalDebits.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-lg">
                                            {totalCredits.toFixed(2)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Balance Alert */}
                {lines.length > 0 && !isBalanced && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Entry is not balanced. Difference: Rs. {Math.abs(difference).toFixed(2)}
                            {difference > 0 ? ' (Debits exceed Credits)' : ' (Credits exceed Debits)'}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <Link href="/dashboard/accounting/journal-entries">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={createEntry.isPending || lines.length < 2 || !isBalanced}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit((data) => onSubmit(data, 'posted'))}
                        disabled={createEntry.isPending || lines.length < 2 || !isBalanced}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        {createEntry.isPending ? 'Posting...' : 'Post Entry'}
                    </Button>
                </div>
            </form>
        </div>
    )
}
