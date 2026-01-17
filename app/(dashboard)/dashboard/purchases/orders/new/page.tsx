'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVendors } from '@/lib/queries/vendors'
import { useProducts } from '@/lib/queries/products'
import { useLocations } from '@/lib/queries/locations'
import { useCreatePurchaseOrder } from '@/lib/queries/purchase-orders'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

type POItem = {
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

export default function NewPurchaseOrderPage() {
    const router = useRouter()
    const queryClient = useQueryClient()

    const [vendorId, setVendorId] = useState('')
    const [locationId, setLocationId] = useState('')
    const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0])
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
    const [notes, setNotes] = useState('')
    const [termsAndConditions, setTermsAndConditions] = useState('')
    const [items, setItems] = useState<POItem[]>([])

    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedQuantity, setSelectedQuantity] = useState('')
    const [selectedUnitPrice, setSelectedUnitPrice] = useState('')

    const { data: vendors } = useVendors()
    const { data: products } = useProducts()
    const { data: locations } = useLocations()
    const createPO = useCreatePurchaseOrder()

    const handleAddItem = () => {
        if (!selectedProductId || !selectedQuantity || !selectedUnitPrice) {
            toast.error('Error', {
                description: 'Please select product and enter quantity & price',
            })
            return
        }

        const product = products?.find(p => p.id === selectedProductId)
        if (!product) return

        const quantity = Number(selectedQuantity)
        const unitPrice = Number(selectedUnitPrice)
        const lineTotal = quantity * unitPrice

        const newItem: POItem = {
            id: Math.random().toString(),
            product_id: selectedProductId,
            product_name: product.name,
            product_sku: product.sku,
            quantity,
            unit_price: unitPrice,
            discount_percentage: 0,
            tax_percentage: 0,
            line_total: lineTotal,
        }

        setItems([...items, newItem])
        setSelectedProductId('')
        setSelectedQuantity('')
        setSelectedUnitPrice('')
    }

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!vendorId || !locationId) {
            toast.error('Error', {
                description: 'Please select vendor and location',
            })
            return
        }

        if (items.length === 0) {
            toast.error('Error', {
                description: 'Please add at least one item',
            })
            return
        }

        try {
            await createPO.mutateAsync({
                vendorId,
                locationId,
                poDate,
                expectedDeliveryDate,
                items: items.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percentage: item.discount_percentage,
                    tax_percentage: item.tax_percentage,
                })),
                notes,
                termsAndConditions,
            })

            toast.success('Success', {
                description: 'Purchase order created successfully!',
            })

            await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
            await queryClient.refetchQueries({ queryKey: ['purchase-orders'] })

            router.push('/dashboard/purchases/orders')
            router.refresh()
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)

    return (
        <div className="px-4 sm:px-0">
            <div className="flex items-center mb-6">
                <Link href="/dashboard/purchases/orders">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold text-gray-900 ml-4">New Purchase Order</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PO Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Purchase Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendor">Vendor *</Label>
                                <Select value={vendorId} onValueChange={setVendorId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendors?.map((vendor) => (
                                            <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">Receiving Location *</Label>
                                <Select value={locationId} onValueChange={setLocationId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations?.map((location) => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name} ({location.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="po_date">PO Date *</Label>
                                <Input
                                    id="po_date"
                                    type="date"
                                    value={poDate}
                                    onChange={(e) => setPoDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expected_delivery">Expected Delivery Date</Label>
                                <Input
                                    id="expected_delivery"
                                    type="date"
                                    value={expectedDeliveryDate}
                                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Add Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="space-y-2 md:col-span-5">
                                <Label htmlFor="product">Product</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products?.map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name} ({product.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.001"
                                    value={selectedQuantity}
                                    onChange={(e) => setSelectedQuantity(e.target.value)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <Label htmlFor="unit_price">Unit Price</Label>
                                <Input
                                    id="unit_price"
                                    type="number"
                                    step="0.01"
                                    value={selectedUnitPrice}
                                    onChange={(e) => setSelectedUnitPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex items-end md:col-span-2">
                                <Button type="button" onClick={handleAddItem} className="w-full">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Items List */}
                {items.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items ({items.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell>{item.product_sku}</TableCell>
                                            <TableCell className="text-right">
                                                {item.quantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                Rs. {item.unit_price.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                Rs. {item.line_total.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={4} className="font-semibold">Total</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            Rs. {subtotal.toLocaleString()}
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Notes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="notes">Internal Notes</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Internal notes (not visible to vendor)..."
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="terms">Terms & Conditions</Label>
                            <Textarea
                                id="terms"
                                value={termsAndConditions}
                                onChange={(e) => setTermsAndConditions(e.target.value)}
                                placeholder="Payment terms, delivery conditions, etc..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button type="submit" disabled={createPO.isPending || items.length === 0}>
                        {createPO.isPending ? 'Creating...' : 'Create Purchase Order'}
                    </Button>
                    <Link href="/dashboard/purchases/orders">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
