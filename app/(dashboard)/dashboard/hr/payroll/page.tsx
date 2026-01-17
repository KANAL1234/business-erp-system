'use client'

import { useState } from 'react'
import { Plus, Calculator, FileText, CheckCircle, Clock, Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { usePayrollPeriods, useProcessPayroll, usePayslips } from '@/lib/queries/hr'
import { PermissionGuard } from '@/components/permission-guard'
import { formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { PayrollPeriodDialog } from '@/components/hr/payroll/payroll-period-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function PayrollPage() {
    const { data: periods, isLoading: periodsLoading } = usePayrollPeriods()
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
    const { data: payslips, isLoading: payslipsLoading } = usePayslips(selectedPeriodId || undefined)
    const processPayroll = useProcessPayroll()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleProcess = async (periodId: string) => {
        try {
            await processPayroll.mutateAsync(periodId)
            toast.success('Payroll processed successfully')
            setSelectedPeriodId(periodId)
        } catch (error) {
            toast.error('Failed to process payroll')
        }
    }

    return (
        <PermissionGuard permission="hr.payroll.view">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Payroll Processing</h2>
                        <p className="text-muted-foreground">
                            Manage monthly payroll periods and generate payslips.
                        </p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Period
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-1 space-y-4">
                        <h3 className="font-semibold text-lg">Payroll Periods</h3>
                        <div className="space-y-2">
                            {periodsLoading ? (
                                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                            ) : (
                                periods?.map((period) => (
                                    <Card
                                        key={period.id}
                                        className={`cursor-pointer transition-colors ${selectedPeriodId === period.id ? 'border-primary ring-1 ring-primary' : 'hover:bg-slate-50'}`}
                                        onClick={() => setSelectedPeriodId(period.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-bold">{period.period_name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDate(period.start_date)} - {formatDate(period.end_date)}
                                                    </div>
                                                </div>
                                                <Badge variant={period.status === 'PAID' ? 'success' : 'outline'}>
                                                    {period.status}
                                                </Badge>
                                            </div>
                                            {period.status === 'DRAFT' && (
                                                <Button
                                                    className="w-full mt-3 h-8 text-xs"
                                                    variant="secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleProcess(period.id)
                                                    }}
                                                    disabled={processPayroll.isPending}
                                                >
                                                    <Calculator className="mr-1 h-3 w-3" /> Process Now
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        <h3 className="font-semibold text-lg">
                            {selectedPeriodId ? `Payslips for ${periods?.find(p => p.id === selectedPeriodId)?.period_name}` : 'Select a period to view payslips'}
                        </h3>
                        {selectedPeriodId ? (
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead className="text-right">Basic</TableHead>
                                                <TableHead className="text-right">Allowances</TableHead>
                                                <TableHead className="text-right">Deductions</TableHead>
                                                <TableHead className="text-right font-bold">Net Salary</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payslipsLoading ? (
                                                <TableRow><TableCell colSpan={6}><Skeleton className="h-20 w-full" /></TableCell></TableRow>
                                            ) : (
                                                payslips?.map((slip) => (
                                                    <TableRow key={slip.id}>
                                                        <TableCell>
                                                            <div className="font-medium">{slip.employee.full_name}</div>
                                                            <div className="text-xs text-muted-foreground">{slip.employee.employee_code}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right">{formatCurrency(Number(slip.basic_salary))}</TableCell>
                                                        <TableCell className="text-right text-green-600">
                                                            +{formatCurrency(Number(slip.allowances) + Number(slip.commission) + Number(slip.overtime))}
                                                        </TableCell>
                                                        <TableCell className="text-right text-destructive">
                                                            -{formatCurrency(Number(slip.total_deductions))}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">{formatCurrency(Number(slip.net_salary))}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="outline" size="sm">
                                                                <FileText className="mr-2 h-4 w-4" />
                                                                View
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                            {payslips?.length === 0 && !payslipsLoading && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                        No payslips generated for this period. Click 'Process Now' above.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg bg-slate-50 text-muted-foreground">
                                <FileText className="h-12 w-12 mb-4 opacity-20" />
                                <p>Select a payroll period from the list on the left.</p>
                            </div>
                        )}
                    </div>
                </div>

                <PayrollPeriodDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                />
            </div>
        </PermissionGuard>
    )
}
