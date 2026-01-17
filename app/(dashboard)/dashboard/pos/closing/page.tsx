'use client'

import { useState } from 'react'
import { useTodaySales, useSalesSummary } from '@/lib/queries/pos-sales'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function DailyClosingPage() {
    return (
        <PermissionGuard permission="pos.closing.view">
            <DailyClosingContent />
        </PermissionGuard>
    )
}

function DailyClosingContent() {
    const today = new Date().toISOString().split('T')[0]
    const { currentLocationId } = useLocation()

    const [actualCash, setActualCash] = useState('')
    const [notes, setNotes] = useState('')
    const [isClosed, setIsClosed] = useState(false)

    const locationId = currentLocationId || ''
    const { data: todaySales } = useTodaySales(locationId)
    const { data: summary } = useSalesSummary(locationId, today, today)

    // Calculate expected cash
    const expectedCash = summary?.totalCash || 0
    const actualCashAmount = Number(actualCash) || 0
    const difference = actualCashAmount - expectedCash
    const hasVariance = Math.abs(difference) > 0

    const handleClose = () => {
        if (!locationId) {
            toast.error('Error', {
                description: 'Please select a location from the top menu',
            })
            return
        }

        if (!actualCash) {
            toast.error('Error', {
                description: 'Please enter actual cash count',
            })
            return
        }

        if (hasVariance && Math.abs(difference) > 1000 && !notes) {
            toast.error('Explanation Required', {
                description: 'Please explain the cash variance',
            })
            return
        }

        // TODO: Save closing record to database
        toast.success('Day Closed Successfully', {
            description: `Cash register closed for ${new Date().toLocaleDateString()}`,
        })

        setIsClosed(true)
    }

    return (
        <div className="px-4 sm:px-0">
            <div className="flex items-center mb-6">
                <Link href="/dashboard/pos">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to POS
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold text-gray-900 ml-4">Daily Cash Closing</h2>
            </div>

            {isClosed && (
                <Alert className="mb-6">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Cash register closed successfully. A report has been generated.
                    </AlertDescription>
                </Alert>
            )}

            {!locationId && (
                <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Please select a location from the top menu to view daily closing.
                    </AlertDescription>
                </Alert>
            )}

            {locationId && summary && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{summary.transactionCount}</div>
                                <p className="text-xs text-gray-500">transactions today</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    Rs. {summary.totalSales.toLocaleString()}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Cash: Rs. {summary.totalCash.toLocaleString()} |
                                    Credit: Rs. {summary.totalCredit.toLocaleString()}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Expected Cash</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    Rs. {expectedCash.toLocaleString()}
                                </div>
                                <p className="text-xs text-gray-500">cash to be counted</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cash Count */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Cash Count</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Expected vs Actual */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Expected Cash (from sales)</Label>
                                    <div className="text-3xl font-bold text-green-600">
                                        Rs. {expectedCash.toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="actual_cash">Actual Cash Count *</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                        <Input
                                            id="actual_cash"
                                            type="number"
                                            step="0.01"
                                            value={actualCash}
                                            onChange={(e) => setActualCash(e.target.value)}
                                            placeholder="0.00"
                                            className="pl-10 text-2xl h-14"
                                            disabled={isClosed}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Variance */}
                            {actualCash && (
                                <Alert variant={hasVariance ? 'destructive' : 'default'}>
                                    {hasVariance ? (
                                        <AlertCircle className="h-4 w-4" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4" />
                                    )}
                                    <AlertDescription>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">
                                                {hasVariance ? 'Cash Variance Detected' : 'Cash Matches!'}
                                            </span>
                                            <span className="text-xl font-bold">
                                                {difference > 0 && '+'}
                                                Rs. {Math.abs(difference).toLocaleString()}
                                            </span>
                                        </div>
                                        {hasVariance && (
                                            <p className="text-sm mt-2">
                                                {difference > 0
                                                    ? 'You have more cash than expected (overage)'
                                                    : 'You have less cash than expected (shortage)'}
                                            </p>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Notes */}
                            {hasVariance && Math.abs(difference) > 100 && (
                                <div className="space-y-2">
                                    <Label htmlFor="notes">
                                        Explanation for Variance *
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Please explain the reason for cash variance..."
                                        rows={3}
                                        disabled={isClosed}
                                    />
                                </div>
                            )}

                            {/* Close Button */}
                            <Button
                                onClick={handleClose}
                                disabled={!actualCash || isClosed}
                                className="w-full h-12 text-lg"
                                size="lg"
                            >
                                {isClosed ? 'Day Closed ✓' : 'Close Cash Register'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Today's Sales Detail */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Today's Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Sale #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Payment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {todaySales?.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell>
                                                {new Date(sale.sale_date).toLocaleTimeString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {sale.sale_number}
                                            </TableCell>
                                            <TableCell>
                                                {sale.customers?.name || 'Walk-in'}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                Rs. {sale.total_amount.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <span className={
                                                    sale.payment_method === 'CASH'
                                                        ? 'text-green-600'
                                                        : 'text-orange-600'
                                                }>
                                                    {sale.payment_method}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
