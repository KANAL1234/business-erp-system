'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileText, Receipt, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
    id: string
    date: string
    type: 'INVOICE' | 'PAYMENT'
    reference: string
    amount: number
    status: string
    notes?: string
}

interface CustomerLedgerTableProps {
    transactions: Transaction[]
}

export function CustomerLedgerTable({ transactions }: CustomerLedgerTableProps) {
    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white border rounded-md">
                <div className="p-3 bg-slate-50 rounded-full mb-3">
                    <AlertCircle className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900">No transactions found</p>
                <p className="text-xs text-slate-500">History will appear once invoices or payments are recorded.</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border bg-white overflow-hidden shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Debit (Sales)</TableHead>
                        <TableHead className="text-right">Credit (Paid)</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx) => (
                        <TableRow key={`${tx.type}-${tx.id}`} className="hover:bg-slate-50/50">
                            <TableCell className="text-sm text-slate-600">
                                {new Date(tx.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "p-1.5 rounded-md",
                                        tx.type === 'INVOICE' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {tx.type === 'INVOICE' ? (
                                            <FileText className="h-3.5 w-3.5" />
                                        ) : (
                                            <Receipt className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold tracking-tight uppercase">
                                        {tx.type}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{tx.reference}</p>
                                    {tx.notes && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{tx.notes}</p>}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-red-600">
                                {tx.type === 'INVOICE' ? `+ ${tx.amount.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium text-emerald-600">
                                {tx.type === 'PAYMENT' ? `- ${tx.amount.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] uppercase",
                                        tx.status === 'posted' ? "bg-primary/5 text-primary border-primary/20" :
                                            tx.status === 'draft' ? "bg-slate-100 text-slate-600" :
                                                "bg-slate-50"
                                    )}
                                >
                                    {tx.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
