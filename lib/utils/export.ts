import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================================================
// EXCEL EXPORT UTILITIES
// ============================================================================

export interface ExcelColumn {
    header: string
    key: string
    width?: number
}

export interface ExcelExportOptions {
    filename: string
    sheetName?: string
    title?: string
    subtitle?: string
    columns: ExcelColumn[]
    data: any[]
    summary?: { label: string; value: string | number }[]
}

export function exportToExcel(options: ExcelExportOptions) {
    const {
        filename,
        sheetName = 'Sheet1',
        title,
        subtitle,
        columns,
        data,
        summary,
    } = options

    const wb = XLSX.utils.book_new()
    const wsData: any[][] = []

    // Add title
    if (title) {
        wsData.push([title])
        wsData.push([])
    }

    // Add subtitle
    if (subtitle) {
        wsData.push([subtitle])
        wsData.push([])
    }

    // Add headers
    wsData.push(columns.map((col) => col.header))

    // Add data rows
    data.forEach((row) => {
        wsData.push(columns.map((col) => row[col.key] ?? ''))
    })

    // Add summary
    if (summary && summary.length > 0) {
        wsData.push([])
        wsData.push(['SUMMARY'])
        summary.forEach((item) => {
            wsData.push([item.label, item.value])
        })
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set column widths
    ws['!cols'] = columns.map((col) => ({ wch: col.width || 15 }))

    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ============================================================================
// PDF EXPORT UTILITIES
// ============================================================================

export interface PDFColumn {
    header: string
    dataKey: string
}

export interface PDFExportOptions {
    filename: string
    title: string
    subtitle?: string
    columns: PDFColumn[]
    data: any[]
    orientation?: 'portrait' | 'landscape'
    footer?: string
}

export function exportToPDF(options: PDFExportOptions) {
    const {
        filename,
        title,
        subtitle,
        columns,
        data,
        orientation = 'portrait',
        footer,
    } = options

    const doc = new jsPDF(orientation)

    // Add title
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 20)

    // Add subtitle
    if (subtitle) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, 14, 28)
    }

    // Add table
    ; (doc as any).autoTable({
        startY: subtitle ? 35 : 28,
        head: [columns.map((col) => col.header)],
        body: data.map((row) => columns.map((col) => row[col.dataKey] ?? '')),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105], // slate-600
            textColor: 255,
            fontStyle: 'bold',
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252], // slate-50
        },
    })

    // Add footer
    if (footer) {
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(
                footer,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            )
        }
    }

    doc.save(`${filename}.pdf`)
}

// ============================================================================
// INVOICE PDF GENERATION
// ============================================================================

export interface InvoiceData {
    invoice_number: string
    invoice_date: string
    due_date?: string
    customer_name: string
    customer_address?: string
    items: {
        description: string
        quantity: number
        unit_price: number
        amount: number
    }[]
    subtotal: number
    tax_amount: number
    total_amount: number
    notes?: string
}

export function generateInvoicePDF(invoice: InvoiceData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}, options?: { filename?: string }) {
    const doc = new jsPDF()

    // Company Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }

    // Invoice Title
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 150, 20)

    // Invoice Details
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 30)
    doc.text(`Date: ${invoice.invoice_date}`, 150, 36)
    if (invoice.due_date) {
        doc.text(`Due Date: ${invoice.due_date}`, 150, 42)
    }

    // Customer Details
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customer_name, 14, 57)
    if (invoice.customer_address) {
        doc.text(invoice.customer_address, 14, 63)
    }

    // Items Table
    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Qty', 'Unit Price', 'Amount']],
        body: invoice.items.map((item) => [
            item.description,
            item.quantity,
            `Rs. ${item.unit_price.toLocaleString()}`,
            `Rs. ${item.amount.toLocaleString()}`,
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
        },
    })

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text('Subtotal:', 140, finalY)
    doc.text(`Rs. ${invoice.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' })

    doc.text('Tax:', 140, finalY + 6)
    doc.text(`Rs. ${invoice.tax_amount.toLocaleString()}`, 180, finalY + 6, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 140, finalY + 14)
    doc.text(`Rs. ${invoice.total_amount.toLocaleString()}`, 180, finalY + 14, { align: 'right' })

    // Notes
    if (invoice.notes) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Notes:', 14, finalY + 25)
        doc.text(invoice.notes, 14, finalY + 31, { maxWidth: 180 })
    }

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(
        'Thank you for your business!',
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
    )

    if (options?.filename) {
        doc.save(options.filename)
    }

    return doc
}

// ============================================================================
// PAYSLIP PDF GENERATION
// ============================================================================

export interface PayslipData {
    employee_name: string
    employee_code: string
    designation: string
    department: string
    pay_period: string
    basic_salary: number
    allowances: { name: string; amount: number }[]
    deductions: { name: string; amount: number }[]
    net_salary: number
}

export function generatePayslipPDF(payslip: PayslipData, companyInfo?: {
    name: string
    address?: string
}) {
    const doc = new jsPDF()

    // Company Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 105, 20, { align: 'center' })

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 105, 27, { align: 'center' })
    }

    // Payslip Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('SALARY SLIP', 105, 40, { align: 'center' })

    // Employee Details
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Employee: ${payslip.employee_name}`, 14, 55)
    doc.text(`Code: ${payslip.employee_code}`, 14, 61)
    doc.text(`Designation: ${payslip.designation}`, 14, 67)
    doc.text(`Department: ${payslip.department}`, 14, 73)
    doc.text(`Pay Period: ${payslip.pay_period}`, 140, 55)

    // Earnings Table
    const earningsData = [
        ['Basic Salary', `Rs. ${payslip.basic_salary.toLocaleString()}`],
        ...payslip.allowances.map((a) => [a.name, `Rs. ${a.amount.toLocaleString()}`]),
    ]

        autoTable(doc, {
            startY: 85,
            head: [['Earnings', 'Amount']],
            body: earningsData,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            margin: { left: 14, right: 110 },
        })

    // Deductions Table
    const deductionsData = payslip.deductions.map((d) => [
        d.name,
        `Rs. ${d.amount.toLocaleString()}`,
    ])

        autoTable(doc, {
            startY: 85,
            head: [['Deductions', 'Amount']],
            body: deductionsData.length > 0 ? deductionsData : [['None', 'Rs. 0']],
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
            margin: { left: 110, right: 14 },
        })

    // Net Salary
    const finalY = Math.max(
        (doc as any).previousAutoTable.finalY || 0,
        (doc as any).lastAutoTable.finalY || 0
    )

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Net Salary:', 14, finalY + 15)
    doc.text(`Rs. ${payslip.net_salary.toLocaleString()}`, 180, finalY + 15, { align: 'right' })

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(
        'This is a computer-generated document. No signature required.',
        105,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
    )

    doc.save(`Payslip_${payslip.employee_code}_${payslip.pay_period.replace(' ', '_')}.pdf`)
}

// ============================================================================
// QUOTATION PDF GENERATION
// ============================================================================

export interface QuotationData {
    quotation_number: string
    quotation_date: string
    valid_until: string
    reference_number?: string | null
    customer_name: string
    customer_code?: string | null
    items: {
        description: string
        quantity: number
        unit_price: number
        line_total: number
    }[]
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    notes?: string | null
    term_and_conditions?: string | null
}

export function createQuotationPDF(quotation: QuotationData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}) {
    const doc = new jsPDF()

    // Company Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }
    if (companyInfo?.phone) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Phone: ${companyInfo.phone}`, 14, 32)
    }
    if (companyInfo?.email) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Email: ${companyInfo.email}`, 14, 37)
    }

    // Quotation Title
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('QUOTATION', 150, 20)

    // Quotation Details
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Quotation #: ${quotation.quotation_number}`, 150, 30)
    doc.text(`Date: ${quotation.quotation_date}`, 150, 36)
    doc.text(`Valid Until: ${quotation.valid_until}`, 150, 42)
    if (quotation.reference_number) {
        doc.text(`Reference: ${quotation.reference_number}`, 150, 48)
    }

    // Customer Details
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(quotation.customer_name, 14, 57)
    if (quotation.customer_code) {
        doc.text(`Customer Code: ${quotation.customer_code}`, 14, 63)
    }

    // Items Table
    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
        body: quotation.items.map((item) => [
            item.description,
            item.quantity,
            `Rs. ${item.unit_price.toLocaleString()}`,
            `Rs. ${item.line_total.toLocaleString()}`,
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
        },
    })

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text('Subtotal:', 140, finalY)
    doc.text(`Rs. ${quotation.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' })

    doc.text('Discount:', 140, finalY + 6)
    doc.text(`Rs. ${quotation.discount_amount.toLocaleString()}`, 180, finalY + 6, { align: 'right' })

    doc.text('Tax:', 140, finalY + 12)
    doc.text(`Rs. ${quotation.tax_amount.toLocaleString()}`, 180, finalY + 12, { align: 'right' })

    doc.text('Shipping:', 140, finalY + 18)
    doc.text(`Rs. ${quotation.shipping_charges.toLocaleString()}`, 180, finalY + 18, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 140, finalY + 26)
    doc.text(`Rs. ${quotation.total_amount.toLocaleString()}`, 180, finalY + 26, { align: 'right' })

    // Notes and Terms
    let notesStartY = finalY + 36
    if (quotation.notes) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Notes:', 14, notesStartY)
        doc.text(quotation.notes, 14, notesStartY + 6, { maxWidth: 180 })
        notesStartY += 18
    }
    if (quotation.term_and_conditions) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Terms & Conditions:', 14, notesStartY)
        doc.text(quotation.term_and_conditions, 14, notesStartY + 6, { maxWidth: 180 })
    }

    return doc
}

// ============================================================================
// SALES ORDER PDF GENERATION
// ============================================================================

export interface SalesOrderPDFData {
    order_number: string
    order_date: string
    expected_delivery_date?: string | null
    status?: string | null
    payment_status?: string | null
    customer_name: string
    customer_code?: string | null
    items: {
        description: string
        quantity: number
        unit_price: number
        line_total: number
    }[]
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    notes?: string | null
}

export function createSalesOrderPDF(order: SalesOrderPDFData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}) {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }
    if (companyInfo?.phone) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Phone: ${companyInfo.phone}`, 14, 32)
    }

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('SALES ORDER', 140, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Order #: ${order.order_number}`, 140, 30)
    doc.text(`Date: ${order.order_date}`, 140, 36)
    if (order.expected_delivery_date) {
        doc.text(`Expected: ${order.expected_delivery_date}`, 140, 42)
    }
    if (order.status) {
        doc.text(`Status: ${order.status}`, 140, 48)
    }
    if (order.payment_status) {
        doc.text(`Payment: ${order.payment_status}`, 140, 54)
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(order.customer_name, 14, 57)
    if (order.customer_code) {
        doc.text(`Customer Code: ${order.customer_code}`, 14, 63)
    }

    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
        body: order.items.map((item) => [
            item.description,
            item.quantity,
            `Rs. ${item.unit_price.toLocaleString()}`,
            `Rs. ${item.line_total.toLocaleString()}`,
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
        },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text('Subtotal:', 140, finalY)
    doc.text(`Rs. ${order.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' })

    doc.text('Discount:', 140, finalY + 6)
    doc.text(`Rs. ${order.discount_amount.toLocaleString()}`, 180, finalY + 6, { align: 'right' })

    doc.text('Tax:', 140, finalY + 12)
    doc.text(`Rs. ${order.tax_amount.toLocaleString()}`, 180, finalY + 12, { align: 'right' })

    doc.text('Shipping:', 140, finalY + 18)
    doc.text(`Rs. ${order.shipping_charges.toLocaleString()}`, 180, finalY + 18, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 140, finalY + 26)
    doc.text(`Rs. ${order.total_amount.toLocaleString()}`, 180, finalY + 26, { align: 'right' })

    if (order.notes) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Notes:', 14, finalY + 36)
        doc.text(order.notes, 14, finalY + 42, { maxWidth: 180 })
    }

    return doc
}

// ============================================================================
// PURCHASE ORDER PDF GENERATION
// ============================================================================

export interface PurchaseOrderPDFData {
    po_number: string
    po_date: string
    expected_delivery_date?: string | null
    status?: string | null
    vendor_name: string
    vendor_code?: string | null
    location_name?: string | null
    items: {
        description: string
        quantity: number
        unit_price: number
        line_total: number
    }[]
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    notes?: string | null
}

export function createPurchaseOrderPDF(order: PurchaseOrderPDFData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}) {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }
    if (companyInfo?.phone) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Phone: ${companyInfo.phone}`, 14, 32)
    }

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('PURCHASE ORDER', 130, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`PO #: ${order.po_number}`, 140, 30)
    doc.text(`Date: ${order.po_date}`, 140, 36)
    if (order.expected_delivery_date) {
        doc.text(`Expected: ${order.expected_delivery_date}`, 140, 42)
    }
    if (order.status) {
        doc.text(`Status: ${order.status}`, 140, 48)
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Vendor:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(order.vendor_name, 14, 57)
    if (order.vendor_code) {
        doc.text(`Vendor Code: ${order.vendor_code}`, 14, 63)
    }
    if (order.location_name) {
        doc.text(`Receiving Location: ${order.location_name}`, 14, 69)
    }

    autoTable(doc, {
        startY: 80,
        head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
        body: order.items.map((item) => [
            item.description,
            item.quantity,
            `Rs. ${item.unit_price.toLocaleString()}`,
            `Rs. ${item.line_total.toLocaleString()}`,
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
        },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text('Subtotal:', 140, finalY)
    doc.text(`Rs. ${order.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' })

    doc.text('Tax:', 140, finalY + 6)
    doc.text(`Rs. ${order.tax_amount.toLocaleString()}`, 180, finalY + 6, { align: 'right' })

    doc.text('Discount:', 140, finalY + 12)
    doc.text(`Rs. ${order.discount_amount.toLocaleString()}`, 180, finalY + 12, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Total:', 140, finalY + 20)
    doc.text(`Rs. ${order.total_amount.toLocaleString()}`, 180, finalY + 20, { align: 'right' })

    if (order.notes) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Notes:', 14, finalY + 30)
        doc.text(order.notes, 14, finalY + 36, { maxWidth: 180 })
    }

    return doc
}

// ============================================================================
// GOODS RECEIPT (GRN) PDF GENERATION
// ============================================================================

export interface GoodsReceiptPDFData {
    grn_number: string
    receipt_date: string
    status?: string | null
    po_number?: string | null
    vendor_name: string
    location_name?: string | null
    items: {
        description: string
        quantity_received: number
        unit_cost: number
        line_total: number
    }[]
    total_amount: number
    notes?: string | null
}

export function createGoodsReceiptPDF(grn: GoodsReceiptPDFData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}) {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }
    if (companyInfo?.phone) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Phone: ${companyInfo.phone}`, 14, 32)
    }

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('GOODS RECEIPT', 130, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`GRN #: ${grn.grn_number}`, 140, 30)
    doc.text(`Date: ${grn.receipt_date}`, 140, 36)
    if (grn.po_number) {
        doc.text(`PO #: ${grn.po_number}`, 140, 42)
    }
    if (grn.status) {
        doc.text(`Status: ${grn.status}`, 140, 48)
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Vendor:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(grn.vendor_name, 14, 57)
    if (grn.location_name) {
        doc.text(`Location: ${grn.location_name}`, 14, 63)
    }

    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Qty', 'Unit Cost', 'Line Total']],
        body: grn.items.map((item) => [
            item.description,
            item.quantity_received,
            `Rs. ${item.unit_cost.toLocaleString()}`,
            `Rs. ${item.line_total.toLocaleString()}`,
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' },
        },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Total:', 140, finalY)
    doc.text(`Rs. ${grn.total_amount.toLocaleString()}`, 180, finalY, { align: 'right' })

    if (grn.notes) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text('Notes:', 14, finalY + 10)
        doc.text(grn.notes, 14, finalY + 16, { maxWidth: 180 })
    }

    return doc
}

// ============================================================================
// DELIVERY NOTE PDF GENERATION
// ============================================================================

export interface DeliveryNotePDFData {
    delivery_note_number: string
    delivery_date: string
    status?: string | null
    tracking_number?: string | null
    driver_name?: string | null
    vehicle_number?: string | null
    customer_name: string
    customer_code?: string | null
    order_number?: string | null
    items: {
        description: string
        quantity_delivered: number
    }[]
    notes?: string | null
}

export function createDeliveryNotePDF(note: DeliveryNotePDFData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}) {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }
    if (companyInfo?.phone) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Phone: ${companyInfo.phone}`, 14, 32)
    }

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('DELIVERY NOTE', 140, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Delivery #: ${note.delivery_note_number}`, 140, 30)
    doc.text(`Date: ${note.delivery_date}`, 140, 36)
    if (note.order_number) {
        doc.text(`Order #: ${note.order_number}`, 140, 42)
    }
    if (note.status) {
        doc.text(`Status: ${note.status}`, 140, 48)
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Deliver To:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(note.customer_name, 14, 57)
    if (note.customer_code) {
        doc.text(`Customer Code: ${note.customer_code}`, 14, 63)
    }

    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Qty Delivered']],
        body: note.items.map((item) => [
            item.description,
            item.quantity_delivered,
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 140 },
            1: { cellWidth: 40, halign: 'center' },
        },
    })

    let metaY = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(9)
    if (note.tracking_number) {
        doc.text(`Tracking #: ${note.tracking_number}`, 14, metaY)
        metaY += 6
    }
    if (note.driver_name) {
        doc.text(`Driver: ${note.driver_name}`, 14, metaY)
        metaY += 6
    }
    if (note.vehicle_number) {
        doc.text(`Vehicle #: ${note.vehicle_number}`, 14, metaY)
        metaY += 6
    }
    if (note.notes) {
        doc.text('Notes:', 14, metaY)
        doc.text(note.notes, 14, metaY + 6, { maxWidth: 180 })
    }

    return doc
}

// ============================================================================
// SALES RETURN PDF GENERATION
// ============================================================================

export interface SalesReturnPDFData {
    return_number: string
    return_date: string
    status?: string | null
    reason?: string | null
    customer_name: string
    customer_code?: string | null
    invoice_number?: string | null
    refund_amount: number
    items: {
        description: string
        quantity_returned: number
        condition?: string | null
        action?: string | null
    }[]
}

export function createSalesReturnPDF(salesReturn: SalesReturnPDFData, companyInfo?: {
    name: string
    address?: string
    phone?: string
    email?: string
}) {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(companyInfo?.name || 'Company Name', 14, 20)

    if (companyInfo?.address) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(companyInfo.address, 14, 27)
    }
    if (companyInfo?.phone) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Phone: ${companyInfo.phone}`, 14, 32)
    }

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('SALES RETURN', 140, 20)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Return #: ${salesReturn.return_number}`, 140, 30)
    doc.text(`Date: ${salesReturn.return_date}`, 140, 36)
    if (salesReturn.invoice_number) {
        doc.text(`Invoice #: ${salesReturn.invoice_number}`, 140, 42)
    }
    if (salesReturn.status) {
        doc.text(`Status: ${salesReturn.status}`, 140, 48)
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Customer:', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(salesReturn.customer_name, 14, 57)
    if (salesReturn.customer_code) {
        doc.text(`Customer Code: ${salesReturn.customer_code}`, 14, 63)
    }

    autoTable(doc, {
        startY: 75,
        head: [['Description', 'Qty Returned', 'Condition', 'Action']],
        body: salesReturn.items.map((item) => [
            item.description,
            item.quantity_returned,
            item.condition || '-',
            item.action || '-',
        ]),
        theme: 'grid',
        headStyles: {
            fillColor: [71, 85, 105],
            textColor: 255,
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 40, halign: 'center' },
            3: { cellWidth: 40, halign: 'center' },
        },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text('Refund Amount:', 140, finalY)
    doc.text(`Rs. ${salesReturn.refund_amount.toLocaleString()}`, 180, finalY, { align: 'right' })

    if (salesReturn.reason) {
        doc.setFontSize(9)
        doc.text('Reason:', 14, finalY + 10)
        doc.text(salesReturn.reason, 14, finalY + 16, { maxWidth: 180 })
    }

    return doc
}
