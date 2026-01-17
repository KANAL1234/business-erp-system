'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Truck,
    Users,
    Calculator,
    ChevronRight,
    ChevronDown,
    Settings,
    UserCog,
    ShieldCheck,
    PanelLeft
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { NavLink } from '@/components/nav-link'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/providers/sidebar-provider'

export function Sidebar() {
    const pathname = usePathname()
    const { isAdmin } = useAuth()
    const [expandedSections, setExpandedSections] = useState<string[]>(['sales', 'inventory', 'procurement', 'hr', 'fleet', 'accounting', 'settings'])
    const { isOpen } = useSidebar()
    // Mini-collapsing disabled in favor of full hide.
    const isCollapsed = false


    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        )
    }

    const isActive = (path: string) => pathname?.startsWith(path)

    const linkClass = (path: string) => cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
        pathname === path
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-200"
    )

    const subLinkClass = (path: string, exact = true) => cn(
        "flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors",
        (exact ? pathname === path : pathname?.startsWith(path))
            ? "bg-slate-900 font-medium text-white"
            : "text-slate-600 hover:bg-slate-100"
    )

    return (
        <div className={cn("flex h-full flex-col border-r bg-slate-50 transition-all duration-300", isOpen ? "w-64" : "w-0 overflow-hidden border-none")}>
            {/* Logo/Brand */}
            <div className="flex h-16 items-center border-b px-6">
                <h1 className="text-xl font-bold text-slate-900 truncate">Business-ERP-Software</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrolbar-hide">
                {/* Dashboard */}
                <NavLink
                    href="/dashboard"
                    permission="dashboard.overview.view"
                    className={linkClass('/dashboard')}
                >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>Dashboard</span>}
                </NavLink>

                {/* Sales & POS */}
                <div>
                    <button
                        onClick={() => toggleSection('sales')}
                        className={cn(
                            "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/pos') || isActive('/dashboard/sales')
                                ? "bg-slate-900 text-white"
                                : "text-slate-700 hover:bg-slate-200",
                            isCollapsed ? "justify-center" : "justify-between"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>Sales & POS</span>}
                        </div>
                        {!isCollapsed && (expandedSections.includes('sales') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        ))}
                    </button>
                    {expandedSections.includes('sales') && (
                        <div className={cn("mt-1 space-y-1", !isCollapsed && "ml-4 border-l pl-4")}>
                            {!isCollapsed && <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1">B2C (Retail)</div>}
                            <NavLink permission="pos.sales.create" href="/dashboard/pos" className={subLinkClass('/dashboard/pos')}>
                                {!isCollapsed && <span>POS Terminal</span>}
                            </NavLink>
                            <NavLink permission="pos.sales.view" href="/dashboard/pos/history" className={subLinkClass('/dashboard/pos/history')}>
                                {!isCollapsed && <span>Sales History</span>}
                            </NavLink>
                            <NavLink permission="pos.closing.view" href="/dashboard/pos/closing" className={subLinkClass('/dashboard/pos/closing')}>
                                {!isCollapsed && <span>Daily Closing</span>}
                            </NavLink>

                            {!isCollapsed && <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-1 mt-3 pt-3 border-t">B2B (Wholesale)</div>}
                            <NavLink permission="sales.quotations.read" href="/dashboard/sales/quotations" className={subLinkClass('/dashboard/sales/quotations', false)}>
                                {!isCollapsed && <span>Quotations</span>}
                            </NavLink>
                            <NavLink permission="sales.orders.read" href="/dashboard/sales/orders" className={subLinkClass('/dashboard/sales/orders', false)}>
                                {!isCollapsed && <span>Sales Orders</span>}
                            </NavLink>
                            <NavLink permission="sales.invoices.read" href="/dashboard/sales/invoices" className={subLinkClass('/dashboard/sales/invoices', false)}>
                                {!isCollapsed && <span>Sales Invoices</span>}
                            </NavLink>
                            <NavLink permission="sales.customers.read" href="/dashboard/sales/customers" className={subLinkClass('/dashboard/sales/customers', false)}>
                                {!isCollapsed && <span>Customer List</span>}
                            </NavLink>
                            <NavLink permission="sales.deliveries.read" href="/dashboard/sales/deliveries" className={subLinkClass('/dashboard/sales/deliveries', false)}>
                                {!isCollapsed && <span>Delivery Notes</span>}
                            </NavLink>
                            <NavLink permission="sales.returns.read" href="/dashboard/sales/returns" className={subLinkClass('/dashboard/sales/returns', false)}>
                                {!isCollapsed && <span>Sales Returns</span>}
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Inventory */}
                <div>
                    <button
                        onClick={() => toggleSection('inventory')}
                        className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/inventory') || isActive('/dashboard/products')
                                ? "bg-slate-200 text-slate-900"
                                : "text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Package className="h-4 w-4" />
                            Inventory
                        </div>
                        {expandedSections.includes('inventory') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.includes('inventory') && (
                        <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                            <NavLink permission="inventory.stock.view" href="/dashboard/inventory" className={subLinkClass('/dashboard/inventory')}>
                                Stock Overview
                            </NavLink>
                            <NavLink permission="inventory.stock.view" href="/dashboard/inventory/valuation" className={subLinkClass('/dashboard/inventory/valuation')}>
                                Stock Valuation
                            </NavLink>
                            <NavLink permission="inventory.products.read" href="/dashboard/products" className={subLinkClass('/dashboard/products')}>
                                Product List
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="inventory.stock.transfer" href="/dashboard/inventory/transfers" className={subLinkClass('/dashboard/inventory/transfers', false)}>
                                Stock Transfers
                            </NavLink>
                            <NavLink permission="inventory.stock.adjust" href="/dashboard/inventory/adjustments" className={subLinkClass('/dashboard/inventory/adjustments', false)}>
                                Stock Adjustments
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Procurement */}
                <div>
                    <button
                        onClick={() => toggleSection('procurement')}
                        className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/purchases') || isActive('/dashboard/vendors')
                                ? "bg-slate-200 text-slate-900"
                                : "text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Truck className="h-4 w-4" />
                            Procurement
                        </div>
                        {expandedSections.includes('procurement') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.includes('procurement') && (
                        <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                            <NavLink permission="procurement.vendors.read" href="/dashboard/vendors" className={subLinkClass('/dashboard/vendors')}>
                                Vendor List
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="procurement.purchase_orders.read" href="/dashboard/purchases/orders" className={subLinkClass('/dashboard/purchases/orders', false)}>
                                Purchase Orders
                            </NavLink>
                            <NavLink permission="procurement.grn.read" href="/dashboard/purchases/grn" className={subLinkClass('/dashboard/purchases/grn', false)}>
                                Goods Receipts (GRN)
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* HR Management */}
                <div>
                    <button
                        onClick={() => toggleSection('hr')}
                        className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/hr')
                                ? "bg-slate-200 text-slate-900"
                                : "text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Users className="h-4 w-4" />
                            HR Management
                        </div>
                        {expandedSections.includes('hr') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.includes('hr') && (
                        <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                            <NavLink permission="hr.employees.read" href="/dashboard/hr/employees" className={subLinkClass('/dashboard/hr/employees')}>
                                Employee Master
                            </NavLink>
                            <NavLink permission="hr.attendance.view" href="/dashboard/hr/attendance" className={subLinkClass('/dashboard/hr/attendance')}>
                                Attendance
                            </NavLink>
                            <NavLink permission="hr.leaves.request" href="/dashboard/hr/leaves" className={subLinkClass('/dashboard/hr/leaves')}>
                                Leave Management
                            </NavLink>
                            <NavLink permission="hr.advances.create" href="/dashboard/hr/advances" className={subLinkClass('/dashboard/hr/advances')}>
                                Advances & Loans
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="hr.payroll.view" href="/dashboard/hr/payroll" className={subLinkClass('/dashboard/hr/payroll')}>
                                Payroll Processing
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Fleet Management */}
                <div>
                    <button
                        onClick={() => toggleSection('fleet')}
                        className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/fleet')
                                ? "bg-slate-200 text-slate-900"
                                : "text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Truck className="h-4 w-4" />
                            <span>Fleet Management</span>
                        </div>
                        {expandedSections.includes('fleet') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.includes('fleet') && (
                        <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                            <NavLink permission="fleet:vehicles:view" href="/dashboard/fleet/vehicles" className={subLinkClass('/dashboard/fleet/vehicles')}>
                                Vehicles
                            </NavLink>
                            <NavLink permission="fleet:drivers:view" href="/dashboard/fleet/drivers" className={subLinkClass('/dashboard/fleet/drivers')}>
                                Drivers
                            </NavLink>
                            <NavLink permission="fleet:trips:view" href="/dashboard/fleet/trips" className={subLinkClass('/dashboard/fleet/trips')}>
                                Trips & Fuel
                            </NavLink>
                            <NavLink permission="fleet:maintenance:view" href="/dashboard/fleet/maintenance" className={subLinkClass('/dashboard/fleet/maintenance')}>
                                Maintenance
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Accounting */}
                <div>
                    <button
                        onClick={() => toggleSection('accounting')}
                        className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/accounting') || isActive('/setup')
                                ? "bg-slate-200 text-slate-900"
                                : "text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Calculator className="h-4 w-4" />
                            Accounting
                        </div>
                        {expandedSections.includes('accounting') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.includes('accounting') && (
                        <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                            <NavLink permission="settings.company.manage" href="/setup" className={subLinkClass('/setup')}>
                                Setup Wizard
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="accounting.chart_of_accounts.read" href="/dashboard/accounting/chart-of-accounts" className={subLinkClass('/dashboard/accounting/chart-of-accounts', false)}>
                                Chart of Accounts
                            </NavLink>
                            <NavLink permission="accounting.bank_accounts.read" href="/dashboard/accounting/bank-accounts" className={subLinkClass('/dashboard/accounting/bank-accounts', false)}>
                                Bank Accounts
                            </NavLink>
                            <NavLink permission="accounting.journal_entries.read" href="/dashboard/accounting/journal-entries" className={subLinkClass('/dashboard/accounting/journal-entries', false)}>
                                Journal Entries
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="accounting.vendor_bills.read" href="/dashboard/accounting/vendor-bills" className={subLinkClass('/dashboard/accounting/vendor-bills', false)}>
                                Vendor Bills
                            </NavLink>
                            <NavLink permission="accounting.payment_vouchers.read" href="/dashboard/accounting/payment-vouchers" className={subLinkClass('/dashboard/accounting/payment-vouchers', false)}>
                                Payment Vouchers
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="accounting.customer_invoices.read" href="/dashboard/accounting/customer-invoices" className={subLinkClass('/dashboard/accounting/customer-invoices', false)}>
                                Customer Invoices
                            </NavLink>
                            <NavLink permission="accounting.receipt_vouchers.read" href="/dashboard/accounting/receipt-vouchers" className={subLinkClass('/dashboard/accounting/receipt-vouchers', false)}>
                                Receipt Vouchers
                            </NavLink>
                            <div className="my-2 border-t"></div>
                            <NavLink permission="accounting.reports.read" href="/dashboard/accounting/reports/trial-balance" className={subLinkClass('/dashboard/accounting/reports/trial-balance')}>
                                Trial Balance
                            </NavLink>
                            <NavLink permission="accounting.reports.read" href="/dashboard/accounting/reports/registers" className={subLinkClass('/dashboard/accounting/reports/registers')}>
                                Transaction Registers
                            </NavLink>
                            <NavLink permission="accounting.reports.read" href="/dashboard/accounting/reports/financial" className={subLinkClass('/dashboard/accounting/reports/financial')}>
                                Financial Reports
                            </NavLink>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div>
                    <button
                        onClick={() => toggleSection('settings')}
                        className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive('/dashboard/settings')
                                ? "bg-slate-200 text-slate-900"
                                : "text-slate-700 hover:bg-slate-200"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Settings className="h-4 w-4" />
                            Settings
                        </div>
                        {expandedSections.includes('settings') ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {expandedSections.includes('settings') && (
                        <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                            <NavLink permission="settings.users.read" href="/dashboard/settings/users" className={subLinkClass('/dashboard/settings/users')}>
                                <UserCog className="h-3 w-3 mr-2" />
                                User Management
                            </NavLink>
                            <NavLink permission="settings.roles.manage" href="/dashboard/settings/roles" className={subLinkClass('/dashboard/settings/roles')}>
                                <ShieldCheck className="h-3 w-3 mr-2" />
                                Role Management
                            </NavLink>
                        </div>
                    )}
                </div>
            </nav>
        </div>
    )
}
