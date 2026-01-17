'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Printer, Download } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { PermissionGuard } from '@/components/permission-guard'
import { useDeliveryNote } from '@/lib/queries/delivery-notes'
import { createDeliveryNotePDF } from '@/lib/utils/export'

export default function DeliveryNoteDetailsPage() {
    return (
        <PermissionGuard permission="sales.deliveries.read">
            <DeliveryNoteDetailsContent />
        </PermissionGuard>
    )
}

function DeliveryNoteDetailsContent() {
    const params = useParams<{ id: string }>()
    const noteId = params?.id || ''
    const { data: note, isLoading } = useDeliveryNote(noteId)

    if (isLoading) {
        return <div className="p-8 text-center">Loading delivery note...</div>
    }

    if (!note) {
        return <div className="p-8 text-center text-muted-foreground">Delivery note not found.</div>
    }

    const handleDownload = () => {
        const doc = createDeliveryNotePDF({
            delivery_note_number: note.delivery_note_number,
            delivery_date: formatDate(note.delivery_date),
            status: note.status,
            tracking_number: note.tracking_number,
            driver_name: note.driver_name,
            vehicle_number: note.vehicle_number,
            customer_name: note.customers?.name || 'Customer',
            customer_code: note.customers?.customer_code || '',
            order_number: note.sales_orders?.order_number || '',
            items: (note.delivery_note_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_delivered: item.quantity_delivered,
            })),
            notes: note.notes,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
        doc.save(`DeliveryNote_${note.delivery_note_number}.pdf`)
    }

    const handlePrint = () => {
        const doc = createDeliveryNotePDF({
            delivery_note_number: note.delivery_note_number,
            delivery_date: formatDate(note.delivery_date),
            status: note.status,
            tracking_number: note.tracking_number,
            driver_name: note.driver_name,
            vehicle_number: note.vehicle_number,
            customer_name: note.customers?.name || 'Customer',
            customer_code: note.customers?.customer_code || '',
            order_number: note.sales_orders?.order_number || '',
            items: (note.delivery_note_items || []).map((item: any) => ({
                description: item.products?.name || 'Item',
                quantity_delivered: item.quantity_delivered,
            })),
            notes: note.notes,
        }, {
            name: 'Business-ERP-Software',
            address: 'Rawalpindi, Pakistan',
            phone: '051-XXXXXXX',
        })
        doc.autoPrint()
        const url = doc.output('bloburl')
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/sales/deliveries">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{note.delivery_note_number}</h1>
                        <p className="text-muted-foreground">Delivery note details</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <Badge variant="outline">{note.status}</Badge>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Delivered Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qty Delivered</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {note.delivery_note_items?.length ? (
                                    note.delivery_note_items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.products?.name || 'Item'}
                                                {item.products?.sku && (
                                                    <div className="text-xs text-muted-foreground">{item.products.sku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity_delivered}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                                            No items found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Name</div>
                            <div className="font-medium">{note.customers?.name || '—'}</div>
                            <div className="text-sm text-muted-foreground">Customer Code</div>
                            <div className="font-medium">{note.customers?.customer_code || '—'}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Delivery Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">Delivery Date</div>
                            <div className="font-medium">{formatDate(note.delivery_date)}</div>
                            <div className="text-sm text-muted-foreground">Order #</div>
                            <div className="font-medium">{note.sales_orders?.order_number || '—'}</div>
                            <div className="text-sm text-muted-foreground">Tracking #</div>
                            <div className="font-medium">{note.tracking_number || '—'}</div>
                            <div className="text-sm text-muted-foreground">Driver</div>
                            <div className="font-medium">{note.driver_name || '—'}</div>
                            <div className="text-sm text-muted-foreground">Vehicle #</div>
                            <div className="font-medium">{note.vehicle_number || '—'}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
