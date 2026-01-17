'use client'

import { useEffect, useState } from 'react'
import { PermissionGuard } from '@/components/permission-guard'
import { createClient } from '@/lib/supabase/client'
import { useLocation } from '@/components/providers/location-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    Package,
    Users,
    MapPin,
    TrendingUp,
    ShoppingCart,
    Truck,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Clock,
    Calculator,
    BarChart3,
    Lock,
    Wrench,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
    return (
        <PermissionGuard
            permission="dashboard.overview.view"
            fallback={
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome to Business-ERP-Software</h2>
                    <p className="mt-2 text-slate-600">Please select a module from the sidebar to get started.</p>
                </div>
            }
        >
            <DashboardContent />
        </PermissionGuard>
    )
}

function DashboardContent() {
    const { allowedLocationIds, currentLocationId } = useLocation()
    const { hasPermission } = useAuth()
    const [metrics, setMetrics] = useState<any>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (allowedLocationIds.length === 0) {
            setMetrics({})
            setLoading(false)
            return
        }
        loadDashboardData()
    }, [allowedLocationIds, currentLocationId])

    const loadDashboardData = async () => {
        const supabase = createClient()

        // Determine which locations to query
        const locationsToQuery = currentLocationId ? [currentLocationId] : allowedLocationIds

        // Get current date for filtering
        const today = new Date().toISOString().split('T')[0]
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        const weekFromNow = new Date()
        weekFromNow.setDate(weekFromNow.getDate() + 7)

        // Run ALL queries in parallel using Promise.all for much faster loading
        try {
            const [
                // Inventory metrics
                productCountResult,
                stockDataResult,
                // Sales metrics
                customerCountResult,
                todaySalesResult,
                monthSalesResult,
                pendingOrdersResult,
                // Purchase metrics
                vendorCountResult,
                pendingPOResult,
                approvedPOResult,
                // Accounting metrics
                bankAccountsResult,
                unpaidInvoicesResult,
                // Analytics
                creditRiskResult,
                topProductsResult,
                // HR metrics
                activeEmployeeResult,
                todayAttendanceResult,
                pendingLeavesResult,
                // Fleet metrics
                vehicleCountResult,
                activeDriverResult,
                activeTripResult,
                maintenanceCountResult,
                fuelLogsResult,
                maintenanceLogsResult,
                totalTripResult,
                // Location info
                userLocationsResult
            ] = await Promise.all([
                // Inventory
                supabase.from('products').select('*', { count: 'exact', head: true }),
                supabase.from('inventory_stock').select('quantity_on_hand, location_id, products(cost_price)').in('location_id', locationsToQuery),
                // Sales
                supabase.from('customers').select('*', { count: 'exact', head: true }),
                supabase.from('pos_sales').select('total_amount, location_id').gte('sale_date', today).in('location_id', locationsToQuery),
                supabase.from('pos_sales').select('total_amount, location_id').gte('sale_date', firstDayOfMonth).in('location_id', locationsToQuery),
                supabase.from('sales_orders').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'processing']).in('location_id', locationsToQuery),
                // Purchase
                supabase.from('vendors').select('*', { count: 'exact', head: true }),
                supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['DRAFT', 'PENDING_APPROVAL']).in('location_id', locationsToQuery),
                supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'APPROVED').in('location_id', locationsToQuery),
                // Accounting
                supabase.from('bank_accounts').select('current_balance'),
                supabase.from('customer_invoices_accounting')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['approved', 'posted'])
                    .in('payment_status', ['unpaid', 'partial', 'overdue']),
                // Analytics
                supabase.rpc('get_customers_near_credit_limit', { p_threshold_pct: 70 }),
                supabase.rpc('get_sales_by_product', { p_date_from: firstDayOfMonth, p_date_to: today, p_limit: 20 }),
                // HR
                supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'ACTIVE'),
                supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('attendance_date', today).eq('status', 'PRESENT').in('location_id', locationsToQuery),
                supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
                // Fleet
                supabase.from('fleet_vehicles').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
                supabase.from('fleet_drivers').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
                supabase.from('fleet_trips').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS'),
                supabase.from('fleet_maintenance').select('*', { count: 'exact', head: true }).lte('next_service_due_date', weekFromNow.toISOString().split('T')[0]),
                supabase.from('fleet_fuel_logs').select('total_cost'),
                supabase.from('fleet_maintenance').select('cost'),
                supabase.from('fleet_trips').select('*', { count: 'exact', head: true }),
                // Locations
                supabase.from('locations').select('id, name, code').in('id', allowedLocationIds)
            ])

            const errors = [
                productCountResult.error,
                stockDataResult.error,
                customerCountResult.error,
                todaySalesResult.error,
                monthSalesResult.error,
                pendingOrdersResult.error,
                vendorCountResult.error,
                pendingPOResult.error,
                approvedPOResult.error,
                bankAccountsResult.error,
                unpaidInvoicesResult.error,
                creditRiskResult.error,
                topProductsResult.error,
                activeEmployeeResult.error,
                todayAttendanceResult.error,
                pendingLeavesResult.error,
                vehicleCountResult.error,
                activeDriverResult.error,
                activeTripResult.error,
                maintenanceCountResult.error,
                fuelLogsResult.error,
                maintenanceLogsResult.error,
                totalTripResult.error,
                userLocationsResult.error
            ].filter(Boolean)

            if (errors.length > 0) {
                console.error('Dashboard query errors:', errors)
                toast.error('Some dashboard metrics failed to load.')
            }

            // Extract results
            const { count: productCount } = productCountResult
            const { data: stockData } = stockDataResult
            const lowStockCount = stockData?.filter(s => s.quantity_on_hand < 10).length || 0
            const inventoryValue = stockData?.reduce((sum, item: any) => {
                return sum + (item.quantity_on_hand * (item.products?.cost_price || 0))
            }, 0) || 0

            const { count: customerCount } = customerCountResult
            const { data: todaySales } = todaySalesResult
            const todaySalesTotal = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
            const { data: monthSales } = monthSalesResult
            const monthSalesTotal = monthSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0
            const { count: pendingOrdersCount } = pendingOrdersResult

            const { count: vendorCount } = vendorCountResult
            const { count: pendingPOCount } = pendingPOResult
            const { count: approvedPOCount } = approvedPOResult

            const { data: bankAccounts } = bankAccountsResult
            const totalBankBalance = bankAccounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0
            const { count: unpaidInvoicesCount } = unpaidInvoicesResult

            const { data: creditRiskData } = creditRiskResult
            const { data: topProducts } = topProductsResult

            const { count: activeEmployeeCount } = activeEmployeeResult
            const { count: todayAttendanceCount } = todayAttendanceResult
            const { count: pendingLeavesCount } = pendingLeavesResult

            const { count: vehicleCount } = vehicleCountResult
            const { count: activeDriverCount } = activeDriverResult
            const { count: activeTripCount } = activeTripResult
            const { count: maintenanceCount } = maintenanceCountResult

            const { data: fuelLogs } = fuelLogsResult
            const { data: maintenanceLogs } = maintenanceLogsResult
            const { count: totalTripCount } = totalTripResult

            const fuelTotal = fuelLogs?.reduce((sum, log) => sum + (Number(log.total_cost) || 0), 0) || 0
            const maintenanceTotal = maintenanceLogs?.reduce((sum, log) => sum + (Number(log.cost) || 0), 0) || 0
            const fleetExpenses = fuelTotal + maintenanceTotal

            const displayProducts = (topProducts || [])
                .sort((a: any, b: any) => b.total_sales - a.total_sales)
                .slice(0, 5)

            const { data: userLocations } = userLocationsResult

            setMetrics({
                productCount,
                lowStockCount,
                inventoryValue,
                customerCount,
                todaySalesTotal,
                todaySalesCount: todaySales?.length || 0,
                monthSalesTotal,
                monthSalesCount: monthSales?.length || 0,
                pendingOrdersCount,
                vendorCount,
                pendingPOCount,
                approvedPOCount,
                totalBankBalance,
                bankAccountsCount: bankAccounts?.length || 0,
                unpaidInvoicesCount,
                creditRiskData,
                displayProducts,
                userLocations,
                locationsCount: userLocations?.length || 0,
                activeEmployeeCount: activeEmployeeCount || 0,
                todayAttendanceCount: todayAttendanceCount || 0,
                pendingLeavesCount: pendingLeavesCount || 0,
                vehicleCount: vehicleCount || 0,
                activeDriverCount: activeDriverCount || 0,
                activeTripCount: activeTripCount || 0,
                maintenanceCount: maintenanceCount || 0,
                totalTripCount: totalTripCount || 0,
                fleetExpenses: fleetExpenses || 0
            })
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
            toast.error('Failed to load dashboard data.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <DashboardLoading />
    }

    const locationContext = currentLocationId
        ? metrics.userLocations?.find((l: any) => l.id === currentLocationId)?.name
        : `All ${metrics.locationsCount} Locations`

    return (
        <div className="space-y-6">
            {/* Header with Location Context */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Dashboard Overview</h2>
                    <p className="text-slate-600 mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Showing data for: <span className="font-semibold text-primary">{locationContext}</span>
                    </p>
                </div>
                <Link href="/dashboard/accounting/reports/financial">
                    <Badge variant="outline" className="gap-2 px-4 py-2 cursor-pointer hover:bg-primary/5">
                        <BarChart3 className="h-4 w-4" />
                        Financial Reports
                    </Badge>
                </Link>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Today's Sales */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">PKR {metrics.todaySalesTotal?.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">{metrics.todaySalesCount} transactions</p>
                    </CardContent>
                </Card>

                {/* Month's Sales */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">PKR {metrics.monthSalesTotal?.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">{metrics.monthSalesCount} sales</p>
                    </CardContent>
                </Card>

                {/* Inventory Value */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                        <Package className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">PKR {metrics.inventoryValue?.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">{metrics.productCount || 0} products</p>
                    </CardContent>
                </Card>

                {/* Bank Balance */}
                <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                        <Calculator className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">PKR {metrics.totalBankBalance?.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">{metrics.bankAccountsCount} accounts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Customers</CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.customerCount || 0}</div>
                        <p className="text-xs text-slate-500">Registered</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendors</CardTitle>
                        <Truck className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.vendorCount || 0}</div>
                        <p className="text-xs text-slate-500">Suppliers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{metrics.activeEmployeeCount}</div>
                        <p className="text-xs text-slate-500">Staff members</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                        <Clock className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{metrics.todayAttendanceCount}</div>
                        <p className="text-xs text-slate-500">Present today</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.lowStockCount || 0}</div>
                        <p className="text-xs text-slate-500">Need reorder</p>
                    </CardContent>
                </Card>
            </div>

            {/* Fleet Operations Section */}
            {hasPermission('fleet:overview:view') && (
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Truck className="h-5 w-5 text-slate-500" />
                            <h3 className="text-lg font-semibold text-slate-900">Fleet & Mobile Stores</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Link href="/dashboard/fleet/vehicles">
                                <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-slate-400">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
                                        <Truck className="h-4 w-4 text-slate-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{metrics.vehicleCount}</div>
                                        <p className="text-xs text-slate-500 mt-1">Mobile units on road</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/fleet/drivers">
                                <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-green-400">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Available Drivers</CardTitle>
                                        <Users className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{metrics.activeDriverCount}</div>
                                        <p className="text-xs text-slate-500 mt-1">Fully qualified staff</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/fleet/trips">
                                <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-blue-400">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
                                        <div className="relative">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            {metrics.activeTripCount > 0 && <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{metrics.activeTripCount}</div>
                                        <p className="text-xs text-slate-500 mt-1">Real-time tracking</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/fleet/maintenance">
                                <Card className="hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-orange-400 flex flex-col justify-between">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Fleet Health</CardTitle>
                                        <CheckCircle className={`h-4 w-4 ${metrics.maintenanceCount > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{metrics.maintenanceCount}</div>
                                        <p className={`text-xs mt-1 ${metrics.maintenanceCount > 0 ? 'text-orange-600 font-medium' : 'text-slate-500'}`}>
                                            {metrics.maintenanceCount > 0 ? 'Service(s) upcoming' : 'All clear'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>

                    {/* Fleet Analytics Extension */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Card className="bg-slate-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-slate-500" />
                                    Fleet Operational Stats
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total Expenses</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-medium text-slate-500">PKR</span>
                                        <span className="text-xl font-bold text-slate-900">{metrics.fleetExpenses?.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Historical Trips</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-slate-900">{metrics.totalTripCount}</span>
                                        <span className="text-sm font-medium text-slate-500">delivered</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-slate-500" />
                                    Fleet Health & Utility
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {metrics.maintenanceCount > 0 ? (
                                    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-100/50 p-2 rounded border border-orange-200">
                                        <AlertTriangle className="h-3 w-3" />
                                        {metrics.maintenanceCount} vehicle(s) require service attention.
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100/50 p-2 rounded border border-green-200">
                                        <CheckCircle2 className="h-3 w-3" />
                                        All vehicles are healthy and serviced.
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 p-2 rounded border border-primary/20">
                                    <TrendingUp className="h-3 w-3" />
                                    Current utilization: {Math.round((metrics.activeTripCount / (metrics.vehicleCount || 1)) * 100)}% of mobile stores.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Credit Risk Monitor */}
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            Credit Risk Monitor
                        </CardTitle>
                        <CardDescription>Customers exceeding 70% credit utilization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {metrics.creditRiskData && metrics.creditRiskData.length > 0 ? (
                            metrics.creditRiskData.map((risk: any) => (
                                <div key={risk.customer_id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-semibold text-slate-900">{risk.customer_name}</p>
                                            <Badge variant="destructive" className="bg-red-600">
                                                {Math.round(risk.utilization_pct)}% Limit
                                            </Badge>
                                        </div>
                                        <div className="w-full bg-red-200 rounded-full h-1.5 mb-1">
                                            <div
                                                className="bg-red-600 h-1.5 rounded-full"
                                                style={{ width: `${Math.min(risk.utilization_pct, 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[11px] text-red-700">
                                            <span>Used: PKR {risk.current_balance.toLocaleString()}</span>
                                            <span>Limit: PKR {risk.credit_limit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-slate-500 italic border rounded-lg border-dashed">
                                No customers currently in high-risk credit zone
                            </div>
                        )}
                        <Link href="/dashboard/customers" className="block text-center text-xs text-primary hover:underline mt-2">
                            Manage All Customers
                        </Link>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Top Performing Products
                        </CardTitle>
                        <CardDescription>Highest revenue generators this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metrics.displayProducts?.length > 0 ? (
                                metrics.displayProducts.map((p: any, i: number) => (
                                    <div key={p.product_id} className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs shrink-0">
                                            #{i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-medium text-slate-900 truncate">{p.product_name}</p>
                                                <span className="text-sm font-bold text-slate-900">PKR {p.total_sales.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-500">
                                                <span>{p.total_quantity} units sold</span>
                                                <span className="text-primary font-medium">{p.transaction_count} sales</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-500 italic border rounded-lg border-dashed">
                                    No sales data available for this month
                                </div>
                            )}
                        </div>
                        <Link href="/dashboard/accounting/reports/registers" className="block text-center text-xs text-primary hover:underline mt-6">
                            View Full Transaction Register
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Operational Alerts & Quick Actions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Pending Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            Operational Alerts
                        </CardTitle>
                        <CardDescription>Workflow tasks requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href="/dashboard/purchases/orders" className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">Purchase Orders</p>
                                    <p className="text-sm text-slate-500">Pending approval</p>
                                </div>
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    {metrics.pendingPOCount || 0}
                                </Badge>
                            </div>
                        </Link>

                        <Link href="/dashboard/purchases/orders" className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">Approved POs</p>
                                    <p className="text-sm text-slate-500">Ready to send to vendor</p>
                                </div>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                    {metrics.approvedPOCount || 0}
                                </Badge>
                            </div>
                        </Link>

                        <Link href="/dashboard/sales/orders" className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">Sales Orders</p>
                                    <p className="text-sm text-slate-500">In progress</p>
                                </div>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {metrics.pendingOrdersCount || 0}
                                </Badge>
                            </div>
                        </Link>

                        <Link href="/dashboard/sales/invoices" className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">Unpaid Invoices</p>
                                    <p className="text-sm text-slate-500">Awaiting payment</p>
                                </div>
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    {metrics.unpaidInvoicesCount || 0}
                                </Badge>
                            </div>
                        </Link>

                        <Link href="/dashboard/hr/leaves" className="block p-3 rounded-lg hover:bg-slate-50 transition-colors border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">Leave Requests</p>
                                    <p className="text-sm text-slate-500">Pending approval</p>
                                </div>
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                    {metrics.pendingLeavesCount || 0}
                                </Badge>
                            </div>
                        </Link>
                    </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Quick Actions
                        </CardTitle>
                        <CardDescription>Frequently used features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Link href="/dashboard/pos" className="block p-3 rounded-lg hover:bg-green-50 transition-colors border border-green-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <ShoppingCart className="h-5 w-5 text-green-700" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">POS Terminal</p>
                                    <p className="text-sm text-slate-500">Make a sale</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/inventory" className="block p-3 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Stock Overview</p>
                                    <p className="text-sm text-slate-500">Check inventory</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/accounting/reports/registers" className="block p-3 rounded-lg hover:bg-primary/5 transition-colors border border-primary/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Calculator className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Transaction Registers</p>
                                    <p className="text-sm text-slate-500">Sales & Purchase registers</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/hr/payroll" className="block p-3 rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-emerald-700" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">Payroll Management</p>
                                    <p className="text-sm text-slate-500">Process monthly salaries</p>
                                </div>
                            </div>
                        </Link>

                        <Link href="/system-health" className="block p-3 rounded-lg hover:bg-orange-50 transition-colors border border-orange-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-orange-700" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">System Health</p>
                                    <p className="text-sm text-slate-500">Run diagnostics</p>
                                </div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function DashboardLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Dashboard Overview</h2>
                    <div className="mt-2 h-4 w-64 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="h-9 w-40 rounded border border-slate-200 bg-slate-100 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`primary-${index}`} className="border-l-4 border-l-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                            <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-7 w-28 rounded bg-slate-200 animate-pulse" />
                            <div className="mt-2 h-3 w-20 rounded bg-slate-100 animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Card key={`secondary-${index}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                            <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-7 w-16 rounded bg-slate-200 animate-pulse" />
                            <div className="mt-2 h-3 w-24 rounded bg-slate-100 animate-pulse" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
