'use client'

import { usePOSSale } from '@/lib/queries/pos-sales'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Printer, Download } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

type Props = {
    saleId: string
    onClose?: () => void
}

export function Receipt({ saleId, onClose }: Props) {
    const { data: sale } = usePOSSale(saleId)

    const handlePrint = () => {
        window.print()
    }

    const handleDownload = () => {
        // TODO: Generate PDF using jsPDF or similar
        toast.info("Coming Soon", {
            description: "PDF download functionality is coming soon!",
        })
    }

    if (!sale) {
        return <div>Loading receipt...</div>
    }

    const items = Array.isArray((sale as any).pos_sale_items) ? (sale as any).pos_sale_items : []
    const locationName = (sale as any).locations?.name || 'N/A'
    const cashierName = (sale as any).cashier?.full_name || 'N/A'
    const customerName = (sale as any).customers?.name || 'Walk-in'

    return (
        <div className="max-w-md mx-auto">
            {/* Print Actions (hidden when printing) */}
            <div className="print:hidden mb-4 flex gap-2">
                <Button onClick={handlePrint} className="flex-1">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                </Button>
            </div>

            {/* Receipt Card */}
            <Card className="print:shadow-none print:border-0">
                <CardContent className="p-8 print:p-4">
                    {/* Company Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold">Business-ERP-Software</h1>
                        <p className="text-sm text-gray-600">Rawalpindi, Pakistan</p>
                        <p className="text-sm text-gray-600">Phone: 051-XXXXXXX</p>
                        <p className="text-sm text-gray-600">NTN: XXXXXXXXX</p>
                    </div>

                    <Separator className="my-4" />

                    {/* Receipt Info */}
                    <div className="space-y-1 text-sm mb-4">
                        <div className="flex justify-between">
                            <span className="font-semibold">Receipt #:</span>
                            <span>{sale.sale_number}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Date:</span>
                            <span>{format(new Date(sale.sale_date), 'MMM dd, yyyy hh:mm a')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Location:</span>
                            <span>{locationName}</span>
                        </div>
                        {(sale as any).cashier && (
                            <div className="flex justify-between">
                                <span className="font-semibold">Cashier:</span>
                                <span>{cashierName}</span>
                            </div>
                        )}
                        {(sale as any).customers && (
                            <div className="flex justify-between">
                                <span className="font-semibold">Customer:</span>
                                <span>{customerName}</span>
                            </div>
                        )}
                    </div>

                    <Separator className="my-4" />

                    {/* Items */}
                    <div className="mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">Item</th>
                                    <th className="text-center py-2">Qty</th>
                                    <th className="text-right py-2">Price</th>
                                    <th className="text-right py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-3 text-center text-gray-500">
                                            Items unavailable for this receipt
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item: any) => (
                                        <tr key={item.id} className="border-b">
                                            <td className="py-2">
                                                <div className="font-medium">{item.products?.name || 'Item'}</div>
                                                <div className="text-xs text-gray-500">{item.products?.sku || ''}</div>
                                            </td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-right">{Number(item.unit_price || 0).toLocaleString()}</td>
                                            <td className="text-right font-medium">
                                                {Number(item.line_total || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Separator className="my-4" />

                    {/* Totals */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>Rs. {sale.subtotal.toLocaleString()}</span>
                        </div>

                        {sale.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span>Discount:</span>
                                <span>- Rs. {sale.discount_amount.toLocaleString()}</span>
                            </div>
                        )}

                        {sale.tax_amount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span>Tax:</span>
                                <span>Rs. {sale.tax_amount.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span>Rs. {sale.total_amount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="space-y-1 text-sm bg-gray-50 p-3 rounded mb-4">
                        <div className="flex justify-between">
                            <span className="font-semibold">Payment Method:</span>
                            <span className="uppercase">{sale.payment_method}</span>
                        </div>

                        {sale.payment_method === 'CASH' && (
                            <>
                                <div className="flex justify-between">
                                    <span>Amount Paid:</span>
                                    <span>Rs. {sale.amount_paid.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Change:</span>
                                    <span>Rs. {(sale.amount_paid - sale.total_amount).toLocaleString()}</span>
                                </div>
                            </>
                        )}

                        {sale.payment_method === 'CREDIT' && (
                            <div className="flex justify-between">
                                <span>Amount Due:</span>
                                <span className="text-red-600 font-semibold">
                                    Rs. {Number((sale as any).amount_due || 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-600 mt-6">
                        <p>Thank you for your business!</p>
                        <p className="mt-2">Please keep this receipt for your records</p>
                        {sale.payment_method === 'CREDIT' && (
                            <p className="mt-2 text-red-600 font-semibold">
                                Payment due within {(sale as any).customers?.credit_days || 30} days
                            </p>
                        )}
                    </div>

                    {/* Barcode (optional) */}
                    <div className="text-center mt-6">
                        <div className="inline-block bg-white p-2 border">
                            {/* TODO: Add barcode library like react-barcode */}
                            <div className="text-xs font-mono">{sale.sale_number}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Close Button (hidden when printing) */}
            {onClose && (
                <div className="print:hidden mt-4">
                    <Button onClick={onClose} variant="outline" className="w-full">
                        Close
                    </Button>
                </div>
            )}
        </div>
    )
}
