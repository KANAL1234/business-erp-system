'use client'

import { useState } from 'react'
import { Plus, Wallet, ArrowUpRight, History, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAdvances } from '@/lib/queries/hr'
import { PermissionGuard } from '@/components/permission-guard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { AdvanceDialog } from '@/components/hr/advances/advance-dialog'

export default function AdvancesPage() {
    const { data: advances, isLoading } = useAdvances()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <PermissionGuard permission="hr.advances.create">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Advances & Loans</h1>
                        <p className="text-muted-foreground">
                            Manage employee advance requests and track repayments.
                        </p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Issue Advance/Loan
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Advances</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {advances?.filter(a => a.status === 'ACTIVE').length || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">
                                {formatCurrency(advances?.reduce((sum, a) => sum + (a.status === 'ACTIVE' ? Number(a.balance) : 0), 0) || 0)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Recovered this Month</CardTitle>
                            <History className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {/* This would need more data from deductions table */}
                                {formatCurrency(0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-base font-medium">Advance List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Advance #</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Recovered</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead>Installments</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            Loading advances...
                                        </TableCell>
                                    </TableRow>
                                ) : advances?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No advances or loans found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    advances?.map((adv) => (
                                        <TableRow key={adv.id}>
                                            <TableCell className="font-medium">{adv.advance_number}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{adv.employee.full_name}</div>
                                                <div className="text-xs text-muted-foreground">{adv.employee.employee_code}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{adv.advance_type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(Number(adv.amount))}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(Number(adv.amount_recovered))}</TableCell>
                                            <TableCell className="text-right font-bold text-destructive">{formatCurrency(Number(adv.balance))}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {adv.installments} months
                                                    <div className="text-xs text-muted-foreground">({formatCurrency(Number(adv.installment_amount))}/mo)</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {adv.status === 'COMPLETED' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-yellow-600" />
                                                    )}
                                                    <span className="text-sm font-medium">{adv.status}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <AdvanceDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                />
            </div>
        </PermissionGuard>
    )
}
