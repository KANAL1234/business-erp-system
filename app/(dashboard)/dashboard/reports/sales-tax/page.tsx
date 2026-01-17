'use client'

import { useState } from 'react'
import { useSalesTaxReport, getTaxPeriods, getCurrentTaxPeriod } from '@/lib/queries/tax-reports'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { FileSpreadsheet, Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function SalesTaxReportPage() {
    return (
        <PermissionGuard permission="accounting:reports:view">
            <SalesTaxReportContent />
        </PermissionGuard>
    )
}

function SalesTaxReportContent() {
    const currentPeriod = getCurrentTaxPeriod()
    const [selectedPeriod, setSelectedPeriod] = useState(
        `${currentPeriod.startDate}_${currentPeriod.endDate}`
    )

    const periods = getTaxPeriods()
    const period = periods.find((p) => p.value === selectedPeriod) || currentPeriod

    const { data: report, isLoading } = useSalesTaxReport(period.startDate, period.endDate)

    const exportToExcel = () => {
        if (!report) return

        // Create workbook
        const wb = XLSX.utils.book_new()

        // Summary Sheet
        const summaryData = [
            ['SALES TAX MONTHLY RETURN'],
            ['Federal Board of Revenue (FBR) - Pakistan'],
            [''],
            ['Tax Period:', report.period],
            [''],
            ['SUMMARY'],
            ['Description', 'Amount (Rs.)'],
            ['Total Sales', report.total_sales.toLocaleString()],
            ['Taxable Sales', report.taxable_sales.toLocaleString()],
            ['Exempt Sales', report.exempt_sales.toLocaleString()],
            [''],
            ['Output Tax (Sales Tax Collected)', report.output_tax.toLocaleString()],
            ['Input Tax (Sales Tax Paid)', report.input_tax.toLocaleString()],
            [''],
            ['Net Payable / (Refundable)', report.net_payable.toLocaleString()],
        ]
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

        // Sales by Rate Sheet
        const rateData = [
            ['SALES BREAKDOWN BY TAX RATE'],
            [''],
            ['Tax Rate (%)', 'Taxable Amount (Rs.)', 'Tax Amount (Rs.)'],
            ...report.sales_by_rate.map((item) => [
                item.rate,
                item.amount.toLocaleString(),
                item.tax.toLocaleString(),
            ]),
            [''],
            ['Total', report.taxable_sales.toLocaleString(), report.output_tax.toLocaleString()],
        ]
        const rateSheet = XLSX.utils.aoa_to_sheet(rateData)
        XLSX.utils.book_append_sheet(wb, rateSheet, 'By Tax Rate')

        // Export
        XLSX.writeFile(wb, `Sales_Tax_Return_${period.label.replace(' ', '_')}.xlsx`)
    }

    const printReport = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Sales Tax Monthly Return
                    </h1>
                    <p className="text-slate-500">FBR-compliant sales tax report for Pakistan</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={printReport}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button onClick={exportToExcel} disabled={!report}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export to Excel
                    </Button>
                </div>
            </div>

            {/* Period Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Tax Period</CardTitle>
                    <CardDescription>Select the month for which to generate the report</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {periods.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {isLoading ? (
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        Loading report...
                    </CardContent>
                </Card>
            ) : report ? (
                <>
                    {/* Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                            <CardDescription>Tax Period: {report.period}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Total Sales</p>
                                    <p className="text-2xl font-bold">
                                        Rs. {report.total_sales.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Taxable Sales</p>
                                    <p className="text-2xl font-bold">
                                        Rs. {report.taxable_sales.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Exempt Sales</p>
                                    <p className="text-2xl font-bold">
                                        Rs. {report.exempt_sales.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Output Tax</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        Rs. {report.output_tax.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Input Tax</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        Rs. {report.input_tax.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Net Payable</p>
                                    <p className={`text-2xl font-bold ${report.net_payable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        Rs. {Math.abs(report.net_payable).toLocaleString()}
                                        {report.net_payable < 0 && ' (Refundable)'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sales by Tax Rate */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sales Breakdown by Tax Rate</CardTitle>
                            <CardDescription>Detailed breakdown of sales by applicable tax rates</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tax Rate</TableHead>
                                        <TableHead className="text-right">Taxable Amount</TableHead>
                                        <TableHead className="text-right">Tax Amount</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.sales_by_rate.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                No taxable sales in this period
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {report.sales_by_rate.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-medium">{item.rate}%</TableCell>
                                                    <TableCell className="text-right">
                                                        Rs. {item.amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        Rs. {item.tax.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        Rs. {(item.amount + item.tax).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-slate-50 font-bold">
                                                <TableCell>Total</TableCell>
                                                <TableCell className="text-right">
                                                    Rs. {report.taxable_sales.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    Rs. {report.output_tax.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    Rs. {(report.taxable_sales + report.output_tax).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* FBR Compliance Note */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-medium text-primary">FBR Compliance</p>
                                    <p className="text-sm text-primary">
                                        This report is formatted according to Federal Board of Revenue (FBR) requirements for Pakistan.
                                        Export to Excel for submission or print for record-keeping. Ensure all sales invoices are properly
                                        recorded with correct tax rates before filing.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="py-12 text-center text-slate-500">
                        No data available for the selected period
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
