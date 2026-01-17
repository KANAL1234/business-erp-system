'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Truck, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDeliveryNotes } from '@/lib/queries/delivery-notes'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { formatDate } from '@/lib/utils'
import { DeliveryNote } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { createDeliveryNotePDF } from '@/lib/utils/export'
import { ListSortControls } from '@/components/list-sort-controls'

export default function DeliveryNotesPage() {
    return (
        <PermissionGuard permission="sales.deliveries.read">
            <DeliveryNotesContent />
        </PermissionGuard>
    )
}

function DeliveryNotesContent() {
    const { currentLocationId } = useLocation()
    const { data: notes, isLoading } = useDeliveryNotes()
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const supabase = createClient()

    const handleDownload = async (noteId: string) => {
        const { data: note, error } = await supabase
            .from('delivery_notes')
            .select(`
                *,
                customers (
                    id,
                    name,
                    customer_code
                ),
                sales_orders (order_number),
                delivery_note_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', noteId)
            .single()

        if (error || !note) {
            toast.error('Failed to download delivery note PDF')
            return
        }

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

    const handlePrint = async (noteId: string) => {
        const { data: note, error } = await supabase
            .from('delivery_notes')
            .select(`
                *,
                customers (
                    id,
                    name,
                    customer_code
                ),
                sales_orders (order_number),
                delivery_note_items (
                    *,
                    products (
                        id,
                        name,
                        sku,
                        uom_id
                    )
                )
            `)
            .eq('id', noteId)
            .single()

        if (error || !note) {
            toast.error('Failed to print delivery note')
            return
        }

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

    const filteredNotes = notes?.filter(note => {
        // Location filter
        if (currentLocationId) {
            const locationId = (note as any).warehouse_location_id || (note as any).location_id
            if (locationId && locationId !== currentLocationId) {
                return false
            }
        }

        // Search filter
        if (searchTerm) {
            return note.delivery_note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.sales_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
        }

        return true
    })

    const sortedNotes = useMemo(() => {
        const data = filteredNotes ? [...filteredNotes] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at || row.delivery_date).getTime(),
            delivery_date: (row) => new Date(row.delivery_date).getTime(),
            delivery_note_number: (row) => String(row.delivery_note_number || ''),
            status: (row) => String(row.status || ''),
            customer: (row) => String(row.customers?.name || ''),
        }
        const getValue = sorters[sortBy] || sorters.created_at
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [filteredNotes, sortBy, sortOrder])

    const getStatusBadge = (status: DeliveryNote['status']) => {
        switch (status) {
            case 'draft': return <Badge variant="secondary">Draft</Badge>
            case 'shipped': return <Badge className="bg-primary/50 hover:bg-primary">Shipped</Badge>
            case 'delivered': return <Badge className="bg-green-500 hover:bg-green-600">Delivered</Badge>
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading delivery notes...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Delivery Notes</h1>
                    <p className="text-muted-foreground">
                        {currentLocationId
                            ? 'Showing deliveries for selected location'
                            : 'Track shipments and deliveries (all locations)'}
                    </p>
                </div>
                {/* 
                  Usually Delivery Notes are created from Sales Orders, 
                  but we can allow manual creation if needed.
                  For now we'll assume manual is secondary or handle it via New Page logic 
                  that asks for an order first.
                */}
                <Link href="/dashboard/sales/deliveries/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Delivery Note
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">
                        Recent Deliveries
                    </CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search deliveries..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 w-[250px]"
                            />
                        </div>
                        <ListSortControls
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSortByChange={setSortBy}
                            onSortOrderChange={setSortOrder}
                            options={[
                                { value: 'created_at', label: 'Date Added' },
                                { value: 'delivery_date', label: 'Delivery Date' },
                                { value: 'delivery_note_number', label: 'DN Number' },
                                { value: 'customer', label: 'Customer' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>DN Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Order #</TableHead>
                                <TableHead>Driver/Vehicle</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedNotes?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No delivery notes found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedNotes?.map((note) => (
                                    <TableRow key={note.id}>
                                        <TableCell className="font-medium">{note.delivery_note_number}</TableCell>
                                        <TableCell>{formatDate(note.delivery_date)}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{note.customers?.name}</div>
                                            <div className="text-xs text-muted-foreground">{note.customers?.customer_code}</div>
                                        </TableCell>
                                        <TableCell>{note.sales_orders?.order_number}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{note.driver_name || '-'}</div>
                                            <div className="text-xs text-muted-foreground">{note.vehicle_number}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(note.status)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/dashboard/sales/deliveries/${note.id}`}>
                                                        <Truck className="mr-2 h-4 w-4" />
                                                        View
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePrint(note.id)}
                                                >
                                                    <Printer className="mr-2 h-4 w-4" />
                                                    Print
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(note.id)}
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    PDF
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
