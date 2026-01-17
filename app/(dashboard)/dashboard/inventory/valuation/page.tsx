"use client"

import { useState } from 'react'
import { useInventoryValuation, useCostLayers } from '@/lib/queries/cost-layers'
import { DataTable } from '@/components/ui/data-table'
import { useLocation } from '@/components/providers/location-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { Download, RefreshCw, DollarSign, Package, BarChart3 } from 'lucide-react'
import { PermissionGuard } from '@/components/permission-guard'

export default function InventoryValuationPage() {
    return (
        <PermissionGuard permission="inventory.reports.view">
            <InventoryValuationContent />
        </PermissionGuard>
    )
}

function InventoryValuationContent() {
    const { currentLocationId } = useLocation()

    // Convert empty string (All Locations) or null to undefined for the query
    const locationFilter = (!currentLocationId || currentLocationId === '') ? undefined : currentLocationId

    const { data: valuation, isLoading: valuationLoading, refetch: refetchValuation } = useInventoryValuation(
        locationFilter
    )
    const { data: costLayers, isLoading: layersLoading, refetch: refetchLayers } = useCostLayers(
        undefined,
        locationFilter
    )
    const [activeTab, setActiveTab] = useState('valuation')

    // Calculate summary metrics
    const totalValue = valuation?.reduce((sum: number, item: any) => sum + (Number(item.total_value) || 0), 0) || 0
    const totalItems = valuation?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0
    const activeProducts = valuation?.length || 0

    const handleRefresh = () => {
        if (activeTab === 'valuation') {
            refetchValuation()
        } else {
            refetchLayers()
        }
    }

    const handleExport = () => {
        const data = activeTab === 'valuation' ? valuation : costLayers
        if (!data) return

        const csvContent = "data:text/csv;charset=utf-8,"
            + Object.keys(data[0] || {}).join(",") + "\n"
            + data.map((row: any) => Object.values(row).join(",")).join("\n")

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `inventory_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Valuation</h1>
                    <p className="text-muted-foreground">
                        View total inventory value, cost layers, and valuation reports
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                        <p className="text-xs text-muted-foreground">
                            Across {activeProducts} active products
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Units in stock
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valuation Method</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">AVCO / FIFO</div>
                        <p className="text-xs text-muted-foreground">
                            Based on product category settings
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="valuation" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="valuation">Valuation Report</TabsTrigger>
                    <TabsTrigger value="layers">Cost Layers</TabsTrigger>
                </TabsList>
                <TabsContent value="valuation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Valuation</CardTitle>
                            <CardDescription>
                                Detailed valuation by product and location
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {valuationLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                </div>
                            ) : (
                                <DataTable
                                    columns={[
                                        { accessorKey: 'product_code', header: 'SKU' },
                                        { accessorKey: 'product_name', header: 'Product' },
                                        { accessorKey: 'location_name', header: 'Location' },
                                        { accessorKey: 'quantity', header: 'Qty', cell: ({ row }: any) => Number(row.original.quantity).toLocaleString() },
                                        { accessorKey: 'average_cost', header: 'Avg Cost', cell: ({ row }: any) => formatCurrency(row.original.average_cost) },
                                        { accessorKey: 'total_value', header: 'Total Value', cell: ({ row }: any) => formatCurrency(row.original.total_value) },
                                        { accessorKey: 'costing_method', header: 'Method' },
                                    ]}
                                    data={valuation || []}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="layers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cost Layers</CardTitle>
                            <CardDescription>
                                Track individual cost layers for FIFO valuation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {layersLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                </div>
                            ) : (
                                <DataTable
                                    columns={[
                                        { accessorKey: 'layer_date', header: 'Date', cell: ({ row }: any) => format(new Date(row.original.layer_date), 'MMM d, yyyy') },
                                        { accessorKey: 'product_name', header: 'Product' },
                                        { accessorKey: 'location_name', header: 'Location' },
                                        { accessorKey: 'reference_number', header: 'Ref' },
                                        { accessorKey: 'unit_cost', header: 'Unit Cost', cell: ({ row }: any) => formatCurrency(row.original.unit_cost) },
                                        { accessorKey: 'remaining_qty', header: 'Remaining', cell: ({ row }: any) => Number(row.original.remaining_qty).toLocaleString() },
                                        { accessorKey: 'layer_value', header: 'Value', cell: ({ row }: any) => formatCurrency(row.original.layer_value) },
                                    ]}
                                    data={costLayers || []}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
