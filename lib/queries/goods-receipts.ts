import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { GoodsReceipt, GoodsReceiptItem } from '@/lib/types/database'

const supabase = createClient()

// Get all goods receipts
export function useGoodsReceipts(status?: string) {
    return useQuery({
        queryKey: ['goods-receipts', status],
        queryFn: async () => {
            let query = supabase
                .from('goods_receipts')
                .select(`
          *,
          vendors(id, vendor_code, name),
          locations(id, code, name),
          purchase_orders(id, po_number),
          goods_receipt_items(
            *,
            products(id, sku, name)
          ),
          received_by_user:user_profiles!received_by(id, full_name)
        `)
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query

            if (error) throw error
            return data
        },
    })
}

// Get single goods receipt
export function useGoodsReceipt(id: string) {
    return useQuery({
        queryKey: ['goods-receipts', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('goods_receipts')
                .select(`
          *,
          vendors(id, vendor_code, name, phone),
          locations(id, code, name),
          purchase_orders(id, po_number),
          goods_receipt_items(
            *,
            products(id, sku, name)
          ),
          received_by_user:user_profiles!received_by(id, full_name)
        `)
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!id,
    })
}

// Create goods receipt (from PO)
export function useCreateGoodsReceipt() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            poId,
            vendorId,
            locationId,
            receiptDate,
            vendorInvoiceNumber,
            vendorInvoiceDate,
            items,
            notes,
        }: {
            poId?: string
            vendorId: string
            locationId: string
            receiptDate: string
            vendorInvoiceNumber?: string
            vendorInvoiceDate?: string
            items: {
                po_item_id?: string
                product_id: string
                quantity_received: number
                unit_cost: number
                batch_number?: string
                expiry_date?: string
            }[]
            notes?: string
        }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Calculate totals
            const subtotal = items.reduce((sum, item) =>
                sum + (item.quantity_received * item.unit_cost), 0
            )

            // Generate GRN number
            const grnNumber = `GRN-${Date.now()}`

            // Create GRN
            const { data: grn, error: grnError } = await supabase
                .from('goods_receipts')
                .insert({
                    grn_number: grnNumber,
                    po_id: poId,
                    vendor_id: vendorId,
                    location_id: locationId,
                    receipt_date: receiptDate,
                    vendor_invoice_number: vendorInvoiceNumber,
                    vendor_invoice_date: vendorInvoiceDate,
                    subtotal,
                    tax_amount: 0,
                    total_amount: subtotal,
                    status: 'RECEIVED',
                    received_by: user.id,
                    notes,
                })
                .select()
                .single()

            if (grnError) throw grnError

            // Create GRN items
            const grnItems = items.map(item => ({
                grn_id: grn.id,
                po_item_id: item.po_item_id,
                product_id: item.product_id,
                quantity_received: item.quantity_received,
                unit_cost: item.unit_cost,
                batch_number: item.batch_number,
                expiry_date: item.expiry_date,
            }))

            const { error: itemsError } = await supabase
                .from('goods_receipt_items')
                .insert(grnItems)

            if (itemsError) throw itemsError

            // Update stock for each item
            for (const item of items) {
                await supabase.rpc('adjust_inventory_stock', {
                    p_product_id: item.product_id,
                    p_location_id: locationId,
                    p_quantity_change: item.quantity_received,
                })

                // Create inventory transaction
                const { data: txnType } = await supabase
                    .from('transaction_types')
                    .select('id')
                    .eq('code', 'GRN')
                    .single()

                if (txnType) {
                    await supabase.from('inventory_transactions').insert({
                        transaction_type_id: txnType.id,
                        transaction_number: grnNumber,
                        product_id: item.product_id,
                        to_location_id: locationId,
                        quantity: item.quantity_received,
                        unit_cost: item.unit_cost,
                        reference_type: 'PURCHASE',
                        reference_id: grn.id,
                        reference_number: grnNumber,
                        batch_number: item.batch_number,
                        expiry_date: item.expiry_date,
                        created_by: user.id,
                    })
                }

                // Update PO item quantity received if from PO
                if (item.po_item_id) {
                    const { data: poItem } = await supabase
                        .from('purchase_order_items')
                        .select('quantity_received')
                        .eq('id', item.po_item_id)
                        .single()

                    await supabase
                        .from('purchase_order_items')
                        .update({
                            quantity_received: (poItem?.quantity_received || 0) + item.quantity_received,
                        })
                        .eq('id', item.po_item_id)
                }
            }

            // Update PO status if all items received
            if (poId) {
                const { data: poItems } = await supabase
                    .from('purchase_order_items')
                    .select('quantity, quantity_received')
                    .eq('po_id', poId)

                const allReceived = poItems?.every(item =>
                    item.quantity_received >= item.quantity
                )

                const partiallyReceived = poItems?.some(item =>
                    item.quantity_received > 0
                )

                if (allReceived) {
                    await supabase
                        .from('purchase_orders')
                        .update({ status: 'RECEIVED' })
                        .eq('id', poId)
                } else if (partiallyReceived) {
                    await supabase
                        .from('purchase_orders')
                        .update({ status: 'PARTIALLY_RECEIVED' })
                        .eq('id', poId)
                }
            }

            // Update vendor balance
            await supabase.rpc('update_vendor_balance', {
                p_vendor_id: vendorId,
                p_amount_change: subtotal,
            })

            // === PHASE 1: AUTO-CREATE VENDOR BILL (Accounting Integration) ===
            try {
                // Generate bill number
                const { data: lastBill } = await supabase
                    .from('vendor_bills')
                    .select('bill_number')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                let billNumber = 'VB-0001'
                if (lastBill) {
                    const lastNum = parseInt(lastBill.bill_number.split('-')[1])
                    billNumber = `VB-${String(lastNum + 1).padStart(4, '0')}`
                }

                // Calculate tax (18% sales tax on purchases = input tax)
                const taxAmount = subtotal * 0.18
                const totalAmount = subtotal + taxAmount

                // Create Vendor Bill
                const { data: vendorBill, error: billError } = await supabase
                    .from('vendor_bills')
                    .insert({
                        bill_number: billNumber,
                        vendor_id: vendorId,
                        po_id: poId,
                        grn_id: grn.id,
                        bill_date: receiptDate,
                        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
                        subtotal,
                        tax_amount: taxAmount,
                        total_amount: totalAmount,
                        amount_due: totalAmount,
                        status: 'goods_received', // Goods received from GRN
                        payment_status: 'unpaid',
                        created_by: user.id,
                        approved_by: user.id
                    })
                    .select()
                    .single()

                if (billError) throw billError

                // Create Vendor Bill Items
                const billItems = items.map(item => ({
                    bill_id: vendorBill.id,
                    product_id: item.product_id,
                    quantity: item.quantity_received,
                    unit_price: item.unit_cost,
                    tax_percentage: 18,
                    discount_percentage: 0
                }))

                await supabase.from('vendor_bill_items').insert(billItems)

                // Auto-post to GL (since status is approved)
                await supabase.rpc('post_vendor_bill', {
                    p_bill_id: vendorBill.id
                })

                console.log(`✅ Vendor Bill ${billNumber} created and posted to GL`)
            } catch (billError) {
                console.warn('Vendor Bill creation failed (non-critical):', billError)
                // Don't fail GRN if bill creation fails
            }

            return grn
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goods-receipts'] })
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
            queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
            queryClient.invalidateQueries({ queryKey: ['vendors'] })
        },
    })
}
