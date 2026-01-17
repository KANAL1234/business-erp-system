'use client'

import { useState } from 'react'
import { useInventoryStock, useLowStock } from '@/lib/queries/inventory'
import { useLocations } from '@/lib/queries/locations'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, AlertTriangle, Package, Warehouse, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useLocation } from '@/components/providers/location-provider'

export default function InventoryPage() {
    return (
        <PermissionGuard permission="inventory.stock.view">
            <InventoryContent />
        </PermissionGuard>
    )
}

function InventoryContent() {
    const [searchQuery, setSearchQuery] = useState('')
    const { allowedLocationIds, currentLocationId } = useLocation()

    const { data: allStock, isLoading } = useInventoryStock()
    const { data: lowStock } = useLowStock()
    const { data: locations } = useLocations()

    // Filter locations by user access
    const allowedLocations = locations?.filter(loc => allowedLocationIds.includes(loc.id))

    // Determine which locations to show based on header selection
    // If currentLocationId is set, show only that location
    // If currentLocationId is empty/null, show all allowed locations
    const locationsToShow = currentLocationId
        ? [currentLocationId]
        : allowedLocationIds

    // Filter stock by header location selection first, then by page filter and search
    const filteredStock = allStock?.filter((stock) => {
        // LBAC: Filter by header location selection
        if (!locationsToShow.includes(stock.location_id)) {
            return false
        }



        const matchesSearch =
            stock.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stock.products.sku.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesSearch
    })

    // Calculate summary stats (only from locations shown based on header selection)
    const allowedStock = allStock?.filter(s => locationsToShow.includes(s.location_id))
    const totalValue = allowedStock?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0
    const totalProducts = new Set(allowedStock?.map(s => s.product_id)).size
    const lowStockCount = lowStock?.filter(s => locationsToShow.includes(s.location_id)).length || 0

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                <p className="text-slate-500 font-medium">Loading inventory...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Inventory Management</h2>
                    <p className="text-slate-500">Track and manage stock across all locations.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Link href="/dashboard/inventory/transfers" className="flex-1 md:flex-none">
                        <Button variant="outline" className="w-full">Stock Transfer</Button>
                    </Link>
                    <Link href="/dashboard/inventory/adjustments" className="flex-1 md:flex-none">
                        <Button variant="outline" className="w-full">Stock Adjustment</Button>
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProducts}</div>
                        <p className="text-xs text-slate-500">Across all locations</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
                        <Warehouse className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{locations?.length || 0}</div>
                        <p className="text-xs text-slate-500">Warehouses & stores</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rs. {totalValue.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">Total stock valuation</p>
                    </CardContent>
                </Card>

                <Card className={`hover:shadow-md transition-shadow ${lowStockCount > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? 'text-red-500' : 'text-slate-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : ''}`}>{lowStockCount}</div>
                        <p className="text-xs text-slate-500">Items needing restock</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="all" className="space-y-4">
                <div className="flex justify-between items-center bg-white p-1 rounded-lg border">
                    <TabsList className="bg-transparent">
                        <TabsTrigger value="all" className="data-[state=active]:bg-slate-100">All Stock</TabsTrigger>
                        <TabsTrigger value="low" className="data-[state=active]:bg-slate-100">Low Stock</TabsTrigger>
                        <TabsTrigger value="by-location" className="data-[state=active]:bg-slate-100">By Location</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="all" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                <div className="flex items-center space-x-2 flex-1 w-full">
                                    <Search className="h-5 w-5 text-slate-400" />
                                    <Input
                                        placeholder="Search product or SKU..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead className="text-right">Available</TableHead>
                                            <TableHead className="text-right">Value (Rs.)</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStock?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                    <p>No inventory records found</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStock?.map((stock) => {
                                                const isLow = stock.quantity_available <= (stock.products?.reorder_point || 0)

                                                return (
                                                    <TableRow key={stock.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <TableCell className="font-medium text-slate-900">
                                                            {stock.products?.name}
                                                        </TableCell>
                                                        <TableCell className="text-slate-600">{stock.products?.sku}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{stock.locations?.name}</span>
                                                                <Badge variant="outline" className="text-[10px] font-normal uppercase py-0 px-1">
                                                                    {stock.locations?.location_types?.name}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            {stock.quantity_available.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right text-slate-600">
                                                            {stock.total_value.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={isLow ? 'destructive' : 'default'} className="rounded-full px-2 py-0.5">
                                                                {isLow ? 'Low Stock' : 'Optimized'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="low" className="space-y-4">
                    <Card className="border-red-100">
                        <CardHeader className="bg-red-50/50 border-b border-red-100">
                            <CardTitle className="text-lg flex items-center gap-2 text-red-900">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Critical Inventory Shortage
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead className="text-right">Available</TableHead>
                                        <TableHead className="text-right">Threshold</TableHead>
                                        <TableHead className="text-right">Shortage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lowStock?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                <p className="font-medium text-green-600">All inventory levels are above thresholds!</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        lowStock?.map((stock) => {
                                            const shortage = (stock.products?.reorder_point || 0) - stock.quantity_available

                                            return (
                                                <TableRow key={stock.id} className="hover:bg-red-50/20 transition-colors">
                                                    <TableCell className="font-medium text-slate-900">
                                                        {stock.products?.name}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{stock.locations?.name}</TableCell>
                                                    <TableCell className="text-right text-red-600 font-bold">
                                                        {stock.quantity_available.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-slate-500">
                                                        {stock.products?.reorder_point}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-red-600">
                                                        {shortage.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="by-location" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allowedLocations
                            ?.filter(loc => locationsToShow.includes(loc.id)) // Filter by header selection
                            .map((location) => {
                                const locationStock = allStock?.filter(s => s.location_id === location.id)
                                const locationValue = locationStock?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0

                                return (
                                    <Card key={location.id} className="hover:ring-2 hover:ring-slate-100 transition-all">
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg">{location.name}</CardTitle>
                                                    <p className="text-sm font-mono text-slate-500">{location.code}</p>
                                                </div>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-900">
                                                    {location.location_types?.name}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex justify-between items-end border-t pt-4">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Inventory Value</p>
                                                    <p className="text-xl font-bold text-slate-900">Rs. {locationValue.toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 mb-1">{locationStock?.length || 0} unique SKUs</p>
                                                    <div className="flex gap-1 justify-end">
                                                        <div className="h-1.5 w-8 rounded-full bg-slate-200"></div>
                                                        <div className="h-1.5 w-8 rounded-full bg-slate-900"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    )
}
