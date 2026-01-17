'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Send, Trash2, Search } from 'lucide-react'
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
import { useCreateSalesReturn } from '@/lib/queries/sales-returns'
import { useCustomers } from '@/lib/queries/customers'
import { useProducts } from '@/lib/queries/products'
import { toast } from 'sonner'
import { useSalesInvoices, useSalesInvoice } from '@/lib/queries/sales-invoices'

type ReturnItem = {
    id: string
    product_id: string
    product_name: string
    quantity: number
    condition: 'good' | 'damaged' | 'defective'
    action: 'restock' | 'discard' | 'repair'
}

export default function NewSalesReturnPage() {
    const router = useRouter()
    const createReturn = useCreateSalesReturn()
    const { data: customers } = useCustomers()
    const { data: products } = useProducts()
    const { data: invoices } = useSalesInvoices()

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [invoiceId, setInvoiceId] = useState('')
    const [returnDate, setReturnDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [reason, setReason] = useState('')
    const [refundAmount, setRefundAmount] = useState(0)

    // Items
    const [items, setItems] = useState<ReturnItem[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [showProductSearch, setShowProductSearch] = useState(false)

    // If invoice selected, filter products to invoice items? 
    // For simplicity, allowing any product return for now, but in real app should ideally link to invoice items.

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )

    const addItem = (product: any) => {
        const newItem: ReturnItem = {
            id: Math.random().toString(36).substr(2, 9),
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            condition: 'good',
            action: 'restock'
        }
        setItems([...items, newItem])
        setProductSearch('')
        setShowProductSearch(false)
    }

    const updateItem = (id: string, field: keyof ReturnItem, value: any) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ))
    }

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id))
    }

    const handleSubmit = async (status: 'draft' | 'approved') => {
        if (items.length === 0) {
            toast.error('Please add returned items')
            return
        }

        try {
            await createReturn.mutateAsync({
                customer_id: customerId || undefined,
                sales_invoice_id: invoiceId || undefined,
                return_date: returnDate,
                reason,
                status,
                refund_amount: refundAmount,
                items: items.map(i => ({
                    product_id: i.product_id,
                    quantity_returned: i.quantity,
                    condition: i.condition,
                    action: i.action
                }))
            })
            router.push('/dashboard/sales/returns')
        } catch (error) {
            // Error handled by mutation
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/sales/returns">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">New Sales Return</h1>
                    <p className="text-muted-foreground">Process a customer return.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="p-6 grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Customer (Optional)</Label>
                                    <Select value={customerId} onValueChange={setCustomerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers?.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Original Invoice (Optional)</Label>
                                    <Select value={invoiceId} onValueChange={setInvoiceId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Invoice" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {invoices?.map(inv => (
                                                <SelectItem key={inv.id} value={inv.id}>
                                                    {inv.invoice_number}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Return Date</Label>
                                    <Input
                                        type="date"
                                        value={returnDate}
                                        onChange={e => setReturnDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Refund Amount</Label>
                                    <Input
                                        type="number"
                                        value={refundAmount}
                                        onChange={e => setRefundAmount(parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Returned Items</h3>
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
                                            {filteredProducts && filteredProducts.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    onClick={() => addItem(p)}
                                                >
                                                    <div className="font-medium">{p.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="w-[80px]">Qty</TableHead>
                                        <TableHead>Condition</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="h-8"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select value={item.condition} onValueChange={v => updateItem(item.id, 'condition', v)}>
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="good">Good</SelectItem>
                                                        <SelectItem value="damaged">Damaged</SelectItem>
                                                        <SelectItem value="defective">Defective</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select value={item.action} onValueChange={v => updateItem(item.id, 'action', v)}>
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="restock">Restock</SelectItem>
                                                        <SelectItem value="discard">Discard</SelectItem>
                                                        <SelectItem value="repair">Repair</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeItem(item.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="font-semibold">Actions</h3>
                            <div className="space-y-2">
                                <Label>Reason for Return</Label>
                                <Textarea
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Explanation..."
                                    rows={4}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => handleSubmit('approved')}
                                disabled={createReturn.isPending}
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Approve Return
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
