'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Send, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { useCreateDeliveryNote } from '@/lib/queries/delivery-notes'
import { useSalesOrders, useSalesOrder } from '@/lib/queries/sales-orders'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function NewDeliveryNotePage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // If order_id is passed, pre-select it
    const preSelectedOrderId = searchParams.get('order_id')

    const createDeliveryNote = useCreateDeliveryNote()
    const { data: orders } = useSalesOrders()
    const supabase = createClient()

    const [selectedOrderId, setSelectedOrderId] = useState(preSelectedOrderId || '')
    const [deliveryDate, setDeliveryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [vehicleNumber, setVehicleNumber] = useState('')
    const [driverName, setDriverName] = useState('')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [notes, setNotes] = useState('')

    // Fetch details of selected order to populate items
    const { data: selectedOrder } = useSalesOrder(selectedOrderId)

    const [itemsToDeliver, setItemsToDeliver] = useState<{
        sales_order_item_id: string
        product_id: string
        product_name: string
        quantity_ordered: number
        quantity_already_delivered: number
        quantity_to_deliver: number
    }[]>([])

    // Populate items when order selection changes
    useEffect(() => {
        if (!selectedOrder) return

        const loadDeliveredQuantities = async () => {
            const { data, error } = await supabase
                .from('delivery_note_items')
                .select('sales_order_item_id, quantity_delivered, delivery_notes!inner(sales_order_id)')
                .eq('delivery_notes.sales_order_id', selectedOrder.id)

            if (error) {
                console.warn('Failed to load delivered quantities:', error)
            }

            const deliveredByItem = (data || []).reduce((acc: Record<string, number>, row: any) => {
                const current = acc[row.sales_order_item_id] || 0
                acc[row.sales_order_item_id] = current + Number(row.quantity_delivered || 0)
                return acc
            }, {})

            const items = selectedOrder.sales_order_items.map(item => {
                const ordered = Number(item.quantity || 0)
                const delivered = Number(deliveredByItem[item.id] || 0)
                const remaining = Math.max(ordered - delivered, 0)

                return {
                    sales_order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.products?.name || 'Unknown Product',
                    quantity_ordered: ordered,
                    quantity_already_delivered: delivered,
                    quantity_to_deliver: remaining
                }
            })

            setItemsToDeliver(items)
        }

        loadDeliveredQuantities()
    }, [selectedOrder, supabase])

    const updateQuantity = (itemId: string, qty: number) => {
        setItemsToDeliver(prev => prev.map(item =>
            item.sales_order_item_id === itemId ? { ...item, quantity_to_deliver: qty } : item
        ))
    }

    const handleSubmit = async (status: 'draft' | 'shipped') => {
        if (!selectedOrderId || !selectedOrder) {
            toast.error('Please select a sales order')
            return
        }

        const validItems = itemsToDeliver.filter(i => i.quantity_to_deliver > 0)

        if (validItems.length === 0) {
            toast.error('Please specify quantity to deliver for at least one item')
            return
        }

        try {
            await createDeliveryNote.mutateAsync({
                sales_order_id: selectedOrderId,
                customer_id: selectedOrder.customer_id,
                delivery_date: deliveryDate,
                vehicle_number: vehicleNumber,
                driver_name: driverName,
                tracking_number: trackingNumber,
                status,
                notes,
                items: validItems.map(i => ({
                    sales_order_item_id: i.sales_order_item_id,
                    product_id: i.product_id,
                    quantity_delivered: i.quantity_to_deliver
                }))
            })
            router.push('/dashboard/sales/deliveries')
        } catch (error) {
            // Error handled by mutation
        }
    }

    const unfulfilledOrders = orders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled')

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/sales/deliveries">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">New Delivery Note</h1>
                    <p className="text-muted-foreground">Process shipping for a sales order.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Select Sales Order</Label>
                                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an open order..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unfulfilledOrders?.map(order => (
                                            <SelectItem key={order.id} value={order.id}>
                                                {order.order_number} - {order.customers?.name} ({format(new Date(order.order_date), 'MMM dd')})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedOrder && (
                                <div className="p-4 bg-muted/50 rounded-md text-sm space-y-2">
                                    <div className="font-semibold">Order Details:</div>
                                    <div>Customer: {selectedOrder.customers?.name}</div>
                                    <div>Address: {selectedOrder.delivery_address || 'No address specified'}</div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={e => setDeliveryDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tracking #</Label>
                                    <Input
                                        value={trackingNumber}
                                        onChange={e => setTrackingNumber(e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Driver Name</Label>
                                    <Input
                                        value={driverName}
                                        onChange={e => setDriverName(e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vehicle #</Label>
                                    <Input
                                        value={vehicleNumber}
                                        onChange={e => setVehicleNumber(e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedOrderId && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-semibold mb-4">Items to Deliver</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Ordered</TableHead>
                                            <TableHead className="text-right">Delivered</TableHead>
                                            <TableHead className="w-[120px]">This Delivery</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemsToDeliver.map(item => (
                                            <TableRow key={item.sales_order_item_id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                                                <TableCell className="text-right">{item.quantity_already_delivered}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        className="h-8"
                                                        min={0}
                                                        max={item.quantity_ordered - item.quantity_already_delivered}
                                                        value={item.quantity_to_deliver}
                                                        onChange={e => updateQuantity(item.sales_order_item_id, parseFloat(e.target.value) || 0)}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold">Actions</h3>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Delivery instructions..."
                                    rows={4}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => handleSubmit('shipped')}
                                disabled={createDeliveryNote.isPending || !selectedOrderId}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Confirm Shipment
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
