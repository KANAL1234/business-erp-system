'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRecalculateAccountBalances } from '@/lib/queries/chart-of-accounts'
import { FileDown, Calculator } from 'lucide-react'

export default function TrialBalancePage() {
    const recalcBalances = useRecalculateAccountBalances()
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0])

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['trial-balance', asOfDate],
        queryFn: async () => {
            const supabase = createClient()
            const { data, error } = await supabase.rpc('get_trial_balance_as_of', { p_as_of: asOfDate })
            if (error) throw error
            return data || []
        },
    })

    const totalDebit = rows.reduce((sum: number, row: any) => sum + (row.debit || 0), 0)
    const totalCredit = rows.reduce((sum: number, row: any) => sum + (row.credit || 0), 0)

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Trial Balance</h1>
                    <p className="text-muted-foreground">Verify that debits equal credits</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => recalcBalances.mutate()}
                        disabled={recalcBalances.isPending}
                    >
                        Refresh Balances
                    </Button>
                    <Button variant="outline">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Report Parameters</CardTitle>
                    <CardDescription>Select date range for the report</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="asOfDate">As of Date</Label>
                            <Input
                                id="asOfDate"
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Trial Balance Report</span>
                        {isBalanced ? (
                            <span className="text-sm font-normal text-green-600 flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                Balanced ✓
                            </span>
                        ) : (
                            <span className="text-sm font-normal text-red-600 flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                Not Balanced!
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>As of {new Date(asOfDate).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading report...</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account Code</TableHead>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead className="text-right">Debit</TableHead>
                                        <TableHead className="text-right">Credit</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.filter((row: any) => (row.debit || 0) !== 0 || (row.credit || 0) !== 0).map((row: any) => (
                                        <TableRow key={row.account_id}>
                                            <TableCell className="font-mono">{row.account_code}</TableCell>
                                            <TableCell>{row.account_name}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {row.debit > 0 ? `PKR ${row.debit.toLocaleString()}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {row.credit > 0 ? `PKR ${row.credit.toLocaleString()}` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold border-t-2">
                                        <TableCell colSpan={2}>Total</TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {totalDebit.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {totalCredit.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="font-bold bg-slate-50">
                                        <TableCell colSpan={2}>Difference</TableCell>
                                        <TableCell colSpan={2} className={`text-right font-mono ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                                            PKR {Math.abs(totalDebit - totalCredit).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            {!isBalanced && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-800">
                                        <strong>Warning:</strong> The trial balance is not balanced. Please review your journal entries.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
