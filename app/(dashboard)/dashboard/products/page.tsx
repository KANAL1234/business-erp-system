'use client'

import { useProducts } from '@/lib/queries/products'
import { useLocation } from '@/components/providers/location-provider'
import { PermissionGuard } from '@/components/permission-guard'
import { ProductsTable } from '@/components/products/products-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ProductsPage() {
    return (
        <PermissionGuard permission="inventory.products.read">
            <ProductsContent />
        </PermissionGuard>
    )
}

function ProductsContent() {
    const { currentLocationId, allowedLocationIds } = useLocation()
    const { data: products, isLoading } = useProducts()
    const [searchQuery, setSearchQuery] = useState('')

    const filteredProducts = (products || []).filter((product: any) => {
        const query = searchQuery.toLowerCase()
        if (!query) return true
        return product.name?.toLowerCase().includes(query) ||
            product.code?.toLowerCase().includes(query) ||
            product.sku?.toLowerCase().includes(query) ||
            product.product_categories?.name?.toLowerCase().includes(query)
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-muted-foreground">
                        {currentLocationId
                            ? 'Showing stock for selected location'
                            : 'Manage your product catalog (showing total stock)'}
                    </p>
                </div>
                <Link href="/dashboard/products/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Product List</CardTitle>
                    <div className="relative w-full sm:w-[250px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <ProductsTable
                        products={filteredProducts}
                        isLoading={isLoading}
                        locationId={currentLocationId}
                        allowedLocationIds={allowedLocationIds}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
