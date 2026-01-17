'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Search, Package, MapPin } from 'lucide-react'

export default function MobileInventoryPage() {
    const supabase = createClient()
    const [search, setSearch] = useState('')
    const [locationId, setLocationId] = useState<string | null>(null)

    useEffect(() => {
        const match = document.cookie.match(/driver_vehicle_id=([^;]+)/)
        if (match) setLocationId(match[1])
    }, [])

    const { data: stockItems, isLoading } = useQuery({
        queryKey: ['mobile-inventory', search, locationId],
        queryFn: async () => {
            if (!locationId) return []
            // 1. First find products matching search if any
            let productIds: string[] | null = null

            if (search) {
                const { data: products } = await supabase
                    .from('products')
                    .select('id')
                    .ilike('name', `%${search}%`)
                    .limit(20)

                if (products) {
                    productIds = products.map(p => p.id)
                }
            }

            // 2. Then get stock
            let query = supabase
                .from('inventory_stock')
                .select(`
          *,
          products (name, sku),
          locations (name)
        `)
                .order('quantity_available', { ascending: false })
                .limit(50)

            if (productIds !== null) {
                if (productIds.length === 0) return []
                query = query.in('product_id', productIds)
            } else {
                query = query.gt('quantity_available', 0)
            }

            // Filter by vehicle
            if (locationId) {
                query = query.eq('location_id', locationId)
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        }
    })

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <div className="p-4 bg-white border-b sticky top-0 z-10">
                <h1 className="text-xl font-bold mb-4">Inventory View</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by product name..."
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading inventory...</div>
                ) : stockItems?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No items found</div>
                ) : (
                    stockItems?.map((item: any) => (
                        <Card key={item.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-medium">{item.products?.name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">SKU: {item.products?.sku}</p>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {item.locations?.name}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-bold text-primary">
                                        {item.quantity_available}
                                    </span>
                                    <span className="text-xs text-gray-500">Available</span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
