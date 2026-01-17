
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        // 1. Verify User is Authenticated (Safety Check)
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Use Admin Client to Bypass RLS
        const adminSupabase = await createAdminClient()

        console.log('🧹 [API] Starting Admin Cleanup...')
        const logs: string[] = []

        // --- PRODUCTS & DEPENDENCIES ---
        const { data: staleProducts } = await adminSupabase.from('products').select('id')
            .or('sku.ilike.TEST-%,name.ilike.TEST-%,sku.ilike.HEALTH-TEST-%,name.ilike.HEALTH-TEST-%')

        if (staleProducts?.length) {
            const ids = staleProducts.map(p => p.id)
            await adminSupabase.from('inventory_transactions').delete().in('product_id', ids)
            await adminSupabase.from('inventory_stock').delete().in('product_id', ids)
            await adminSupabase.from('stock_transfer_items').delete().in('product_id', ids)
            await adminSupabase.from('stock_adjustment_items').delete().in('product_id', ids)
            await adminSupabase.from('pos_sale_items').delete().in('product_id', ids)
            await adminSupabase.from('customer_invoice_items_accounting').delete().in('product_id', ids)
            await adminSupabase.from('vendor_bill_items').delete().in('product_id', ids)
            await adminSupabase.from('sales_order_items').delete().in('product_id', ids)
            await adminSupabase.from('purchase_order_items').delete().in('product_id', ids)

            const { error } = await adminSupabase.from('products').delete().in('id', ids)
            if (error) logs.push(`❌ Failed to delete products: ${error.message}`)
            else logs.push(`✅ Deleted ${ids.length} stale products`)
        }

        // --- CUSTOMERS & VENDORS ---
        const { data: staleCust } = await adminSupabase.from('customers').select('id')
            .or('name.ilike.TEST-%,customer_code.ilike.TEST-%,name.ilike.HEALTH-TEST-%,customer_code.ilike.HEALTH-TEST-%')
        if (staleCust?.length) {
            const ids = staleCust.map(c => c.id)
            const { data: orders } = await adminSupabase.from('sales_orders').select('id').in('customer_id', ids)
            const { data: quotes } = await adminSupabase.from('sales_quotations').select('id').in('customer_id', ids)
            const { data: deliveries } = await adminSupabase.from('delivery_notes').select('id').in('customer_id', ids)
            const { data: invoices } = await adminSupabase.from('sales_invoices').select('id').in('customer_id', ids)
            const { data: returns } = await adminSupabase.from('sales_returns').select('id').in('customer_id', ids)

            const orderIds = orders?.map(o => o.id) || []
            const quoteIds = quotes?.map(q => q.id) || []
            const deliveryIds = deliveries?.map(d => d.id) || []
            const invoiceIds = invoices?.map(i => i.id) || []
            const returnIds = returns?.map(r => r.id) || []

            if (returnIds.length) {
                await adminSupabase.from('sales_return_items').delete().in('return_id', returnIds)
                await adminSupabase.from('sales_returns').delete().in('id', returnIds)
            }
            if (invoiceIds.length) {
                await adminSupabase.from('sales_invoice_items').delete().in('invoice_id', invoiceIds)
                await adminSupabase.from('sales_invoices').delete().in('id', invoiceIds)
            }
            if (deliveryIds.length) {
                await adminSupabase.from('delivery_note_items').delete().in('delivery_note_id', deliveryIds)
                await adminSupabase.from('delivery_notes').delete().in('id', deliveryIds)
            }
            if (orderIds.length) {
                await adminSupabase.from('sales_order_items').delete().in('order_id', orderIds)
                await adminSupabase.from('sales_orders').delete().in('id', orderIds)
            }
            if (quoteIds.length) {
                await adminSupabase.from('sales_quotation_items').delete().in('quotation_id', quoteIds)
                await adminSupabase.from('sales_quotations').delete().in('id', quoteIds)
            }

            await adminSupabase.from('pos_sales').delete().in('customer_id', ids)
            await adminSupabase.from('customer_invoices_accounting').delete().in('customer_id', ids)
            await adminSupabase.from('receipt_vouchers').delete().in('customer_id', ids)
            const { error } = await adminSupabase.from('customers').delete().in('id', ids)
            if (!error) logs.push(`✅ Deleted ${ids.length} stale customers`)
        }

        const { data: staleVendors } = await adminSupabase.from('vendors').select('id')
            .or('name.ilike.TEST-%,vendor_code.ilike.TEST-%,name.ilike.HEALTH-TEST-%,vendor_code.ilike.HEALTH-TEST-%')
        if (staleVendors?.length) {
            const ids = staleVendors.map(v => v.id)
            await adminSupabase.from('vendor_bills').delete().in('vendor_id', ids)
            await adminSupabase.from('purchase_orders').delete().in('vendor_id', ids)
            await adminSupabase.from('payment_vouchers').delete().in('vendor_id', ids)
            const { error } = await adminSupabase.from('vendors').delete().in('id', ids)
            if (!error) logs.push(`✅ Deleted ${ids.length} stale vendors`)
        }

        // --- TRANSFERS & ADJUSTMENTS ---
        const { data: staleTransfers } = await adminSupabase.from('stock_transfers').select('id').ilike('notes', '%TEST%')
        if (staleTransfers?.length) {
            const ids = staleTransfers.map(t => t.id)
            await adminSupabase.from('stock_transfer_items').delete().in('transfer_id', ids)
            await adminSupabase.from('stock_transfers').delete().in('id', ids)
            logs.push(`✅ Deleted ${ids.length} stale transfers`)
        }

        const { data: staleAdjustments } = await adminSupabase.from('stock_adjustments').select('id').ilike('reason', '%TEST%')
        if (staleAdjustments?.length) {
            const ids = staleAdjustments.map(a => a.id)
            await adminSupabase.from('stock_adjustment_items').delete().in('adjustment_id', ids)
            await adminSupabase.from('stock_adjustments').delete().in('id', ids)
            logs.push(`✅ Deleted ${ids.length} stale adjustments`)
        }

        // --- JOURNAL ENTRIES ---
        const { data: staleJE } = await adminSupabase.from('journal_entries').select('id').or('narration.ilike.%TEST%,reference_number.ilike.%TEST%')
        if (staleJE?.length) {
            const ids = staleJE.map(j => j.id)
            await adminSupabase.from('journal_entry_lines').delete().in('journal_entry_id', ids)
            const { error } = await adminSupabase.from('journal_entries').delete().in('id', ids)
            if (!error) logs.push(`✅ Deleted ${ids.length} stale journal entries`)
        }

        // --- ROLES & PERMISSIONS (Optional/Safety) ---
        const { data: staleRoles } = await adminSupabase.from('roles').select('id').ilike('role_name', 'HEALTH-TEST-%')
        if (staleRoles?.length) {
            const ids = staleRoles.map(r => r.id)
            await adminSupabase.from('role_permissions').delete().in('role_id', ids)
            await adminSupabase.from('user_roles').delete().in('role_id', ids)
            await adminSupabase.from('roles').delete().in('id', ids)
            logs.push(`✅ Deleted ${ids.length} stale test roles`)
        }

        // --- HR & PAYROLL ---
        const { data: staleEmp } = await adminSupabase.from('employees').select('id')
            .or('full_name.ilike.TEST-%,employee_code.ilike.TEST-%,full_name.ilike.HEALTH-TEST-%,employee_code.ilike.HEALTH-TEST-%,employee_code.ilike.HLT-DRV-%')
        if (staleEmp?.length) {
            const ids = staleEmp.map(e => e.id)
            await adminSupabase.from('attendance').delete().in('employee_id', ids)
            await adminSupabase.from('leave_requests').delete().in('employee_id', ids)
            await adminSupabase.from('leave_balance').delete().in('employee_id', ids)
            await adminSupabase.from('employee_advances').delete().in('employee_id', ids)
            await adminSupabase.from('payslips').delete().in('employee_id', ids)
            await adminSupabase.from('employee_salary_components').delete().in('employee_id', ids)
            await adminSupabase.from('commission_records').delete().in('employee_id', ids)
            await adminSupabase.from('overtime_records').delete().in('employee_id', ids)

            const { error } = await adminSupabase.from('employees').delete().in('id', ids)
            if (!error) logs.push(`✅ Deleted ${ids.length} stale employees`)
        }

        // --- PAYROLL PERIODS ---
        const { data: stalePeriods } = await adminSupabase.from('payroll_periods').select('id')
            .ilike('period_name', 'HEALTH-TEST-%')
        if (stalePeriods?.length) {
            const ids = stalePeriods.map(p => p.id)
            await adminSupabase.from('payslips').delete().in('payroll_period_id', ids)
            const { error } = await adminSupabase.from('payroll_periods').delete().in('id', ids)
            if (!error) logs.push(`✅ Deleted ${ids.length} stale payroll periods`)
        }

        // --- FLEET MANAGEMENT ---
        const { data: staleVehicles } = await adminSupabase.from('fleet_vehicles').select('id, location_id')
            .or('registration_number.ilike.TEST-%,registration_number.ilike.HLT-%')
        if (staleVehicles?.length) {
            const vehIds = staleVehicles.map(v => v.id)
            const locIds = staleVehicles.map(v => v.location_id).filter(id => id !== null)

            // Get trip IDs for cascade cleanup
            const { data: trips } = await adminSupabase.from('fleet_trips').select('id').in('vehicle_id', vehIds)
            const tripIds = trips?.map(t => t.id) || []

            // Cleanup new Fleet Business Workflow tables
            if (tripIds.length) {
                await adminSupabase.from('fleet_cash_deposits').delete().in('trip_id', tripIds)
                await adminSupabase.from('fleet_fuel_allowances').delete().in('trip_id', tripIds)
                await adminSupabase.from('fleet_expense_variances').delete().in('trip_id', tripIds)
            }

            // Cleanup existing fleet tables
            await adminSupabase.from('fleet_fuel_logs').delete().in('vehicle_id', vehIds)
            await adminSupabase.from('fleet_maintenance').delete().in('vehicle_id', vehIds)
            await adminSupabase.from('fleet_trip_locations').delete().in('trip_id', tripIds)
            await adminSupabase.from('fleet_trips').delete().in('vehicle_id', vehIds)
            await adminSupabase.from('fleet_drivers').delete().in('vehicle_id', vehIds)

            await adminSupabase.from('fleet_vehicles').delete().in('id', vehIds)

            // Delete associated locations (Mobile Stores)
            if (locIds.length) {
                await adminSupabase.from('inventory_stock').delete().in('location_id', locIds)
                await adminSupabase.from('locations').delete().in('id', locIds)
            }
            logs.push(`✅ Deleted ${vehIds.length} stale fleet vehicles & mobile stores (including workflow data)`)
        }

        const { data: staleDrivers } = await adminSupabase.from('fleet_drivers').select('id')
            .or('license_number.ilike.TEST-%,license_number.ilike.LIC-%')
        if (staleDrivers?.length) {
            const ids = staleDrivers.map(d => d.id)
            await adminSupabase.from('fleet_trips').delete().in('driver_id', ids)
            const { error } = await adminSupabase.from('fleet_drivers').delete().in('id', ids)
            if (!error) logs.push(`✅ Deleted ${ids.length} stale drivers`)
        }

        console.log('🧹 [API] Cleanup Complete', logs)
        return NextResponse.json({ success: true, logs })

    } catch (error: any) {
        console.error('API Cleanup Failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
