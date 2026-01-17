'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Minus, Search, ShoppingBag, Truck, Package, X, Navigation, AlertTriangle } from 'lucide-react'
import { addToQueue } from '@/lib/offline/queue'
import { useOnlineStatus } from '@/lib/offline/sync'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/components/providers/auth-provider'
import { emitSoftRefresh } from '@/lib/soft-refresh'
import Link from 'next/link'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function MobilePOSPage() {
    const supabase = createClient()
    const isOnline = useOnlineStatus()
    const { user } = useAuth()
    const [search, setSearch] = useState('')
    const [cart, setCart] = useState<any[]>([])
    const [locationId, setLocationId] = useState<string | null>(null)
    const [vehicleInfo, setVehicleInfo] = useState<string>('')
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
    const [amountPaid, setAmountPaid] = useState('')
    const [customerId, setCustomerId] = useState<string | null>(null)

    // Fetch customers for the checkout dropdown
    const { data: customers } = useQuery({
        queryKey: ['pos-customers'],
        queryFn: async () => {
            const { data } = await supabase
                .from('customers')
                .select('id, name')
                .eq('is_active', true)
                .order('name')
            return data || []
        }
    })

    // Check for active trip
    const { data: activeTrip, isLoading: tripLoading } = useQuery({
        queryKey: ['active-trip', user?.id],
        queryFn: async () => {
            if (!user?.id) return null

            // First get the driver ID from employee
            const { data: driver } = await supabase
                .from('fleet_drivers')
                .select('id')
                .eq('employee_id', user.id)
                .maybeSingle()

            if (!driver) return null

            // Check for active trip
            const { data: trip } = await supabase
                .from('fleet_trips')
                .select('id, status, start_time')
                .eq('driver_id', driver.id)
                .eq('status', 'IN_PROGRESS')
                .maybeSingle()

            return trip
        },
        enabled: !!user?.id,
        refetchInterval: 10000 // Check every 10 seconds
    })

    // Also check localStorage for trip in progress (for offline support)
    const [localTripActive, setLocalTripActive] = useState(false)
    useEffect(() => {
        const savedTripId = localStorage.getItem('current_trip_id')
        setLocalTripActive(!!savedTripId)
    }, [])

    const hasActiveTrip = activeTrip || localTripActive

    useEffect(() => {
        const match = document.cookie.match(/driver_vehicle_id=([^;]+)/)
        if (match) {
            const id = match[1]
            setLocationId(id)
            // Fetch vehicle name
            supabase.from('locations').select('name').eq('id', id).single().then(({ data }) => {
                if (data) setVehicleInfo(data.name)
            })
        }
    }, [])

    // Load ONLY vehicle inventory (products with stock > 0)
    const { data: productsWithStock, isLoading } = useQuery({
        queryKey: ['pos-vehicle-stock', locationId, search],
        queryFn: async () => {
            if (!locationId) return []

            const { data, error } = await supabase
                .from('inventory_stock')
                .select('quantity_on_hand, products!inner(*)')
                .eq('location_id', locationId)
                .gt('quantity_on_hand', 0)
                .ilike('products.name', `%${search}%`)
                .order('quantity_on_hand', { ascending: false })

            if (error) {
                console.error(error)
                return []
            }

            return data?.map((item: any) => ({
                ...item.products,
                quantity_on_hand: item.quantity_on_hand
            })) || []
        },
        enabled: !!locationId
    })

    const addToCart = (product: any) => {
        const quantityAvailable = product.quantity_on_hand
        const existing = cart.find(c => c.id === product.id)

        if (existing) {
            if (existing.quantity >= quantityAvailable) {
                toast.error(`Max stock reached (${quantityAvailable})`)
                return
            }
            setCart(cart.map(c =>
                c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
            ))
        } else {
            setCart([...cart, { ...product, quantity: 1, maxQuantity: quantityAvailable }])
            toast.success(`${product.name} added`, { duration: 1000 })
        }
    }

    const updateQuantity = (productId: string, change: number) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + change
                if (item.maxQuantity && newQty > item.maxQuantity) {
                    toast.error(`Max stock available is ${item.maxQuantity}`)
                    return item
                }
                return { ...item, quantity: newQty }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + ((item.selling_price || 0) * item.quantity), 0)
    }
    const taxRate = 0.18

    const handleCompleteSale = async () => {
        if (!locationId) {
            toast.error('No vehicle selected')
            return
        }
        if (cart.length === 0) {
            toast.error('Cart is empty')
            return
        }

        const subtotal = calculateTotal()
        const taxAmount = subtotal * taxRate
        const total = subtotal + taxAmount
        const paid = parseFloat(amountPaid) || 0

        if (paid < total) {
            toast.error('Payment amount is less than total')
            return
        }

        const saleData = {
            location_id: locationId,
            customer_id: customerId || null,
            total_amount: total,
            subtotal: subtotal,
            tax_amount: taxAmount,
            discount_amount: 0,
            amount_paid: paid,
            payment_method: 'CASH',
            sale_date: new Date().toISOString(),
        }

        const tripId = activeTrip?.id || localStorage.getItem('current_trip_id')

        if (isOnline) {
            const saleNumber = `INV-POS-MOBILE-${Date.now()}`
            const { data: sale, error: saleError } = await supabase.from('pos_sales').insert({
                ...saleData,
                sale_number: saleNumber,
                is_synced: true,
                trip_id: tripId
            }).select('id').single()

            if (saleError) {
                console.error('POS Error:', saleError)
                toast.error('Failed to save sale: ' + saleError.message)
                return
            }

            // Insert sale items and update stock (stock is already handled by queue, but since we are online we should probably do it here or let the queue handle it - but usually online direct insert should handle stock too for immediate consistency)
            if (sale && cart.length > 0) {
                const saleItems = cart.map(item => ({
                    sale_id: sale.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.selling_price || 0,
                    discount_percentage: 0
                }))

                const { error: itemsError } = await supabase
                    .from('pos_sale_items')
                    .insert(saleItems)

                if (itemsError) {
                    console.error('Failed to save sale items:', itemsError)
                }

                // Immediate stock reduction for online sales
                for (const item of cart) {
                    await supabase.rpc('adjust_inventory_stock', {
                        p_product_id: item.id,
                        p_location_id: locationId,
                        p_quantity_change: -item.quantity
                    })
                }
            }

            toast.success('Sale completed successfully!')
            emitSoftRefresh()
        } else {
            await addToQueue('CREATE_POS_SALE', {
                ...saleData,
                items: cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.selling_price || 0,
                    total_amount: (item.selling_price || 0) * item.quantity
                })),
                sale_number: `INV-POS-MOBILE-${Date.now()}`,
                is_synced: false,
                trip_id: tripId
            })
            toast.success('Sale saved offline. Syncing soon.')
            emitSoftRefresh()
        }

        setCart([])
        setIsCheckoutOpen(false)
        setAmountPaid('')
        setCustomerId('')
    }

    const subtotal = calculateTotal()
    const taxAmount = subtotal * taxRate
    const totalWithTax = subtotal + taxAmount
    const change = (parseFloat(amountPaid) || 0) - totalWithTax

    // Show loading state while checking trip
    if (tripLoading) {
        return (
            <div className="flex flex-col h-screen bg-slate-50 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-slate-500 text-sm mt-3">Checking trip status...</p>
            </div>
        )
    }

    // Block sales if no active trip
    if (!hasActiveTrip) {
        return (
            <div className="flex flex-col h-screen bg-slate-50">
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-12 h-12 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">
                        Start a Trip First
                    </h1>
                    <p className="text-slate-500 text-center mb-8 max-w-xs">
                        You need to start a trip before you can make sales. This helps track your deliveries and inventory.
                    </p>
                    <Link href="/mobile/trip">
                        <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-blue-200">
                            <Navigation className="w-5 h-5 mr-2" />
                            Start Trip Now
                        </Button>
                    </Link>
                    <p className="text-xs text-slate-400 mt-6 text-center">
                        Once your trip is active, you can return here to make sales
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header Area */}
            <div className="bg-white border-b shadow-sm sticky top-0 z-20">
                <div className="px-4 pt-4 pb-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Vehicle</p>
                            <p className="text-sm font-bold text-slate-800 leading-tight">
                                {vehicleInfo || 'Loading vehicle...'}
                            </p>
                        </div>
                    </div>
                    {!isOnline && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Offline Mode</Badge>
                    )}
                </div>

                <div className="px-4 pb-4 mt-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-primary" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search in vehicle inventory..."
                            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all rounded-xl h-11"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <ScrollArea className="flex-1 px-4 py-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-slate-500 text-sm">Loading inventory...</p>
                    </div>
                ) : !locationId ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <Truck className="w-16 h-16 opacity-20" />
                        <p>No Vehicle Selected</p>
                        <Button variant="outline" onClick={() => window.location.href = '/mobile/select-vehicle'}>
                            Go to Selection
                        </Button>
                    </div>
                ) : productsWithStock?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                        <Package className="w-16 h-16 opacity-20" />
                        <p className="text-center font-medium">
                            {search ? `No results for "${search}"` : "This vehicle is empty"}
                        </p>
                        <p className="text-sm text-slate-400 -mt-3">Stock items will appear here after transfer</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pb-32">
                        {productsWithStock?.map((product: any) => (
                            <Card
                                key={product.id}
                                className="p-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow group border-slate-200"
                                onClick={() => addToCart(product)}
                            >
                                <div className="flex h-24">
                                    <div className="w-24 bg-slate-100 flex items-center justify-center group-active:scale-95 transition-transform">
                                        <Package className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <div className="flex-1 p-3 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800 line-clamp-1 leading-tight">{product.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase mb-1">SKU: {product.sku || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-black text-primary">PKR {product.selling_price?.toLocaleString() || '0'}</p>
                                            <div className="flex items-center gap-1.5">
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[10px] px-1.5 py-0 font-bold ${product.quantity_on_hand <= 5
                                                        ? "bg-rose-50 text-rose-600 border-rose-100"
                                                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        }`}
                                                >
                                                    {product.quantity_on_hand} in stock
                                                </Badge>
                                                <div className="p-1 bg-primary text-white rounded-md shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Premium Cart Bottom Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-16 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 z-30 pb-safe shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
                    <ScrollArea className="max-h-[40vh]">
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-primary" />
                                    Items in Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
                                </h3>
                                <button
                                    onClick={() => setCart([])}
                                    className="text-[10px] font-bold text-rose-500 uppercase tracking-wider hover:text-rose-600 transition-colors"
                                >
                                    Clear Cart
                                </button>
                            </div>

                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex items-start justify-between bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                        <div className="flex-1 pr-4">
                                            <p className="font-bold text-xs text-slate-800 line-clamp-1">{item.name}</p>
                                            <p className="text-[10px] font-black text-primary mt-0.5">Rs. {item.selling_price?.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="p-1.5 hover:bg-slate-50 text-slate-500 transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="p-1.5 hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-30"
                                                disabled={item.maxQuantity && item.quantity >= item.maxQuantity}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-4 pt-0">
                        <Separator className="mb-4 bg-slate-100" />
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated Total</p>
                            <p className="text-2xl font-black text-slate-900 leading-none mt-1 uppercase">
                                    <span className="text-sm font-bold mr-1">Rs.</span>
                                    {totalWithTax.toLocaleString()}
                            </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setAmountPaid(totalWithTax.toString())
                                    setIsCheckoutOpen(true)
                                }}
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-blue-200 active:scale-95 transition-all px-8 h-12 rounded-xl"
                            >
                                Checkout
                                <ShoppingBag className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Sale</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Select Customer (Optional)</Label>
                            <Select value={customerId || undefined} onValueChange={setCustomerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose customer..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers?.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                            <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-slate-900">Rs. {subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Tax (18%)</span>
                                    <span className="font-bold text-slate-900">Rs. {taxAmount.toLocaleString()}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs uppercase font-bold text-slate-400">Amount Received</Label>
                                    <Input
                                        type="number"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder="Enter amount..."
                                        className="text-2xl h-14 font-bold text-primary focus:ring-primary/40"
                                        autoFocus
                                    />
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Change Due</span>
                                    <span className={`text-2xl font-black ${change < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                    Rs. {change > 0 ? change.toLocaleString() : '0'}
                                    </span>
                                </div>
                            </div>
                    </div>
                    <DialogFooter className="sm:justify-start gap-2">
                        <Button
                            className="flex-1 h-12 text-lg font-bold"
                            disabled={change < 0 || !amountPaid}
                            onClick={handleCompleteSale}
                        >
                            Complete Sale
                        </Button>
                        <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="h-12">
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
