'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProducts } from '@/lib/queries/products'
import { useLocationStock } from '@/lib/queries/inventory'
import { useLocations } from '@/lib/queries/locations'
import { useCustomers, useSearchCustomers } from '@/lib/queries/customers'
import { useCreatePOSSale } from '@/lib/queries/pos-sales'
import { useAuth } from '@/components/providers/auth-provider'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
    Search, ShoppingCart, Trash2, Plus, Minus,
    User, CreditCard, DollarSign, Receipt
} from 'lucide-react'
import type { CartItem } from '@/lib/types/database'
import { QuickAddCustomer } from '@/components/pos/quick-add-customer'
import Link from 'next/link'

export default function POSPage() {
    return (
        <PermissionGuard permission="pos.sales.create">
            <POSContent />
        </PermissionGuard>
    )
}

function POSContent() {
    const router = useRouter()
    const { currentLocationId, currentLocation, loading: locationLoading } = useLocation()

    // State
    const [searchQuery, setSearchQuery] = useState('')
    const [customerSearchQuery, setCustomerSearchQuery] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [cart, setCart] = useState<CartItem[]>([])
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH')
    const [amountPaid, setAmountPaid] = useState('')
    const [discountAmount, setDiscountAmount] = useState('')
    const taxRate = 0.18

    // Queries
    const { data: products } = useProducts()
    const { data: locationStock } = useLocationStock(currentLocationId || '')
    const { data: customerResults } = useSearchCustomers(customerSearchQuery)
    const createSale = useCreatePOSSale()

    // Show loading while location is being determined
    if (locationLoading || !currentLocationId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card className="w-96">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
                        <p className="text-lg font-semibold">Loading POS...</p>
                        <p className="text-sm text-muted-foreground">
                            {locationLoading ? 'Initializing location...' : 'Please select a location from the header.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Filter products by search
    const filteredProducts = products?.filter(product => {
        const query = searchQuery.toLowerCase()
        return (
            product.name.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query) ||
            product.barcode?.toLowerCase().includes(query)
        )
    })

    // Add to cart
    const handleAddToCart = (product: any) => {
        const stock = locationStock?.find(s => s.product_id === product.id)

        if (!stock || stock.quantity_available <= 0) {
            toast.error('Out of Stock', {
                description: `${product.name} is not available at this location`,
            })
            return
        }

        const existingItem = cart.find(item => item.product_id === product.id)

        if (existingItem) {
            // Increase quantity
            if (existingItem.quantity >= stock.quantity_available) {
                toast.error('Insufficient Stock', {
                    description: `Only ${stock.quantity_available} units available`,
                })
                return
            }

            updateCartItemQuantity(product.id, existingItem.quantity + 1)
        } else {
            // Add new item
            const newItem: CartItem = {
                product_id: product.id,
                product: product,
                quantity: 1,
                unit_price: product.selling_price || 0,
                discount_percentage: selectedCustomer?.discount_percentage || 0,
                line_total: (product.selling_price || 0) * (1 - (selectedCustomer?.discount_percentage || 0) / 100),
            }

            setCart([...cart, newItem])
        }

        setSearchQuery('') // Clear search
    }

    // Update cart item quantity
    const updateCartItemQuantity = (productId: string, newQuantity: number) => {
        const stock = locationStock?.find(s => s.product_id === productId)

        if (newQuantity > (stock?.quantity_available || 0)) {
            toast.error('Insufficient Stock', {
                description: `Only ${stock?.quantity_available} units available`,
            })
            return
        }

        if (newQuantity <= 0) {
            removeFromCart(productId)
            return
        }

        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const lineTotal = newQuantity * item.unit_price * (1 - item.discount_percentage / 100)
                return { ...item, quantity: newQuantity, line_total: lineTotal }
            }
            return item
        }))
    }

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product_id !== productId))
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0)
    const discount = Number(discountAmount) || 0
    const taxableAmount = subtotal - discount
    const taxAmount = taxableAmount * taxRate
    const total = taxableAmount + taxAmount
    const paid = Number(amountPaid) || 0
    const change = paid - total

    // Handle checkout
    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error('Empty Cart', {
                description: 'Please add items to cart',
            })
            return
        }

        if (paymentMethod === 'CREDIT' && !selectedCustomer) {
            toast.error('Customer Required', {
                description: 'Please select a customer for credit sales',
            })
            return
        }

        if (paymentMethod === 'CASH' && paid < total) {
            toast.error('Insufficient Payment', {
                description: 'Amount paid is less than total',
            })
            return
        }

        try {
            const sale = await createSale.mutateAsync({
                locationId: currentLocationId,
                customerId: selectedCustomer?.id,
                items: cart,
                paymentMethod,
                amountPaid: paymentMethod === 'CASH' ? paid : 0,
                discountAmount: discount,
            })

            toast.success('Sale Completed', {
                description: `Sale #${sale.sale_number} recorded successfully`,
            })

            // Reset form
            setCart([])
            setSelectedCustomer(null)
            setAmountPaid('')
            setDiscountAmount('')
            setPaymentMethod('CASH')

            // TODO: Print receipt
            // router.push(`/dashboard/pos/receipt/${sale.id}`)
        } catch (error: any) {
            toast.error('Error', {
                description: error.message,
            })
        }
    }

    return (
        <div className="h-screen flex flex-col p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold">Point of Sale</h1>
                    {currentLocation && (
                        <Badge variant="outline" className="text-base">
                            {currentLocation.location_name}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/pos/history">
                        <Button variant="outline">
                            <Receipt className="mr-2 h-4 w-4" />
                            Sales History
                        </Button>
                    </Link>
                    <Link href="/dashboard/pos/closing">
                        <Button variant="outline">
                            Daily Closing
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden">
                {/* Left Panel - Products */}
                <div className="col-span-7 flex flex-col gap-4">
                    {/* Search */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search products by name, SKU, or scan barcode..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                    autoFocus
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Grid */}
                    <Card className="flex-1 overflow-hidden">
                        <CardContent className="h-full overflow-y-auto pt-6">
                            <div className="grid grid-cols-3 gap-4">
                                {filteredProducts?.slice(0, 12).map((product) => {
                                    const stock = locationStock?.find(s => s.product_id === product.id)
                                    const available = stock?.quantity_available || 0

                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => handleAddToCart(product)}
                                            disabled={available <= 0}
                                            className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="font-semibold text-sm mb-1">{product.name}</div>
                                            <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold">
                                                    Rs. {product.selling_price?.toLocaleString()}
                                                </span>
                                                <Badge variant={available > 0 ? 'default' : 'destructive'}>
                                                    {available}
                                                </Badge>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            {searchQuery && filteredProducts?.length === 0 && (
                                <div className="text-center text-gray-500 mt-8">
                                    No products found
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel - Cart & Checkout */}
                <div className="col-span-5 flex flex-col gap-4">
                    {/* Customer Selection */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Customer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedCustomer ? (
                                <div className="flex items-center justify-between p-2 bg-primary/5 rounded">
                                    <div>
                                        <div className="font-semibold">{selectedCustomer.name}</div>
                                        <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
                                        {selectedCustomer.current_balance > 0 && (
                                            <div className="text-sm text-red-600">
                                                Balance: Rs. {selectedCustomer.current_balance.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedCustomer(null)}
                                    >
                                        ✕
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search customer..."
                                            value={customerSearchQuery}
                                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                        {customerResults && customerResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {customerResults.map((customer) => (
                                                    <button
                                                        key={customer.id}
                                                        onClick={() => {
                                                            setSelectedCustomer(customer)
                                                            setCustomerSearchQuery('')
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                                                    >
                                                        <div className="font-semibold">{customer.name}</div>
                                                        <div className="text-sm text-gray-600">{customer.phone}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <QuickAddCustomer
                                        onCustomerCreated={(customer) => setSelectedCustomer(customer)}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cart */}
                    <Card className="flex-1 overflow-hidden flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Cart ({cart.length} items)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto">
                            {cart.length === 0 ? (
                                <div className="text-center text-gray-400 mt-8">
                                    Cart is empty
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {cart.map((item) => (
                                        <div key={item.product_id} className="p-3 border rounded-lg">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm">
                                                        {item.product.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Rs. {item.unit_price.toLocaleString()} × {item.quantity}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFromCart(item.product_id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateCartItemQuantity(item.product_id, item.quantity - 1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-12 text-center font-semibold">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => updateCartItemQuantity(item.product_id, item.quantity + 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className="font-bold">
                                                    Rs. {item.line_total.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Totals & Payment */}
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            {/* Totals */}
                            <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal:</span>
                                <span>Rs. {subtotal.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm">Discount:</span>
                                <Input
                                    type="number"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(e.target.value)}
                                    className="w-32 text-right"
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex justify-between text-sm">
                                <span>Tax (18%):</span>
                                <span>Rs. {taxAmount.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                <span>Total:</span>
                                <span>Rs. {total.toLocaleString()}</span>
                            </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2">
                                <Label>Payment Method</Label>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={(value: any) => setPaymentMethod(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CASH">
                                            <div className="flex items-center">
                                                <DollarSign className="mr-2 h-4 w-4" />
                                                Cash
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="CREDIT" disabled={!selectedCustomer}>
                                            <div className="flex items-center">
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Credit {!selectedCustomer && '(Select customer)'}
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Cash Payment */}
                            {paymentMethod === 'CASH' && (
                                <div className="space-y-2">
                                    <Label>Amount Paid</Label>
                                    <Input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder="0"
                                        className="text-lg text-right"
                                    />
                                    {paid > 0 && (
                                        <div className="flex justify-between text-lg font-semibold">
                                            <span>Change:</span>
                                            <span className={change < 0 ? 'text-red-600' : 'text-green-600'}>
                                                Rs. {Math.abs(change).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Checkout Button */}
                            <Button
                                onClick={handleCheckout}
                                disabled={cart.length === 0 || createSale.isPending}
                                className="w-full h-14 text-lg"
                                size="lg"
                            >
                                {createSale.isPending ? 'Processing...' : 'Complete Sale'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    )
}
