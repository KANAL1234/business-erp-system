'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocations } from '@/lib/queries/locations'
import { useLocationStock } from '@/lib/queries/inventory'
import { useCreateAdjustment } from '@/lib/queries/stock-adjustments'
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
import { ArrowLeft, Plus, Trash2, AlertCircle, TrendingDown, TrendingUp, Info } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

type AdjustmentItem = {
    id: string
    product_id: string
    product_name: string
    product_sku: string
    system_quantity: number
    physical_quantity: number
    difference: number
    unit_cost: number
    notes?: string
}

export default function NewStockAdjustmentPage() {
    const router = useRouter()

    const [locationId, setLocationId] = useState('')
    const [adjustmentType, setAdjustmentType] = useState('')
    const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0])
    const [reason, setReason] = useState('')
    const [items, setItems] = useState<AdjustmentItem[]>([])

    const [selectedProductId, setSelectedProductId] = useState('')
    const [physicalQuantity, setPhysicalQuantity] = useState('')
    const [itemNotes, setItemNotes] = useState('')

    const { data: locations } = useLocations()
    const { data: locationStock } = useLocationStock(locationId)
    const createAdjustment = useCreateAdjustment()

    const availableProducts = locationStock?.filter(stock =>
        !items.some(item => item.product_id === stock.product_id)
    )

    const handleAddItem = () => {
        if (!selectedProductId || physicalQuantity === '') {
            toast.error('Error', {
                description: 'Please select a product and enter physical quantity',
            })
            return
        }

        const stock = locationStock?.find(s => s.product_id === selectedProductId)
        if (!stock) return

        const physical = Number(physicalQuantity)
        const system = stock.quantity_on_hand
        const diff = physical - system

        const newItem: AdjustmentItem = {
            id: Math.random().toString(),
            product_id: selectedProductId,
            product_name: stock.products.name,
            product_sku: stock.products.sku,
            system_quantity: system,
            physical_quantity: physical,
            difference: diff,
            unit_cost: stock.average_cost,
            notes: itemNotes,
        }

        setItems([...items, newItem])
        setSelectedProductId('')
        setPhysicalQuantity('')
        setItemNotes('')
    }

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!locationId || !adjustmentType || !reason) {
            toast.error('Error', {
                description: 'Please fill in all required fields',
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
            await createAdjustment.mutateAsync({
                location_id: locationId,
                adjustment_type: adjustmentType,
                adjustment_date: adjustmentDate,
                reason,
                items: items.map(item => ({
                    product_id: item.product_id,
                    system_quantity: item.system_quantity,
                    physical_quantity: item.physical_quantity,
                    unit_cost: item.unit_cost,
                    notes: item.notes,
                })),
            })

            toast.success('Success', {
                description: 'Stock adjustment created successfully!',
            })

            router.push('/dashboard/inventory/adjustments')
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    const totalDifference = items.reduce((sum, item) => sum + item.difference, 0)
    const totalValueDifference = items.reduce((sum, item) => sum + (item.difference * item.unit_cost), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/inventory/adjustments">
                    <Button variant="ghost" size="sm" className="h-8">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">New Stock Adjustment</h2>
                    <p className="text-slate-500">Document discrepancies or damage in inventory.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Adjustment Details */}
                <Card>
                    <CardHeader className="bg-slate-50/50 border-b">
                        <CardTitle className="text-lg">Adjustment Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="location" className="text-slate-700 font-bold">Target Location *</Label>
                                <Select value={locationId} onValueChange={setLocationId}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select location to adjust" />
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
                                <Label htmlFor="adjustment_type" className="text-slate-700 font-bold">Adjustment Type *</Label>
                                <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Reason category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CYCLE_COUNT">Cycle Count (Stock Take)</SelectItem>
                                        <SelectItem value="DAMAGE">Damage (Stock Out)</SelectItem>
                                        <SelectItem value="EXPIRY">Expiry (Disposal)</SelectItem>
                                        <SelectItem value="LOSS">Loss/Theft</SelectItem>
                                        <SelectItem value="FOUND">Found Stock (Stock In)</SelectItem>
                                        <SelectItem value="OTHER">Other Adjustment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adjustment_date" className="text-slate-700 font-bold">Effective Date *</Label>
                                <Input
                                    id="adjustment_date"
                                    type="date"
                                    className="h-11"
                                    value={adjustmentDate}
                                    onChange={(e) => setAdjustmentDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-slate-700 font-bold">Detailed Reason *</Label>
                            <Textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Explain the cause of this adjustment for audit purposes..."
                                rows={3}
                                required
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Add Items */}
                {locationId && (
                    <Card className="border-amber-100 bg-amber-50/10">
                        <CardHeader className="bg-amber-50/30 border-b border-amber-100">
                            <CardTitle className="text-lg text-amber-900">Add Discrepancies</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {!availableProducts || availableProducts.length === 0 ? (
                                <Alert className="bg-slate-50 border-slate-200">
                                    <Info className="h-4 w-4 text-slate-600" />
                                    <AlertDescription className="text-slate-600">
                                        {locationStock?.length === 0
                                            ? 'No inventory records found for this location.'
                                            : 'All available products have been added to the list.'}
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="space-y-2 md:col-span-5">
                                            <Label htmlFor="product" className="text-slate-700 font-bold">Select Product</Label>
                                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                                <SelectTrigger className="h-11 bg-white">
                                                    <SelectValue placeholder="Choose product..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProducts?.map((stock) => (
                                                        <SelectItem key={stock.product_id} value={stock.product_id}>
                                                            {stock.products.name} - System: {stock.quantity_on_hand}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="physical_qty" className="text-slate-700 font-bold">Physical Count</Label>
                                            <Input
                                                id="physical_qty"
                                                type="number"
                                                step="0.001"
                                                className="h-11 bg-white"
                                                value={physicalQuantity}
                                                onChange={(e) => setPhysicalQuantity(e.target.value)}
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-4">
                                            <Label htmlFor="item_notes" className="text-slate-700 font-bold">Line Note (Optional)</Label>
                                            <Input
                                                id="item_notes"
                                                className="h-11 bg-white"
                                                value={itemNotes}
                                                onChange={(e) => setItemNotes(e.target.value)}
                                                placeholder="e.g. Batch # expired"
                                            />
                                        </div>

                                        <div className="md:col-span-1">
                                            <Button type="button" onClick={handleAddItem} className="h-11 w-full bg-slate-900 hover:bg-slate-800">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {selectedProductId && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 text-white text-sm">
                                            <div className="flex items-center gap-1 opacity-70">
                                                <TrendingDown className="h-3.5 w-3.5" /> System Qty:
                                                <span className="font-mono">{locationStock?.find(s => s.product_id === selectedProductId)?.quantity_on_hand || 0}</span>
                                            </div>
                                            {physicalQuantity && (
                                                <div className="flex items-center gap-1 font-bold">
                                                    {Number(physicalQuantity) - (locationStock?.find(s => s.product_id === selectedProductId)?.quantity_on_hand || 0) >= 0
                                                        ? <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                                                        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                                                    }
                                                    Calculated Variance:
                                                    <span className={Number(physicalQuantity) - (locationStock?.find(s => s.product_id === selectedProductId)?.quantity_on_hand || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        {(Number(physicalQuantity) - (locationStock?.find(s => s.product_id === selectedProductId)?.quantity_on_hand || 0)).toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Items List */}
                {items.length > 0 && (
                    <Card className="shadow-lg border-2">
                        <CardHeader className="bg-slate-50/80 border-b">
                            <CardTitle className="text-lg">Adjustment Items Impact Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-100/50">
                                        <TableRow>
                                            <TableHead className="font-bold">Product</TableHead>
                                            <TableHead className="text-right font-bold">System</TableHead>
                                            <TableHead className="text-right font-bold">Physical</TableHead>
                                            <TableHead className="text-right font-bold">Variance</TableHead>
                                            <TableHead className="text-right font-bold">Value Impact</TableHead>
                                            <TableHead className="text-right font-bold">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50/30">
                                                <TableCell>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{item.product_name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{item.product_sku}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-slate-500">
                                                    {item.system_quantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {item.physical_quantity.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`inline-flex items-center font-bold font-mono text-sm px-2 py-0.5 rounded ${item.difference >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.difference > 0 && '+'}{item.difference.toLocaleString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-slate-900">
                                                    <span className={item.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                        {item.difference > 0 && '+'}Rs. {(item.difference * item.unit_cost).toLocaleString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 hover:bg-red-50 hover:text-red-600"
                                                        onClick={() => handleRemoveItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-slate-900 text-white hover:bg-slate-900 text-lg">
                                            <TableCell colSpan={3} className="font-bold">NET INVENTORY IMPACT</TableCell>
                                            <TableCell className="text-right font-bold font-mono">
                                                <span className={totalDifference >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {totalDifference > 0 && '+'}{totalDifference.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold font-mono">
                                                <span className={totalValueDifference >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                    {totalValueDifference > 0 && '+'}Rs. {totalValueDifference.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            {Math.abs(totalValueDifference) > 10000 && (
                                <div className="px-6 py-4">
                                    <Alert variant="destructive" className="border-2 border-red-200">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="font-bold">
                                            Critical value adjustment detected (Impact: Rs. {Math.abs(totalValueDifference).toLocaleString()}).
                                            This record will require administrative approval before inventory levels are updated.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                        type="submit"
                        size="lg"
                        className="h-12 px-8 bg-slate-900 hover:bg-slate-800"
                        disabled={createAdjustment.isPending || items.length === 0}
                    >
                        {createAdjustment.isPending ? 'Saving...' : 'Submit to Approval Queue'}
                    </Button>
                    <Link href="/dashboard/inventory/adjustments">
                        <Button type="button" variant="outline" size="lg" className="h-12 px-8">
                            Discard Draft
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    )
}
