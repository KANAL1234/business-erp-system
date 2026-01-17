'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, LayoutDashboard, ShoppingCart, Package, Users, Truck, Calculator } from "lucide-react"

export function MainNav({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
    const pathname = usePathname()

    const isActive = (path: string) => pathname?.startsWith(path)

    return (
        <nav
            className={cn("flex items-center space-x-2 lg:space-x-4", className)}
            {...props}
        >
            <Link
                href="/dashboard"
                className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === '/dashboard' ? "text-primary" : "text-muted-foreground"
                )}
            >
                <Button variant="ghost" size="sm" className={pathname === '/dashboard' ? "bg-accent" : ""}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                </Button>
            </Link>

            {/* Sales & POS */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(isActive('/dashboard/pos') ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                    >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Sales & POS
                        <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Point of Sale</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/pos">POS Terminal</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/pos/history">Sales History</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/pos/closing">Daily Closing</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>B2B & Orders</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/sales/quotations">Quotations</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/sales/orders">Sales Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/sales/invoices">Sales Invoices</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/sales/deliveries">Delivery Notes</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/sales/returns">Sales Returns</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Inventory Management */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            (isActive('/dashboard/inventory') || isActive('/dashboard/products'))
                                ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        <Package className="mr-2 h-4 w-4" />
                        Inventory
                        <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Stock Management</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/inventory">Stock Overview</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/products">Product List</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Operations</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/inventory/transfers">Stock Transfers</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/inventory/adjustments">Stock Adjustments</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Reports</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/inventory/valuation">Inventory Valuation</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Procurement */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            (isActive('/dashboard/purchases') || isActive('/dashboard/vendors'))
                                ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        Procurement
                        <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Suppliers</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/vendors">Vendor List</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Orders</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/purchases/orders">Purchase Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/purchases/grn">Goods Receipts (GRN)</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Accounting */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            isActive('/dashboard/accounting')
                                ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        <Calculator className="mr-2 h-4 w-4" />
                        Accounting
                        <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>General Ledger</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/accounting/chart-of-accounts">Chart of Accounts</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/accounting/bank-accounts">Bank Accounts</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/accounting/journal-entries">Journal Entries</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Accounts Payable</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/accounting/vendor-bills">Vendor Bills</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Accounts Receivable</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/accounting/customer-invoices">Customer Invoices</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Reports</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/accounting/reports/trial-balance">Trial Balance</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/reports/sales-tax">Sales Tax Return (FBR)</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/reports/wht">WHT Return (FBR)</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {/* Fleet Management */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            isActive('/dashboard/fleet')
                                ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        )}
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        Fleet
                        <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Operations</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/fleet/vehicles">Mobile Store Vehicles</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/fleet/drivers">Drivers</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Tracking</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/fleet/trips">Live Trips & Tracking</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Maintenance</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/fleet/maintenance">Service Records</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Financial</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/fleet/variances">Variance Dashboard</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

        </nav>
    )
}
