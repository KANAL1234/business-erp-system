'use client'

import { useState } from 'react'
import { useWHTReport, getTaxPeriods, getCurrentTaxPeriod } from '@/lib/queries/tax-reports'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileSpreadsheet, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function WHTReportPage() {
    return (
        <PermissionGuard permission="accounting:reports:view">
            <WHTReportContent />
        </PermissionGuard>
    )
}

function WHTReportContent() {
    const currentPeriod = getCurrentTaxPeriod()
    const [selectedPeriod, setSelectedPeriod] = useState(
        `${currentPeriod.startDate}_${currentPeriod.endDate}`
    )

    const periods = getTaxPeriods()
    const period = periods.find((p) => p.value === selectedPeriod) || currentPeriod

    const { data: report, isLoading } = useWHTReport(period.startDate, period.endDate)

    const exportToExcel = () => {
        if (!report) return

        const wb = XLSX.utils.book_new()

        // Summary Sheet
        const summaryData = [
            ['WITHHOLDING TAX MONTHLY RETURN'],
            ['Federal Board of Revenue (FBR) - Pakistan'],
            [''],
            ['Tax Period:', report.period],
            [''],
            ['SUMMARY'],
            ['Description', 'Amount (Rs.)'],
            ['Total Payments Made', report.total_payments.toLocaleString()],
            ['Total WHT Deducted', report.total_wht_deducted.toLocaleString()],
            [''],
            ['WHT Rate:', (report.total_wht_deducted / report.total_payments * 100).toFixed(2) + '%'],
        ]
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

        // By Type Sheet
        const typeData = [
            ['WHT BY TRANSACTION TYPE'],
            [''],
            ['Type', 'Rate (%)', 'Gross Amount (Rs.)', 'WHT Amount (Rs.)', 'Transactions'],
            ...report.wht_by_type.map((item) => [
                item.type,
                item.rate,
                item.gross_amount.toLocaleString(),
                item.wht_amount.toLocaleString(),
                item.count,
            ]),
            [''],
            ['Total', '', report.total_payments.toLocaleString(), report.total_wht_deducted.toLocaleString(), ''],
        ]
        const typeSheet = XLSX.utils.aoa_to_sheet(typeData)
        XLSX.utils.book_append_sheet(wb, typeSheet, 'By Type')

        // By Vendor Sheet
        const vendorData = [
            ['WHT BY VENDOR'],
            [''],
            ['Vendor Name', 'NTN Number', 'Gross Amount (Rs.)', 'WHT Amount (Rs.)', 'Transactions'],
            ...report.wht_by_vendor.map((item) => [
                item.vendor_name,
                item.vendor_ntn || 'N/A',
                item.gross_amount.toLocaleString(),
                item.wht_amount.toLocaleString(),
                item.transactions,
            ]),
            [''],
            ['Total', '', report.total_payments.toLocaleString(), report.total_wht_deducted.toLocaleString(), ''],
        ]
        const vendorSheet = XLSX.utils.aoa_to_sheet(vendorData)
        XLSX.utils.book_append_sheet(wb, vendorSheet, 'By Vendor')

        XLSX.writeFile(wb, `WHT_Return_${period.label.replace(' ', '_')}.xlsx`)
    }

    const printReport = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Withholding Tax Monthly Return
                    </h1>
                    <p className="text-slate-500">FBR-compliant WHT report for Pakistan</p>
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
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Total Payments</p>
                                    <p className="text-2xl font-bold">
                                        Rs. {report.total_payments.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Total WHT Deducted</p>
                                    <p className="text-2xl font-bold text-primary">
                                        Rs. {report.total_wht_deducted.toLocaleString()}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Average WHT Rate</p>
                                    <p className="text-2xl font-bold">
                                        {report.total_payments > 0
                                            ? ((report.total_wht_deducted / report.total_payments) * 100).toFixed(2)
                                            : '0.00'}%
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabbed Details */}
                    <Tabs defaultValue="type" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="type">By Transaction Type</TabsTrigger>
                            <TabsTrigger value="vendor">By Vendor</TabsTrigger>
                        </TabsList>

                        <TabsContent value="type">
                            <Card>
                                <CardHeader>
                                    <CardTitle>WHT by Transaction Type</CardTitle>
                                    <CardDescription>Breakdown of withholding tax by transaction category</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Rate</TableHead>
                                                <TableHead className="text-right">Gross Amount</TableHead>
                                                <TableHead className="text-right">WHT Amount</TableHead>
                                                <TableHead className="text-right">Transactions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.wht_by_type.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                        No WHT transactions in this period
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                    {report.wht_by_type.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell className="font-medium">{item.type}</TableCell>
                                                            <TableCell>{item.rate}%</TableCell>
                                                            <TableCell className="text-right">
                                                                Rs. {item.gross_amount.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                Rs. {item.wht_amount.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">{item.count}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-slate-50 font-bold">
                                                        <TableCell>Total</TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {report.total_payments.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {report.total_wht_deducted.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="vendor">
                            <Card>
                                <CardHeader>
                                    <CardTitle>WHT by Vendor</CardTitle>
                                    <CardDescription>Vendor-wise withholding tax summary</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Vendor Name</TableHead>
                                                <TableHead>NTN Number</TableHead>
                                                <TableHead className="text-right">Gross Amount</TableHead>
                                                <TableHead className="text-right">WHT Amount</TableHead>
                                                <TableHead className="text-right">Transactions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.wht_by_vendor.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                        No vendor transactions in this period
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                    {report.wht_by_vendor.map((item, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell className="font-medium">{item.vendor_name}</TableCell>
                                                            <TableCell>{item.vendor_ntn || 'N/A'}</TableCell>
                                                            <TableCell className="text-right">
                                                                Rs. {item.gross_amount.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                Rs. {item.wht_amount.toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">{item.transactions}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow className="bg-slate-50 font-bold">
                                                        <TableCell>Total</TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {report.total_payments.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {report.total_wht_deducted.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                    </TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* FBR Compliance Note */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <FileSpreadsheet className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-medium text-primary">FBR Compliance</p>
                                    <p className="text-sm text-primary">
                                        This report is formatted according to Federal Board of Revenue (FBR) requirements for Pakistan.
                                        Export to Excel for submission or print for record-keeping. Ensure all vendor NTN numbers are
                                        correctly recorded for compliance. WHT rates: Services (15%), Goods (4%), Contracts (10%).
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
