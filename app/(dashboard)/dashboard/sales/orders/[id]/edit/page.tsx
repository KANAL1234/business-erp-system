'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Send, Plus, Trash2, Search, Calculator } from 'lucide-react'
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
import { useSalesOrder, useUpdateSalesOrder } from '@/lib/queries/sales-orders'
import { useCustomers } from '@/lib/queries/customers'
import { useProducts } from '@/lib/queries/products'
import { useLocations } from '@/lib/queries/locations'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/auth-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { useDeliveryNotes } from '@/lib/queries/delivery-notes'
import { useSalesInvoices } from '@/lib/queries/sales-invoices'

type OrderItem = {
    id: string
    product_id: string
    product_name: string
    product_sku: string
    quantity: number
    unit_price: number
    discount_percentage: number
    tax_percentage: number
    line_total: number
}

export default function EditSalesOrderPage() {
    return (
        <PermissionGuard permission="sales.orders.read">
            <EditSalesOrderContent />
        </PermissionGuard>
    )
}

function EditSalesOrderContent() {
    const router = useRouter()
    const params = useParams<{ id: string | string[] }>()
    const rawId = params?.id
    const orderId = Array.isArray(rawId) ? rawId[0] : rawId || ''

    const { user, allowedLocations } = useAuth()
    const updateOrder = useUpdateSalesOrder()
    const { data: order, isLoading } = useSalesOrder(orderId)
    const { data: customers } = useCustomers()
    const { data: products } = useProducts()
    const { data: locations } = useLocations()
    const { data: deliveryNotes } = useDeliveryNotes()
    const { data: invoices } = useSalesInvoices()

    const allowedLocationIds = allowedLocations?.map(l => l.location_id) || []
    const filteredLocations = locations?.filter(l => allowedLocationIds.includes(l.id)) || []

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [warehouseId, setWarehouseId] = useState('')
    const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [expectedDate, setExpectedDate] = useState('')
    const [notes, setNotes] = useState('')
    const [terms, setTerms] = useState('')
    const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid' | 'overdue'>('unpaid')
    const [isInitialized, setIsInitialized] = useState(false)

    // Items State
    const [items, setItems] = useState<OrderItem[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [showProductSearch, setShowProductSearch] = useState(false)

    // Summary State
    const [shippingCharges, setShippingCharges] = useState(0)
    const hasDelivery = (deliveryNotes || []).some(note => note.sales_order_id === orderId)
    const hasInvoice = (invoices || []).some(invoice => (invoice as any).sales_order_id === orderId)
    const editingLocked = hasDelivery || hasInvoice

    useEffect(() => {
        if (!order || isInitialized) return

        setCustomerId(order.customer_id || '')
        setWarehouseId(order.warehouse_id || '')
        setOrderDate(format(new Date(order.order_date), 'yyyy-MM-dd'))
        setExpectedDate(order.expected_delivery_date ? format(new Date(order.expected_delivery_date), 'yyyy-MM-dd') : '')
        setNotes(order.notes || '')
        setTerms(order.term_and_conditions || '')
        setShippingCharges(order.shipping_charges || 0)
        setPaymentStatus(order.payment_status || 'unpaid')

        const mappedItems = (order.sales_order_items || []).map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || 'Item',
            product_sku: item.products?.sku || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
            tax_percentage: 0,
            line_total: item.line_total || 0
        }))
        setItems(mappedItems)
        setIsInitialized(true)
    }, [order, isInitialized])

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )

    const addItem = (product: any) => {
        const existingItem = items.find(i => i.product_id === product.id)
        if (existingItem) {
            updateItem(existingItem.id, 'quantity', existingItem.quantity + 1)
        } else {
            const newItem: OrderItem = {
                id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku,
                quantity: 1,
                unit_price: product.selling_price || 0,
                discount_percentage: 0,
                tax_percentage: 0,
                line_total: product.selling_price || 0
            }
            setItems([...items, newItem])
        }
        setProductSearch('')
        setShowProductSearch(false)
    }

    const updateItem = (id: string, field: keyof OrderItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }

                const qty = field === 'quantity' ? parseFloat(value) || 0 : updated.quantity
                const price = field === 'unit_price' ? parseFloat(value) || 0 : updated.unit_price
                const discIds = field === 'discount_percentage' ? parseFloat(value) || 0 : updated.discount_percentage
                const taxIds = field === 'tax_percentage' ? parseFloat(value) || 0 : updated.tax_percentage

                const sub = qty * price
                const discAmt = sub * (discIds / 100)
                const taxable = sub - discAmt
                const taxAmt = taxable * (taxIds / 100)

                updated.line_total = taxable + taxAmt
                return updated
            }
            return item
        }))
    }

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id))
    }

    const subtotal = items.reduce((sum, item) => {
        const lineSub = item.quantity * item.unit_price
        const lineDisc = lineSub * (item.discount_percentage / 100)
        return sum + (lineSub - lineDisc)
    }, 0)

    const discountAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price * (item.discount_percentage / 100))
    }, 0)

    const taxAmount = items.reduce((sum, item) => {
        const lineSub = item.quantity * item.unit_price
        const lineDisc = lineSub * (item.discount_percentage / 100)
        const taxable = lineSub - lineDisc
        return sum + (taxable * (item.tax_percentage / 100))
    }, 0)

    const finalTotal = subtotal + taxAmount + shippingCharges

    const handleSubmit = async (status: 'draft' | 'pending') => {
        if (!customerId) {
            toast.error('Please select a customer')
            return
        }
        if (items.length === 0) {
            toast.error('Please add at least one product')
            return
        }

        try {
            if (editingLocked) {
                toast.error('This order cannot be edited because it already has a delivery note or invoice.')
                return
            }

            await updateOrder.mutateAsync({
                id: orderId,
                customer_id: customerId,
                warehouse_id: warehouseId || undefined,
                order_date: orderDate,
                expected_delivery_date: expectedDate || undefined,
                status,
                payment_status: paymentStatus,
                subtotal,
                discount_amount: discountAmount,
                tax_amount: taxAmount,
                shipping_charges: shippingCharges,
                total_amount: finalTotal,
                amount_paid: order?.amount_paid || 0,
                notes,
                term_and_conditions: terms,
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    discount_percentage: i.discount_percentage,
                }))
            })
            router.push('/dashboard/sales/orders')
        } catch (error) {
            // Error handled by mutation
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading order...</div>
    }

    if (!order) {
        return <div className="p-8 text-center text-muted-foreground">Order not found.</div>
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/sales/orders">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Edit Sales Order</h1>
                    <p className="text-muted-foreground">Update customer order details.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Customer</Label>
                                    <Select value={customerId} onValueChange={setCustomerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers?.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} ({c.customer_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Warehouse</Label>
                                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredLocations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id}>
                                                    {loc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Order Date</Label>
                                    <Input
                                        type="date"
                                        value={orderDate}
                                        onChange={e => setOrderDate(e.target.value)}
                                        disabled={editingLocked}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Expected Delivery</Label>
                                    <Input
                                        type="date"
                                        value={expectedDate}
                                        onChange={e => setExpectedDate(e.target.value)}
                                        disabled={editingLocked}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Line Items</h3>
                                <Button size="sm" onClick={() => setShowProductSearch(!showProductSearch)} disabled={editingLocked}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Product
                                </Button>
                            </div>

                            {showProductSearch && (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search products..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto border rounded-md">
                                        {filteredProducts?.map(product => (
                                            <div
                                                key={product.id}
                                                onClick={() => addItem(product)}
                                                className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                                            >
                                                <div className="font-medium">{product.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {product.sku} • Rs. {product.selling_price}
                                                </div>
                                            </div>
                                        ))}
                                        {filteredProducts?.length === 0 && (
                                            <div className="p-3 text-sm text-muted-foreground">
                                                No products found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Disc %</TableHead>
                                        <TableHead className="text-right">Tax %</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.product_name}</div>
                                                <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                    disabled={editingLocked}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-28 text-right"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                                                    disabled={editingLocked}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-right"
                                                    value={item.discount_percentage}
                                                    onChange={(e) => updateItem(item.id, 'discount_percentage', e.target.value)}
                                                    disabled={editingLocked}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-right"
                                                    value={item.tax_percentage}
                                                    onChange={(e) => updateItem(item.id, 'tax_percentage', e.target.value)}
                                                    disabled={editingLocked}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                Rs. {item.line_total.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={editingLocked}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                No items added
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Notes</Label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Customer notes..."
                                        className="mt-2"
                                        disabled={editingLocked}
                                    />
                                </div>
                                <div>
                                    <Label>Terms & Conditions</Label>
                                    <Textarea
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value)}
                                        className="mt-2"
                                        disabled={editingLocked}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Summary</h3>
                                <Calculator className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>Rs. {subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Discount</span>
                                    <span>Rs. {discountAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>Rs. {taxAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span>Rs. {shippingCharges.toLocaleString()}</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-semibold">
                                    <span>Total</span>
                                    <span>Rs. {finalTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <Label>Shipping Charges</Label>
                                <Input
                                    type="number"
                                    value={shippingCharges}
                                    onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                                    className="mt-2"
                                    disabled={editingLocked}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleSubmit('draft')}
                            disabled={updateOrder.isPending || editingLocked}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Draft
                        </Button>
                        <Button
                            className="w-full"
                            onClick={() => handleSubmit('pending')}
                            disabled={updateOrder.isPending || editingLocked}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Submit Order
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
