export type Product = {
    id: string
    sku: string
    barcode: string | null
    name: string
    description: string | null
    category_id: string
    uom_id: string
    cost_price: number | null
    selling_price: number | null
    wholesale_price: number | null
    reorder_point: number
    reorder_quantity: number
    min_stock_level: number
    max_stock_level: number | null
    is_active: boolean
    is_serialized: boolean
    is_batchable: boolean
    notes: string | null
    image_url: string | null
    created_at: string
    updated_at: string
}

export type ProductCategory = {
    id: string
    code: string
    name: string
    parent_id: string | null
    costing_method: 'AVCO' | 'FIFO'
    description: string | null
    is_active: boolean
    created_at: string
}

export type UnitOfMeasure = {
    id: string
    code: string
    name: string
    description: string | null
}

export type StockTransferStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'IN_TRANSIT'
    | 'COMPLETED'
    | 'CANCELLED'

export type StockAdjustmentType =
    | 'CYCLE_COUNT'
    | 'DAMAGE'
    | 'EXPIRY'
    | 'LOSS'
    | 'FOUND'
    | 'OTHER'

export type StockAdjustmentStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'

export type ProductWithDetails = Product & {
    product_categories: ProductCategory
    units_of_measure: UnitOfMeasure
}

export type Location = {
    id: string
    type_id: string
    code: string
    name: string
    address: string | null
    contact_person: string | null
    contact_phone: string | null
    is_active: boolean
    vehicle_number: string | null
    assigned_salesperson_id: string | null
    created_at: string
    updated_at: string
}

export type LocationType = {
    id: string
    name: string
    description: string | null
}

export type LocationWithType = Location & {
    location_types: LocationType
}

export type InventoryStock = {
    id: string
    product_id: string
    location_id: string
    quantity_on_hand: number
    quantity_reserved: number
    quantity_available: number
    average_cost: number
    total_value: number
    last_stock_take_date: string | null
    last_updated: string
}

export type InventoryStockWithDetails = InventoryStock & {
    products: Product
    locations: LocationWithType
}

export type StockTransfer = {
    id: string
    transfer_number: string
    from_location_id: string
    to_location_id: string
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
    requested_by: string | null
    approved_by: string | null
    received_by: string | null
    transfer_date: string
    expected_delivery_date: string | null
    actual_delivery_date: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export type StockTransferItem = {
    id: string
    transfer_id: string
    product_id: string
    quantity_requested: number
    quantity_sent: number | null
    quantity_received: number | null
    unit_cost: number | null
    notes: string | null
}

export type StockTransferWithDetails = StockTransfer & {
    from_location: Location
    to_location: Location
    stock_transfer_items: (StockTransferItem & {
        products: Product
    })[]
}

export type StockAdjustment = {
    id: string
    adjustment_number: string
    location_id: string
    adjustment_type: 'CYCLE_COUNT' | 'DAMAGE' | 'EXPIRY' | 'LOSS' | 'FOUND' | 'OTHER'
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED'
    adjustment_date: string
    reason: string
    approved_by: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type StockAdjustmentItem = {
    id: string
    adjustment_id: string
    product_id: string
    system_quantity: number
    physical_quantity: number
    difference: number
    unit_cost: number | null
    value_difference: number | null
    notes: string | null
}

export type StockAdjustmentWithDetails = StockAdjustment & {
    locations: Location
    stock_adjustment_items: (StockAdjustmentItem & {
        products: Product
    })[]
}

export type InventoryTransaction = {
    id: string
    transaction_type_id: string
    transaction_number: string
    product_id: string
    from_location_id: string | null
    to_location_id: string | null
    quantity: number
    unit_cost: number | null
    reference_type: string | null
    reference_id: string | null
    reference_number: string | null
    batch_number: string | null
    serial_number: string | null
    expiry_date: string | null
    notes: string | null
    created_by: string | null
    created_at: string
}

export type POSSale = {
    id: string
    sale_number: string
    location_id: string
    customer_id: string | null
    sale_date: string
    subtotal: number
    discount_amount: number
    tax_amount: number
    total_amount: number
    payment_method: 'CASH' | 'CREDIT' | 'BANK_TRANSFER'
    amount_paid: number
    amount_due: number
    is_synced: boolean
    device_id: string | null
    cashier_id: string | null
    notes: string | null
    created_at: string
}

export type POSSaleItem = {
    id: string
    sale_id: string
    product_id: string
    quantity: number
    unit_price: number
    discount_percentage: number
    line_total: number
}

export type POSSaleWithDetails = POSSale & {
    pos_sale_items: (POSSaleItem & {
        products: Product
    })[]
    customers?: Customer
    locations: Location
    cashier?: {
        id: string
        full_name: string
    }
}

export type CartItem = {
    product_id: string
    product: Product
    quantity: number
    unit_price: number
    discount_percentage: number
    line_total: number
}

export type Customer = {
    id: string
    customer_code: string
    customer_type: 'INDIVIDUAL' | 'BUSINESS'
    name: string
    contact_person: string | null
    email: string | null
    phone: string
    alternate_phone: string | null
    address: string | null
    city: string | null
    cnic: string | null
    ntn: string | null
    credit_limit: number
    credit_days: number
    current_balance: number
    is_vip: boolean
    discount_percentage: number
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type Vendor = {
    id: string
    vendor_code: string
    name: string
    contact_person: string | null
    email: string | null
    phone: string
    alternate_phone: string | null
    address: string | null
    city: string | null
    ntn: string | null
    payment_terms_days: number
    current_balance: number
    vendor_category: string | null
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type PurchaseOrder = {
    id: string
    po_number: string
    vendor_id: string
    location_id: string
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_VENDOR' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
    po_date: string
    expected_delivery_date: string | null
    requested_by: string | null
    approved_by: string | null
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    notes: string | null
    terms_and_conditions: string | null
    created_at: string
    updated_at: string
}

export type PurchaseOrderItem = {
    id: string
    po_id: string
    product_id: string
    quantity: number
    unit_price: number
    discount_percentage: number
    tax_percentage: number
    line_total: number
    quantity_received: number
    notes: string | null
}

export type PurchaseOrderWithDetails = PurchaseOrder & {
    vendors: Vendor
    locations: Location
    purchase_order_items: (PurchaseOrderItem & {
        products: Product
    })[]
    requested_by_user?: {
        id: string
        full_name: string
    }
    approved_by_user?: {
        id: string
        full_name: string
    }
}

export type GoodsReceipt = {
    id: string
    grn_number: string
    po_id: string | null
    vendor_id: string
    location_id: string
    receipt_date: string
    vendor_invoice_number: string | null
    vendor_invoice_date: string | null
    subtotal: number
    tax_amount: number
    total_amount: number
    status: 'DRAFT' | 'RECEIVED' | 'BILLED'
    received_by: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export type GoodsReceiptItem = {
    id: string
    grn_id: string
    po_item_id: string | null
    product_id: string
    quantity_received: number
    unit_cost: number
    batch_number: string | null
    expiry_date: string | null
    line_total: number
    notes: string | null
}

export type GoodsReceiptWithDetails = GoodsReceipt & {
    vendors: Vendor
    locations: Location
    purchase_orders?: PurchaseOrder
    goods_receipt_items: (GoodsReceiptItem & {
        products: Product
    })[]
    received_by_user?: {
        id: string
        full_name: string
    }
}


// ========================================
// SALES MODULE TYPES
// ========================================

export type SalesQuotation = {
    id: string
    quotation_number: string
    customer_id: string
    quotation_date: string
    valid_until: string
    reference_number: string | null
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'converted' | 'expired'
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    term_and_conditions: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type SalesQuotationItem = {
    id: string
    quotation_id: string
    product_id: string
    description: string | null
    quantity: number
    unit_price: number
    discount_percentage: number
    tax_percentage: number
    line_total: number
    created_at: string
}

export type SalesQuotationWithDetails = SalesQuotation & {
    customers?: Customer
    sales_quotation_items: (SalesQuotationItem & {
        products: Product
    })[]
}

export type SalesOrder = {
    id: string
    order_number: string
    customer_id: string
    quotation_id: string | null
    order_date: string
    expected_delivery_date: string | null
    status: 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed'
    payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    amount_paid: number
    term_and_conditions: string | null
    delivery_address: string | null
    notes: string | null
    warehouse_id: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type SalesOrderItem = {
    id: string
    order_id: string
    product_id: string
    description: string | null
    quantity: number
    quantity_delivered: number
    unit_price: number
    discount_percentage: number
    tax_percentage: number
    line_total: number
    created_at: string
}

export type SalesOrderWithDetails = SalesOrder & {
    customers?: Customer
    sales_order_items: (SalesOrderItem & {
        products: Product
    })[]
    warehouse?: Location
}

export type DeliveryNote = {
    id: string
    delivery_note_number: string
    sales_order_id: string
    customer_id: string | null
    delivery_date: string
    status: 'draft' | 'shipped' | 'delivered' | 'cancelled'
    vehicle_number: string | null
    tracking_number: string | null
    driver_name: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type DeliveryNoteItem = {
    id: string
    delivery_note_id: string
    sales_order_item_id: string | null
    product_id: string | null
    quantity_delivered: number
    notes: string | null
    created_at: string
}

export type SalesInvoice = {
    id: string
    invoice_number: string
    customer_id: string
    sales_order_id: string | null
    location_id: string | null
    warehouse_id: string | null
    invoice_date: string
    due_date: string
    status: 'draft' | 'posted' | 'paid' | 'void' | 'overdue'
    subtotal: number
    tax_amount: number
    discount_amount: number
    shipping_charges: number
    total_amount: number
    amount_paid: number
    notes: string | null
    journal_entry_id: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type SalesInvoiceItem = {
    id: string
    invoice_id: string
    sales_order_item_id: string | null
    product_id: string | null
    quantity: number
    unit_price: number
    discount_percentage: number
    tax_percentage: number
    line_total: number
    created_at: string
}

export type SalesInvoiceWithDetails = SalesInvoice & {
    customers?: Customer
    sales_invoice_items: (SalesInvoiceItem & {
        products: Product
    })[]
}

export type SalesReturn = {
    id: string
    return_number: string
    customer_id: string | null
    sales_invoice_id: string | null
    return_date: string
    reason: string | null
    status: 'draft' | 'approved' | 'completed' | 'refunded'
    refund_amount: number
    created_by: string | null
    created_at: string
    updated_at: string
}

export type SalesReturnItem = {
    id: string
    return_id: string
    product_id: string | null
    quantity_returned: number
    condition: 'good' | 'damaged' | 'defective' | null
    action: 'restock' | 'discard' | 'repair' | null
    created_at: string
}

export type CreditNote = {
    id: string
    credit_note_number: string
    customer_id: string | null
    sales_return_id: string | null
    credit_date: string
    total_amount: number
    amount_used: number
    status: 'draft' | 'issued' | 'used' | 'void'
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

// ============================================
// ACCOUNTING MODULE TYPES
// ============================================

export type CompanySettings = {
    id: string
    company_name: string
    ntn: string | null
    strn: string | null
    address: string | null
    city: string | null
    phone: string | null
    email: string | null
    logo_url: string | null
    fiscal_year_start_month: number
    current_fiscal_year_id: string | null
    base_currency: string
    created_at: string
    updated_at: string
}

export type FiscalYear = {
    id: string
    year_name: string
    start_date: string
    end_date: string
    is_closed: boolean
    created_at: string
}

export type ChartOfAccounts = {
    id: string
    account_code: string
    account_name: string
    account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'COGS'
    parent_account_id: string | null
    opening_balance: number
    current_balance: number
    is_active: boolean
    is_system_account: boolean
    description: string | null
    created_at: string
    updated_at: string
}

export type TaxRate = {
    id: string
    tax_name: string
    tax_code: string
    tax_type: 'SALES_TAX' | 'WHT' | 'INCOME_TAX'
    rate_percentage: number
    description: string | null
    is_active: boolean
    created_at: string
}

export type BankAccount = {
    id: string
    account_name: string
    bank_name: string
    account_number: string
    iban: string | null
    account_type: 'current' | 'savings'
    opening_balance: number
    current_balance: number
    gl_account_id: string | null
    is_default: boolean
    is_active: boolean
    created_at: string
    updated_at: string
}

export type JournalEntry = {
    id: string
    journal_number: string
    journal_type: 'OPENING' | 'MANUAL' | 'AUTO' | 'ADJUSTMENT' | 'CLOSING' | 'REVERSAL'
    journal_date: string
    fiscal_year_id: string | null
    reference_type: string | null
    reference_id: string | null
    reference_number: string | null
    narration: string | null
    total_debit: number
    total_credit: number
    status: 'draft' | 'posted' | 'cancelled'
    posted_at: string | null
    posted_by: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type JournalEntryLine = {
    id: string
    journal_entry_id: string
    account_id: string
    debit_amount: number
    credit_amount: number
    description: string | null
    created_at: string
}

export type VendorBill = {
    id: string
    bill_number: string
    vendor_id: string
    grn_id: string | null
    bill_date: string
    due_date: string
    reference_number: string | null
    subtotal: number
    tax_amount: number
    wht_amount: number
    total_amount: number
    amount_paid: number
    amount_due: number
    payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
    status: 'draft' | 'approved' | 'posted' | 'goods_received' | 'cancelled'
    journal_entry_id: string | null
    notes: string | null
    created_by: string | null
    approved_by: string | null
    created_at: string
    updated_at: string
}

export type PaymentVoucher = {
    id: string
    voucher_number: string
    vendor_id: string
    payment_date: string
    payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'
    bank_account_id: string | null
    cheque_number: string | null
    amount: number
    wht_amount: number
    net_payment: number
    status: 'draft' | 'posted' | 'cancelled'
    journal_entry_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type CustomerInvoiceAccounting = {
    id: string
    invoice_number: string
    customer_id: string
    sales_order_id: string | null
    location_id: string | null
    warehouse_id: string | null
    invoice_date: string
    due_date: string
    reference_number: string | null
    subtotal: number
    tax_amount: number
    discount_amount: number
    total_amount: number
    amount_received: number
    amount_due: number
    payment_status: 'unpaid' | 'partial' | 'paid' | 'overdue'
    status: 'draft' | 'approved' | 'posted' | 'cancelled'
    journal_entry_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

export type ReceiptVoucher = {
    id: string
    voucher_number: string
    customer_id: string
    receipt_date: string
    payment_method: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER'
    bank_account_id: string | null
    cheque_number: string | null
    amount: number
    status: 'draft' | 'posted' | 'cancelled'
    journal_entry_id: string | null
    notes: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}
