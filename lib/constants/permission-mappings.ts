// Permission Guard Additions Script
// This file documents all the permission guard additions made

export const permissionMappings = {
    // Already completed
    '/dashboard': 'dashboard:overview',
    '/dashboard/inventory': 'inventory:view',
    '/dashboard/pos': 'pos:access',
    '/dashboard/sales/orders': 'sales:orders:view',

    // POS Module
    '/dashboard/pos/history': 'pos:history:view',
    '/dashboard/pos/closing': 'pos:closing:view',

    // Inventory Module
    '/dashboard/products': 'products:view',
    '/dashboard/inventory/transfers': 'inventory:transfers:view',
    '/dashboard/inventory/adjustments': 'inventory:adjustments:view',

    // Sales Module
    '/dashboard/sales/quotations': 'sales:quotations:view',
    '/dashboard/sales/invoices': 'sales:invoices:view',
    '/dashboard/sales/deliveries': 'sales:deliveries:view',
    '/dashboard/sales/returns': 'sales:returns:view',

    // Purchases Module
    '/dashboard/vendors': 'vendors:view',
    '/dashboard/purchases/orders': 'purchases:orders:view',
    '/dashboard/purchases/grn': 'purchases:grn:view',

    // Accounting Module
    '/dashboard/accounting/chart-of-accounts': 'accounting:coa:view',
    '/dashboard/accounting/journal-entries': 'accounting:journal:view',
    '/dashboard/accounting/bank-accounts': 'accounting:bank:view',
    '/dashboard/accounting/vendor-bills': 'accounting:bills:view',
    '/dashboard/accounting/customer-invoices': 'accounting:invoices:view',
    '/dashboard/accounting/payment-vouchers': 'accounting:payments:view',
    '/dashboard/accounting/receipt-vouchers': 'accounting:receipts:view',

    // Settings Module
    '/dashboard/settings/roles': 'settings:roles:view',
    '/dashboard/settings/users': 'settings:users:view',

    // Fleet Module
    '/dashboard/fleet': 'fleet:overview:view',
    '/dashboard/fleet/vehicles': 'fleet:vehicles:view',
    '/dashboard/fleet/drivers': 'fleet:drivers:view',
    '/dashboard/fleet/trips': 'fleet:trips:view',
    '/dashboard/fleet/maintenance': 'fleet:maintenance:view',
}
