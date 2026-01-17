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
import { format, addDays } from 'date-fns'
import { useSalesQuotation, useUpdateSalesQuotation } from '@/lib/queries/sales-quotations'
import { useCustomers } from '@/lib/queries/customers'
import { useProducts } from '@/lib/queries/products'
import { toast } from 'sonner'
import { PermissionGuard } from '@/components/permission-guard'

type QuotationItem = {
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

export default function EditQuotationPage() {
    return (
        <PermissionGuard permission="sales.quotations.read">
            <EditQuotationContent />
        </PermissionGuard>
    )
}

function EditQuotationContent() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const quotationId = params?.id || ''
    const updateQuotation = useUpdateSalesQuotation()
    const { data: quotation, isLoading } = useSalesQuotation(quotationId)
    const { data: customers } = useCustomers()
    const { data: products } = useProducts()

    // Form State
    const [customerId, setCustomerId] = useState('')
    const [quotationDate, setQuotationDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
    const [reference, setReference] = useState('')
    const [notes, setNotes] = useState('')
    const [terms, setTerms] = useState('')

    // Items State
    const [items, setItems] = useState<QuotationItem[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [showProductSearch, setShowProductSearch] = useState(false)

    // Summary State
    const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0)
    const [globalTaxPercent, setGlobalTaxPercent] = useState(0)
    const [shippingCharges, setShippingCharges] = useState(0)
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        if (!quotation || isInitialized) return

        setCustomerId(quotation.customer_id || '')
        setQuotationDate(format(new Date(quotation.quotation_date), 'yyyy-MM-dd'))
        setValidUntil(format(new Date(quotation.valid_until), 'yyyy-MM-dd'))
        setReference(quotation.reference_number || '')
        setNotes(quotation.notes || '')
        setTerms(quotation.term_and_conditions || '')
        setShippingCharges(quotation.shipping_charges || 0)

        const discountPercent = quotation.subtotal > 0
            ? (quotation.discount_amount / quotation.subtotal) * 100
            : 0
        setGlobalDiscountPercent(Number(discountPercent.toFixed(2)))

        const mappedItems = (quotation.sales_quotation_items || []).map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || 'Item',
            product_sku: item.products?.sku || '',
            description: item.description || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage,
            tax_percentage: item.tax_percentage,
            line_total: item.line_total || 0
        }))
        setItems(mappedItems)
        setIsInitialized(true)
    }, [quotation, isInitialized])

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    )

    const addItem = (product: any) => {
        const existingItem = items.find(i => i.product_id === product.id)
        if (existingItem) {
            updateItem(existingItem.id, 'quantity', existingItem.quantity + 1)
        } else {
            const newItem: QuotationItem = {
                id: Math.random().toString(36).substr(2, 9),
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku,
                description: product.description || '',
                quantity: 1,
                unit_price: product.selling_price || 0,
                discount_percentage: 0,
                tax_percentage: globalTaxPercent,
                line_total: product.selling_price || 0
            }
            setItems([...items, newItem])
        }
        setProductSearch('')
        setShowProductSearch(false)
    }

    const updateItem = (id: string, field: keyof QuotationItem, value: any) => {
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

    const taxAmount = items.reduce((sum, item) => {
        const lineSub = item.quantity * item.unit_price
        const lineDisc = lineSub * (item.discount_percentage / 100)
        const taxable = lineSub - lineDisc
        return sum + (taxable * (item.tax_percentage / 100))
    }, 0)

    const discountAmount = subtotal * (globalDiscountPercent / 100)
    const finalTotal = (subtotal - discountAmount) + taxAmount + shippingCharges

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
            await updateQuotation.mutateAsync({
                id: quotationId,
                customer_id: customerId,
                quotation_date: quotationDate,
                valid_until: validUntil,
                reference_number: reference,
                status,
                subtotal,
                discount_amount: discountAmount,
                tax_amount: taxAmount,
                shipping_charges: shippingCharges,
                total_amount: finalTotal,
                notes,
                term_and_conditions: terms,
                items: items.map(i => ({
                    product_id: i.product_id,
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    discount_percentage: i.discount_percentage,
                    tax_percentage: i.tax_percentage,
                }))
            })
            router.push(`/dashboard/sales/quotations/${quotationId}`)
        } catch (error) {
            // Error handled by mutation
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center">Loading quotation...</div>
    }

    if (!quotation) {
        return <div className="p-8 text-center text-muted-foreground">Quotation not found.</div>
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/sales/quotations/${quotationId}`}>
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Edit Sales Quotation</h1>
                    <p className="text-muted-foreground">Update quotation details and line items.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Form Area */}
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
                                    <Label>Reference #</Label>
                                    <Input
                                        value={reference}
                                        onChange={e => setReference(e.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quotation Date</Label>
                                    <Input
                                        type="date"
                                        value={quotationDate}
                                        onChange={e => setQuotationDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valid Until</Label>
                                    <Input
                                        type="date"
                                        value={validUntil}
                                        onChange={e => setValidUntil(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Line Items</h3>
                                <Button size="sm" onClick={() => setShowProductSearch(!showProductSearch)}>
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
                                        <TableHead>Description</TableHead>
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
                                            <TableCell>
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-right"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-28 text-right"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-right"
                                                    value={item.discount_percentage}
                                                    onChange={(e) => updateItem(item.id, 'discount_percentage', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    className="w-20 text-right"
                                                    value={item.tax_percentage}
                                                    onChange={(e) => updateItem(item.id, 'tax_percentage', e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                Rs. {item.line_total.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {items.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-muted-foreground">
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
                                    />
                                </div>
                                <div>
                                    <Label>Terms & Conditions</Label>
                                    <Textarea
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value)}
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
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
                                <Label>Global Discount %</Label>
                                <Input
                                    type="number"
                                    value={globalDiscountPercent}
                                    onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label>Default Tax %</Label>
                                <Input
                                    type="number"
                                    value={globalTaxPercent}
                                    onChange={(e) => setGlobalTaxPercent(parseFloat(e.target.value) || 0)}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label>Shipping Charges</Label>
                                <Input
                                    type="number"
                                    value={shippingCharges}
                                    onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                                    className="mt-2"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2">
                        <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleSubmit('draft')}
                            disabled={updateQuotation.isPending}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Draft
                        </Button>
                        <Button
                            className="w-full"
                            onClick={() => handleSubmit('pending')}
                            disabled={updateQuotation.isPending}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Submit Quotation
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
