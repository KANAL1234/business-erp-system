'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocations } from '@/lib/queries/locations'
import { useProducts } from '@/lib/queries/products'
import { useLocationStock } from '@/lib/queries/inventory'
import { useCreateTransfer } from '@/lib/queries/stock-transfers'
import { useAuth } from '@/components/providers/auth-provider'
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
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

type TransferItem = {
    id: string
    product_id: string
    product_name: string
    product_sku: string
    quantity_requested: number
    available_quantity: number
    unit_cost: number
}

export default function NewStockTransferPage() {
    const router = useRouter()

    const [fromLocationId, setFromLocationId] = useState('')
    const [toLocationId, setToLocationId] = useState('')
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<TransferItem[]>([])

    const [selectedProductId, setSelectedProductId] = useState('')
    const [selectedQuantity, setSelectedQuantity] = useState('')

    const { data: locations } = useLocations()
    const { data: products } = useProducts()
    const { data: fromStock } = useLocationStock(fromLocationId)
    const createTransfer = useCreateTransfer()
    const { hasLocationAccess } = useAuth()

    const userAllowedLocations = locations?.filter(loc => hasLocationAccess(loc.id))

    const availableProducts = fromStock?.filter(stock =>
        stock.quantity_available > 0 &&
        !items.some(item => item.product_id === stock.product_id)
    )

    const handleAddItem = () => {
        if (!selectedProductId || !selectedQuantity) {
            toast.error('Error', {
                description: 'Please select a product and enter quantity',
            })
            return
        }

        const stock = fromStock?.find(s => s.product_id === selectedProductId)
        if (!stock) return

        const quantity = Number(selectedQuantity)
        if (quantity > stock.quantity_available) {
            toast.error('Error', {
                description: `Only ${stock.quantity_available} units available`,
            })
            return
        }

        const newItem: TransferItem = {
            id: Math.random().toString(),
            product_id: selectedProductId,
            product_name: stock.products.name,
            product_sku: stock.products.sku,
            quantity_requested: quantity,
            available_quantity: stock.quantity_available,
            unit_cost: stock.average_cost,
        }

        setItems([...items, newItem])
        setSelectedProductId('')
        setSelectedQuantity('')
    }

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!fromLocationId || !toLocationId) {
            toast.error('Error', {
                description: 'Please select both locations',
            })
            return
        }

        if (fromLocationId === toLocationId) {
            toast.error('Error', {
                description: 'From and To locations must be different',
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
            await createTransfer.mutateAsync({
                from_location_id: fromLocationId,
                to_location_id: toLocationId,
                transfer_date: transferDate,
                notes,
                items: items.map(item => ({
                    product_id: item.product_id,
                    quantity_requested: item.quantity_requested,
                    unit_cost: item.unit_cost,
                })),
            })

            toast.success('Success', {
                description: 'Stock transfer created successfully!',
            })

            router.push('/dashboard/inventory/transfers')
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    const totalItems = items.length
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity_requested, 0)
    const totalValue = items.reduce((sum, item) => sum + (item.quantity_requested * item.unit_cost), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/inventory/transfers">
                    <Button variant="ghost" size="sm" className="h-8">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">New Stock Transfer</h2>
                    <p className="text-slate-500">Plan and approve movement of goods.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Transfer Details */}
                <Card>
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-lg">Transfer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="from_location" className="text-slate-700 font-bold">From Location *</Label>
                                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select origin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {userAllowedLocations?.map((location) => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name} ({location.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="to_location" className="text-slate-700 font-bold">To Location *</Label>
                                <Select
                                    value={toLocationId}
                                    onValueChange={setToLocationId}
                                    disabled={!fromLocationId}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select destination" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locations
                                            ?.filter(loc => loc.id !== fromLocationId)
                                            ?.map((location) => (
                                                <SelectItem key={location.id} value={location.id}>
                                                    {location.name} ({location.code})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="transfer_date" className="text-slate-700 font-bold">Transfer Date *</Label>
                                <Input
                                    id="transfer_date"
                                    type="date"
                                    className="h-11"
                                    value={transferDate}
                                    onChange={(e) => setTransferDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-slate-700 font-bold">Notes</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Reason for transfer, special instructions..."
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Add Items */}
                {fromLocationId && (
                    <Card className="border-primary/10 bg-primary/5">
                        <CardHeader className="bg-primary/5 border-b border-primary/10">
                            <CardTitle className="text-lg text-primary">Add Items to Transfer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {!availableProducts || availableProducts.length === 0 ? (
                                <Alert className="bg-amber-50 border-amber-200">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-amber-800">
                                        No products with available stock at the selected location.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="space-y-2 md:col-span-8">
                                        <Label htmlFor="product" className="text-slate-700 font-bold">Product</Label>
                                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                            <SelectTrigger className="h-11 bg-white">
                                                <SelectValue placeholder="Select product from source inventory" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableProducts?.map((stock) => (
                                                    <SelectItem key={stock.product_id} value={stock.product_id}>
                                                        {stock.products.name} (SKU: {stock.products.sku}) - Available: {stock.quantity_available}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 md:col-span-3">
                                        <Label htmlFor="quantity" className="text-slate-700 font-bold">Quantity</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            step="0.001"
                                            className="h-11 bg-white"
                                            value={selectedQuantity}
                                            onChange={(e) => setSelectedQuantity(e.target.value)}
                                            placeholder="Enter quantity"
                                        />
                                    </div>

                                    <div className="md:col-span-1">
                                        <Button type="button" onClick={handleAddItem} className="h-11 w-full bg-primary hover:bg-primary/90">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Items List */}
                {items.length > 0 && (
                    <Card className="shadow-lg border-2">
                        <CardHeader className="bg-slate-50/80 border-b">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span>Transfer Items List</span>
                                <Badge variant="secondary" className="font-bold">{totalItems} Total Lines</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-100/50">
                                        <TableRow>
                                            <TableHead className="font-bold">Product</TableHead>
                                            <TableHead className="font-bold">SKU</TableHead>
                                            <TableHead className="text-right font-bold">Quantity</TableHead>
                                            <TableHead className="text-right font-bold">Unit Cost</TableHead>
                                            <TableHead className="text-right font-bold">Total Val.</TableHead>
                                            <TableHead className="text-right font-bold">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50/50 animate-in fade-in slide-in-from-left-2 duration-300">
                                                <TableCell className="font-bold text-slate-900">{item.product_name}</TableCell>
                                                <TableCell className="font-mono text-xs">{item.product_sku}</TableCell>
                                                <TableCell className="text-right font-bold text-primary">
                                                    {item.quantity_requested.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right text-slate-500">
                                                    Rs. {item.unit_cost.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-900">
                                                    Rs. {(item.quantity_requested * item.unit_cost).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-slate-900 text-white hover:bg-slate-900">
                                            <TableCell colSpan={2} className="font-bold">TOTAL VALUES</TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                {totalQuantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right font-bold text-lg">
                                                Rs. {totalValue.toLocaleString()}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                        type="submit"
                        size="lg"
                        className="h-12 px-8 bg-slate-900 hover:bg-slate-800"
                        disabled={createTransfer.isPending || items.length === 0}
                    >
                        {createTransfer.isPending ? 'Processing...' : 'Submit Draft Transfer'}
                    </Button>
                    <Link href="/dashboard/inventory/transfers">
                        <Button type="button" variant="outline" size="lg" className="h-12 px-8">
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
