'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVendors } from '@/lib/queries/vendors'
import { useProducts } from '@/lib/queries/products'
import { useLocations } from '@/lib/queries/locations'
import { usePurchaseOrder } from '@/lib/queries/purchase-orders'
import { useCreateGoodsReceipt } from '@/lib/queries/goods-receipts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useLocation } from '@/components/providers/location-provider'

type GRNItem = {
    id: string
    po_item_id?: string
    product_id: string
    product_name: string
    product_sku: string
    quantity_received: number
    unit_cost: number
    batch_number?: string
    expiry_date?: string
    line_total: number
}

export default function NewGoodsReceiptPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const poId = searchParams.get('po') || searchParams.get('po_id')

    // Queries
    const { data: po, isLoading: poLoading } = usePurchaseOrder(poId || '')
    const { data: vendors } = useVendors()
    const { data: products } = useProducts()
    const { data: locations } = useLocations()
    const createGRN = useCreateGoodsReceipt()
    const { allowedLocationIds } = useLocation()

    // Filter locations by LBAC
    const allowedLocations = locations?.filter(loc => allowedLocationIds.includes(loc.id))
    const poLocation = po?.locations || locations?.find(loc => loc.id === po?.location_id)
    const locationOptions = poLocation && !allowedLocations?.some(loc => loc.id === poLocation.id)
        ? [...(allowedLocations || []), poLocation]
        : allowedLocations
    const poVendor = vendors?.find(v => v.id === po?.vendor_id) || po?.vendors
    const vendorOptions = poVendor && !vendors?.some(v => v.id === poVendor.id)
        ? [...(vendors || []), poVendor]
        : vendors

    // State
    const [vendorId, setVendorId] = useState('')
    const [locationId, setLocationId] = useState('')
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
    const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('')
    const [vendorInvoiceDate, setVendorInvoiceDate] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<GRNItem[]>([])

    // Load PO data if available
    useEffect(() => {
        if (po) {
            setVendorId(prev => prev || po.vendor_id || po.vendors?.id || '')
            setLocationId(prev => prev || po.location_id || '')
            if (!receiptDate) {
                setReceiptDate(new Date().toISOString().split('T')[0])
            }

            const newItems = (po.purchase_order_items || []).map((item: any) => {
                const orderedQty = Number(item.quantity || 0)
                const receivedQty = Number(item.quantity_received || 0)
                const remainingQty = Math.max(0, orderedQty - receivedQty)
                return {
                    id: Math.random().toString(),
                    po_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.products?.name || 'Item',
                    product_sku: item.products?.sku || '-',
                    quantity_received: remainingQty,
                    unit_cost: Number(item.unit_price || 0),
                    line_total: remainingQty * Number(item.unit_price || 0)
                }
            }).filter((item: GRNItem) => item.quantity_received > 0)

            setItems(newItems)
        }
    }, [po])

    // Helpers
    const handleQuantityChange = (id: string, qty: number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    quantity_received: qty,
                    line_total: qty * item.unit_cost
                }
            }
            return item
        }))
    }

    const handleCostChange = (id: string, cost: number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    unit_cost: cost,
                    line_total: item.quantity_received * cost
                }
            }
            return item
        }))
    }

    const handleBatchChange = (id: string, batch: string) => {
        setItems(items.map(item => item.id === id ? { ...item, batch_number: batch } : item))
    }

    const handleExpiryChange = (id: string, date: string) => {
        setItems(items.map(item => item.id === id ? { ...item, expiry_date: date } : item))
    }

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const effectiveVendorId = vendorId || po?.vendor_id || po?.vendors?.id || ''
        const effectiveLocationId = locationId || po?.location_id || ''

        if (!effectiveVendorId || !effectiveLocationId) {
            toast.error('Error', { description: 'Please select vendor and location' })
            return
        }

        if (items.length === 0) {
            toast.error('Error', { description: 'No items to receive' })
            return
        }

        try {
            await createGRN.mutateAsync({
                poId: poId || undefined,
                vendorId: effectiveVendorId,
                locationId: effectiveLocationId,
                receiptDate,
                vendorInvoiceNumber,
                vendorInvoiceDate,
                items: items.map(item => ({
                    po_item_id: item.po_item_id,
                    product_id: item.product_id,
                    quantity_received: item.quantity_received,
                    unit_cost: item.unit_cost,
                    batch_number: item.batch_number,
                    expiry_date: item.expiry_date,
                })),
                notes,
            })

            toast.success('Success', { description: 'Goods received successfully!' })
            router.push('/dashboard/purchases/grn')
        } catch (error: any) {
            toast.error('Error', { description: error.message })
        }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0)

    if (poId && poLoading) {
        return <div className="flex items-center justify-center h-64">Loading purchase order...</div>
    }

    return (
        <div className="px-4 sm:px-0">
            <div className="flex items-center mb-6">
                <Link href="/dashboard/purchases/grn">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <h2 className="text-3xl font-bold text-gray-900 ml-4">
                    {poId ? `Receive Goods from PO: ${po?.po_number}` : 'New Goods Receipt'}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Receipt Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vendor</Label>
                                {poId ? (
                                    <Input value={poVendor?.name || (po?.vendor_id ? `Vendor ${po.vendor_id}` : 'Unknown vendor')} disabled />
                                ) : (
                                    <Select value={vendorId} onValueChange={setVendorId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select vendor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vendorOptions?.map(v => (
                                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                {poId ? (
                                    <Input value={poLocation ? `${poLocation.name}` : (po?.location_id ? `Location ${po.location_id}` : 'Unknown location')} disabled />
                                ) : (
                                    <Select value={locationId} onValueChange={setLocationId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locationOptions?.map(l => (
                                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Receipt Date</Label>
                                <Input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Vendor Invoice #</Label>
                                <Input value={vendorInvoiceNumber} onChange={e => setVendorInvoiceNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Invoice Date</Label>
                                <Input type="date" value={vendorInvoiceDate} onChange={e => setVendorInvoiceDate(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Items */}
                <Card>
                    <CardHeader><CardTitle>Items to Receive</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Received Qty</TableHead>
                                    <TableHead>Unit Cost</TableHead>
                                    <TableHead>Batch #</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    {!poId && <TableHead className="text-right">Action</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div>{item.product_name}</div>
                                            <div className="text-xs text-gray-500">{item.product_sku}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.001"
                                                className="w-24"
                                                value={item.quantity_received}
                                                onChange={e => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-24"
                                                value={item.unit_cost}
                                                onChange={e => handleCostChange(item.id, parseFloat(e.target.value) || 0)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                className="w-32"
                                                value={item.batch_number || ''}
                                                onChange={e => handleBatchChange(item.id, e.target.value)}
                                                placeholder="Optional"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="date"
                                                className="w-32"
                                                value={item.expiry_date || ''}
                                                onChange={e => handleExpiryChange(item.id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">Rs. {item.line_total.toLocaleString()}</TableCell>
                                        {!poId && (
                                            <TableCell className="text-right">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex justify-end mt-4">
                            <div className="text-lg font-bold">Total: Rs. {totalAmount.toLocaleString()}</div>
                        </div>

                    </CardContent>
                </Card>

                <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                <div className="flex gap-4">
                    <Button type="submit" disabled={createGRN.isPending}>
                        {createGRN.isPending ? 'Processing...' : 'Receive Goods'}
                    </Button>
                    <Link href="/dashboard/purchases/grn">
                        <Button type="button" variant="outline">Cancel</Button>
                    </Link>
                </div>

            </form>
        </div>
    )
}
