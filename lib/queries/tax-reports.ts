import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ============================================================================
// SALES TAX REPORT (FBR Format)
// ============================================================================

export interface SalesTaxSummary {
    period: string
    total_sales: number
    taxable_sales: number
    exempt_sales: number
    output_tax: number
    input_tax: number
    net_payable: number
    sales_by_rate: {
        rate: number
        amount: number
        tax: number
    }[]
}

export function useSalesTaxReport(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['sales-tax-report', startDate, endDate],
        queryFn: async () => {
            // Get all sales invoices in period
            const { data: invoices, error: invoicesError } = await supabase
                .from('sales_invoices')
                .select(`
                    *,
                    sales_invoice_items(*)
                `)
                .gte('invoice_date', startDate)
                .lte('invoice_date', endDate)
                .eq('status', 'PAID')

            if (invoicesError) throw invoicesError

            // Get all purchase invoices for input tax
            const { data: purchases, error: purchasesError } = await supabase
                .from('purchase_invoices')
                .select('*')
                .gte('invoice_date', startDate)
                .lte('invoice_date', endDate)
                .in('status', ['PAID', 'PARTIAL'])

            if (purchasesError) throw purchasesError

            // Calculate sales tax summary
            let totalSales = 0
            let taxableSales = 0
            let exemptSales = 0
            let outputTax = 0
            const salesByRate: Record<number, { amount: number; tax: number }> = {}

            invoices?.forEach((invoice) => {
                const invoiceTotal = invoice.total_amount || 0
                const invoiceTax = invoice.tax_amount || 0
                const taxRate = invoice.tax_percentage || 0

                totalSales += invoiceTotal

                if (taxRate > 0) {
                    taxableSales += invoiceTotal - invoiceTax
                    outputTax += invoiceTax

                    if (!salesByRate[taxRate]) {
                        salesByRate[taxRate] = { amount: 0, tax: 0 }
                    }
                    salesByRate[taxRate].amount += invoiceTotal - invoiceTax
                    salesByRate[taxRate].tax += invoiceTax
                } else {
                    exemptSales += invoiceTotal
                }
            })

            // Calculate input tax from purchases
            let inputTax = 0
            purchases?.forEach((purchase) => {
                inputTax += purchase.tax_amount || 0
            })

            const netPayable = outputTax - inputTax

            const salesByRateArray = Object.entries(salesByRate).map(([rate, data]) => ({
                rate: parseFloat(rate),
                amount: data.amount,
                tax: data.tax,
            }))

            const summary: SalesTaxSummary = {
                period: `${startDate} to ${endDate}`,
                total_sales: totalSales,
                taxable_sales: taxableSales,
                exempt_sales: exemptSales,
                output_tax: outputTax,
                input_tax: inputTax,
                net_payable: netPayable,
                sales_by_rate: salesByRateArray,
            }

            return summary
        },
        enabled: !!startDate && !!endDate,
    })
}

// ============================================================================
// WITHHOLDING TAX REPORT (FBR Format)
// ============================================================================

export interface WHTSummary {
    period: string
    total_wht_deducted: number
    total_payments: number
    wht_by_type: {
        type: string
        rate: number
        gross_amount: number
        wht_amount: number
        count: number
    }[]
    wht_by_vendor: {
        vendor_id: string
        vendor_name: string
        vendor_ntn: string | null
        gross_amount: number
        wht_amount: number
        transactions: number
    }[]
}

export function useWHTReport(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['wht-report', startDate, endDate],
        queryFn: async () => {
            // Get all purchase invoices with WHT
            const { data: purchases, error } = await supabase
                .from('purchase_invoices')
                .select(`
                    *,
                    vendor:vendors(
                        id,
                        vendor_name,
                        ntn_number
                    )
                `)
                .gte('invoice_date', startDate)
                .lte('invoice_date', endDate)
                .in('status', ['PAID', 'PARTIAL'])
                .gt('wht_amount', 0)

            if (error) throw error

            let totalWHT = 0
            let totalPayments = 0
            const whtByType: Record<string, {
                rate: number
                gross_amount: number
                wht_amount: number
                count: number
            }> = {}
            const whtByVendor: Record<string, {
                vendor_name: string
                vendor_ntn: string | null
                gross_amount: number
                wht_amount: number
                transactions: number
            }> = {}

            purchases?.forEach((purchase) => {
                const whtAmount = purchase.wht_amount || 0
                const grossAmount = purchase.total_amount || 0
                const whtRate = purchase.wht_percentage || 0
                const whtType = whtRate === 15 ? 'Services' :
                    whtRate === 4 ? 'Goods' :
                        whtRate === 10 ? 'Contracts' : 'Other'

                totalWHT += whtAmount
                totalPayments += grossAmount

                // By Type
                if (!whtByType[whtType]) {
                    whtByType[whtType] = {
                        rate: whtRate,
                        gross_amount: 0,
                        wht_amount: 0,
                        count: 0,
                    }
                }
                whtByType[whtType].gross_amount += grossAmount
                whtByType[whtType].wht_amount += whtAmount
                whtByType[whtType].count += 1

                // By Vendor
                const vendorId = purchase.vendor_id
                if (vendorId) {
                    if (!whtByVendor[vendorId]) {
                        whtByVendor[vendorId] = {
                            vendor_name: purchase.vendor?.vendor_name || 'Unknown',
                            vendor_ntn: purchase.vendor?.ntn_number || null,
                            gross_amount: 0,
                            wht_amount: 0,
                            transactions: 0,
                        }
                    }
                    whtByVendor[vendorId].gross_amount += grossAmount
                    whtByVendor[vendorId].wht_amount += whtAmount
                    whtByVendor[vendorId].transactions += 1
                }
            })

            const whtByTypeArray = Object.entries(whtByType).map(([type, data]) => ({
                type,
                ...data,
            }))

            const whtByVendorArray = Object.entries(whtByVendor).map(([vendor_id, data]) => ({
                vendor_id,
                ...data,
            }))

            const summary: WHTSummary = {
                period: `${startDate} to ${endDate}`,
                total_wht_deducted: totalWHT,
                total_payments: totalPayments,
                wht_by_type: whtByTypeArray,
                wht_by_vendor: whtByVendorArray,
            }

            return summary
        },
        enabled: !!startDate && !!endDate,
    })
}

// ============================================================================
// TAX PERIOD HELPERS
// ============================================================================

export function getCurrentTaxPeriod() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-indexed

    // Previous month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        label: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
}

export function getTaxPeriods() {
    const periods = []
    const now = new Date()

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        periods.push({
            value: `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`,
            label: startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        })
    }

    return periods
}
