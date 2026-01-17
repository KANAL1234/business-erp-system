'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { format, addDays } from 'date-fns'
import { useCreateSalesInvoice } from '@/lib/queries/sales-invoices'
import { useCustomers } from '@/lib/queries/customers'
import { useProducts } from '@/lib/queries/products'
import { useLocation } from '@/components/providers/location-provider'
import { toast } from 'sonner'

type InvoiceItem = {
    id: string
    product_id: string
    product_name: string
    product_sku: string
    description: string
    quantity: number
    unit_price: number
    discount_percentage: number
    tax_percentage: number
    line_total: number
}

export default function NewSalesInvoicePage() {
    const router = useRouter()
    const createInvoice = useCreateSalesInvoice()
    const { data: customers } = useCustomers()
    const { data: products } = useProducts()
    const { currentLocationId } = useLocation()

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
    const [notes, setNotes] = useState('')

    // Items State
    const [items, setItems] = useState<InvoiceItem[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [showProductSearch, setShowProductSearch] = useState(false)

    // Summary State
    const [shippingCharges, setShippingCharges] = useState(0)

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )

    const addItem = (product: any) => {
        const existingItem = items.find(i => i.product_id === product.id)
        if (existingItem) {
            updateItem(existingItem.id, 'quantity', existingItem.quantity + 1)
        } else {
            const newItem: InvoiceItem = {
                id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku,
                description: product.description || '',
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

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
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

    const handleSubmit = async (status: 'draft' | 'posted') => {
        if (!customerId) {
            toast.error('Please select a customer')
            return
        }
        if (!currentLocationId) {
            toast.error('Please select a location from the header')
            return
        }
        if (items.length === 0) {
            toast.error('Please add at least one product')
            return
        }

        try {
            await createInvoice.mutateAsync({
                customer_id: customerId,
                location_id: currentLocationId,
                invoice_date: invoiceDate,
                due_date: dueDate,
                status,
                subtotal,
                discount_amount: discountAmount,
                tax_amount: taxAmount,
                shipping_charges: shippingCharges,
                total_amount: finalTotal,
                amount_paid: 0,
                notes,
                items: items.map(i => ({
                    product_id: i.product_id,
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    discount_percentage: i.discount_percentage,
                    tax_percentage: i.tax_percentage,
                    line_total: i.line_total
                }))
            })
            router.push('/dashboard/sales/invoices')
        } catch (error) {
            // Error handled by mutation
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/sales/invoices">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">New Sales Invoice</h1>
                    <p className="text-muted-foreground">Create a direct customer invoice.</p>
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
                                    <Label>Invoice Date</Label>
                                    <Input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={e => setInvoiceDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Invoice Items</h3>
                                <div className="relative w-64">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Add Product..."
                                            value={productSearch}
                                            onChange={e => {
                                                setProductSearch(e.target.value)
                                                setShowProductSearch(true)
                                            }}
                                            onFocus={() => setShowProductSearch(true)}
                                            className="pl-8"
                                        />
                                    </div>
                                    {showProductSearch && productSearch && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-auto">
                                            {filteredProducts && filteredProducts.length > 0 ? (
                                                filteredProducts.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                        onClick={() => addItem(p)}
                                                    >
                                                        <div className="font-medium">{p.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {p.sku} - Rs. {p.selling_price}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-sm text-gray-500">No products found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Product</TableHead>
                                            <TableHead className="w-[15%]">Qty</TableHead>
                                            <TableHead className="w-[15%]">Price</TableHead>
                                            <TableHead className="w-[15%]">Total</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                    No items added yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{item.product_name}</div>
                                                        <div className="text-xs text-gray-500">{item.product_sku}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-20"
                                                            value={item.quantity}
                                                            onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            className="h-8 w-24"
                                                            value={item.unit_price}
                                                            onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        Rs. {item.line_total.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500"
                                                            onClick={() => removeItem(item.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Textarea
                                        placeholder="Internal notes..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                Totals
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>Rs. {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600">
                                    <span>Discount</span>
                                    <span>-Rs. {discountAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Tax</span>
                                    <span>Rs. {taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <Input
                                        type="number"
                                        className="h-6 w-16 text-right"
                                        value={shippingCharges}
                                        onChange={e => setShippingCharges(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>Rs. {finalTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Button
                                    className="w-full"
                                    onClick={() => handleSubmit('posted')}
                                    disabled={createInvoice.isPending}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    Post Invoice
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => handleSubmit('draft')}
                                    disabled={createInvoice.isPending}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Draft
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
