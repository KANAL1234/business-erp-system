'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, TrendingUp, Users, Package, DollarSign, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useLocation } from '@/components/providers/location-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const supabase = createClient();

type RegisterType = 'sales' | 'purchase' | 'sales-by-product' | 'sales-by-customer' | 'purchase-by-vendor';

export default function TransactionRegisters() {
    const [activeRegister, setActiveRegister] = useState<RegisterType>('sales');
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]); // First day of month
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const { allowedLocationIds, currentLocationId } = useLocation();

    // Filters
    const [customerFilter, setCustomerFilter] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');
    // locationFilter replaced by global currentLocationId

    // Data
    const [salesRegister, setSalesRegister] = useState<any[]>([]);
    const [purchaseRegister, setPurchaseRegister] = useState<any[]>([]);
    const [salesByProduct, setSalesByProduct] = useState<any[]>([]);
    const [salesByCustomer, setSalesByCustomer] = useState<any[]>([]);
    const [purchaseByVendor, setPurchaseByVendor] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);

    // Dropdowns
    const [customers, setCustomers] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    useEffect(() => {
        loadDropdowns();
    }, []);

    useEffect(() => {
        loadReport();
    }, [activeRegister, dateFrom, dateTo, customerFilter, vendorFilter, currentLocationId]);

    const loadDropdowns = async () => {
        const [customersRes, vendorsRes, locationsRes] = await Promise.all([
            supabase.from('customers').select('id, customer_code, name').eq('is_active', true).order('name'),
            supabase.from('vendors').select('id, vendor_code, name').eq('is_active', true).order('name'),
            supabase.from('locations').select('id, location_code, name').order('name')
        ]);

        if (customersRes.data) setCustomers(customersRes.data);
        if (vendorsRes.data) setVendors(vendorsRes.data);
        // Filter locations by LBAC
        if (locationsRes.data) {
            setLocations(locationsRes.data.filter(loc => allowedLocationIds.includes(loc.id)));
        }
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            switch (activeRegister) {
                case 'sales':
                    await loadSalesRegister();
                    break;
                case 'purchase':
                    await loadPurchaseRegister();
                    break;
                case 'sales-by-product':
                    await loadSalesByProduct();
                    break;
                case 'sales-by-customer':
                    await loadSalesByCustomer();
                    break;
                case 'purchase-by-vendor':
                    await loadPurchaseByVendor();
                    break;
            }
        } catch (error) {
            console.error('Error loading report:', error);
            toast.error('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const loadSalesRegister = async () => {
        const { data: registerData, error: registerError } = await supabase.rpc('get_sales_register', {
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_customer_id: customerFilter || null,
            p_location_id: (!currentLocationId || currentLocationId === '') ? null : currentLocationId
        });

        const { data: summaryData, error: summaryError } = await supabase.rpc('get_sales_register_summary', {
            p_date_from: dateFrom,
            p_date_to: dateTo
        });

        if (registerError) throw registerError;
        if (summaryError) throw summaryError;

        setSalesRegister(registerData || []);
        setSummary(summaryData);
    };

    const loadPurchaseRegister = async () => {
        const { data: registerData, error: registerError } = await supabase.rpc('get_purchase_register', {
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_vendor_id: vendorFilter || null
        });

        const { data: summaryData, error: summaryError } = await supabase.rpc('get_purchase_register_summary', {
            p_date_from: dateFrom,
            p_date_to: dateTo
        });

        if (registerError) throw registerError;
        if (summaryError) throw summaryError;

        setPurchaseRegister(registerData || []);
        setSummary(summaryData);
    };

    const loadSalesByProduct = async () => {
        const { data, error } = await supabase.rpc('get_sales_by_product', {
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_limit: 50
        });

        if (error) throw error;
        setSalesByProduct(data || []);
    };

    const loadSalesByCustomer = async () => {
        const { data, error } = await supabase.rpc('get_sales_by_customer', {
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_limit: 50
        });

        if (error) throw error;
        setSalesByCustomer(data || []);
    };

    const loadPurchaseByVendor = async () => {
        const { data, error } = await supabase.rpc('get_purchase_by_vendor', {
            p_date_from: dateFrom,
            p_date_to: dateTo,
            p_limit: 50
        });

        if (error) throw error;
        setPurchaseByVendor(data || []);
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        let ws: any;
        let filename = '';

        switch (activeRegister) {
            case 'sales':
                ws = XLSX.utils.json_to_sheet(salesRegister.map(r => ({
                    'Date': r.sale_date,
                    'Invoice #': r.invoice_number,
                    'Customer': r.customer_name,
                    'Type': r.sale_type,
                    'Payment': r.payment_method,
                    'Subtotal': r.subtotal,
                    'Discount': r.discount_amount,
                    'Tax': r.tax_amount,
                    'Total': r.total_amount,
                    'Paid': r.amount_paid,
                    'Due': r.amount_due,
                    'Status': r.payment_status
                })));
                filename = `Sales_Register_${dateFrom}_to_${dateTo}.xlsx`;
                break;

            case 'purchase':
                ws = XLSX.utils.json_to_sheet(purchaseRegister.map(r => ({
                    'Date': r.bill_date,
                    'Bill #': r.bill_number,
                    'Vendor': r.vendor_name,
                    'PO #': r.po_number,
                    'Subtotal': r.subtotal,
                    'Tax': r.sales_tax_amount,
                    'WHT': r.wht_amount,
                    'Total': r.total_amount,
                    'Paid': r.amount_paid,
                    'Due': r.amount_due,
                    'Status': r.payment_status
                })));
                filename = `Purchase_Register_${dateFrom}_to_${dateTo}.xlsx`;
                break;

            case 'sales-by-product':
                ws = XLSX.utils.json_to_sheet(salesByProduct.map(r => ({
                    'SKU': r.product_sku,
                    'Product': r.product_name,
                    'Quantity': r.total_quantity,
                    'Sales': r.total_sales,
                    'Transactions': r.transaction_count,
                    'Avg Price': r.avg_price
                })));
                filename = `Sales_By_Product_${dateFrom}_to_${dateTo}.xlsx`;
                break;

            case 'sales-by-customer':
                ws = XLSX.utils.json_to_sheet(salesByCustomer.map(r => ({
                    'Code': r.customer_code,
                    'Customer': r.customer_name,
                    'Sales': r.total_sales,
                    'Paid': r.total_paid,
                    'Outstanding': r.outstanding,
                    'Transactions': r.transaction_count
                })));
                filename = `Sales_By_Customer_${dateFrom}_to_${dateTo}.xlsx`;
                break;

            case 'purchase-by-vendor':
                ws = XLSX.utils.json_to_sheet(purchaseByVendor.map(r => ({
                    'Code': r.vendor_code,
                    'Vendor': r.vendor_name,
                    'Purchases': r.total_purchases,
                    'Paid': r.total_paid,
                    'Outstanding': r.outstanding,
                    'Bills': r.bill_count
                })));
                filename = `Purchase_By_Vendor_${dateFrom}_to_${dateTo}.xlsx`;
                break;
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        XLSX.writeFile(wb, filename);
        toast.success('Report exported successfully!');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transaction Registers</h1>
                    <p className="text-sm text-gray-600 mt-1">Detailed sales and purchase reports</p>
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    <Download className="w-4 h-4" />
                    Export to Excel
                </button>
            </div>

            {/* Register Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {[
                        { id: 'sales', label: 'Sales Register', icon: FileText },
                        { id: 'purchase', label: 'Purchase Register', icon: FileText },
                        { id: 'sales-by-product', label: 'Sales by Product', icon: Package },
                        { id: 'sales-by-customer', label: 'Sales by Customer', icon: Users },
                        { id: 'purchase-by-vendor', label: 'Purchase by Vendor', icon: Users }
                    ].map(register => (
                        <button
                            key={register.id}
                            onClick={() => setActiveRegister(register.id as RegisterType)}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${activeRegister === register.id
                                ? 'text-primary border-b-2 border-primary bg-primary/5'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <register.icon className="w-5 h-5" />
                            {register.label}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <Calendar className="w-5 h-5 text-gray-400" />

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">From:</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">To:</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40"
                            />
                        </div>

                        {(activeRegister === 'sales') && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={customerFilter}
                                        onChange={(e) => setCustomerFilter(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40"
                                    >
                                        <option value="">All Customers</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>


                            </>
                        )}

                        {activeRegister === 'purchase' && (
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    value={vendorFilter}
                                    onChange={(e) => setVendorFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={loadReport}
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Generate'}
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                {summary && (activeRegister === 'sales' || activeRegister === 'purchase') && (
                    <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {activeRegister === 'sales' ? (
                                <>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Gross Sales</div>
                                        <div className="text-xl font-bold text-gray-900 mt-1">
                                            {formatCurrency(summary.totals?.gross_sales || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Cash Sales</div>
                                        <div className="text-xl font-bold text-green-600 mt-1">
                                            {formatCurrency(summary.totals?.cash_sales || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Credit Sales</div>
                                        <div className="text-xl font-bold text-orange-600 mt-1">
                                            {formatCurrency(summary.totals?.credit_sales || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Transactions</div>
                                        <div className="text-xl font-bold text-primary mt-1">
                                            {summary.counts?.total_transactions || 0}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Gross Purchases</div>
                                        <div className="text-xl font-bold text-gray-900 mt-1">
                                            {formatCurrency(summary.totals?.gross_purchases || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Input Tax</div>
                                        <div className="text-xl font-bold text-primary mt-1">
                                            {formatCurrency(summary.totals?.input_tax || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">WHT Deducted</div>
                                        <div className="text-xl font-bold text-green-600 mt-1">
                                            {formatCurrency(summary.totals?.wht_deducted || 0)}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg shadow-sm">
                                        <div className="text-sm text-gray-600">Total Bills</div>
                                        <div className="text-xl font-bold text-orange-600 mt-1">
                                            {summary.counts?.total_bills || 0}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Report Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <p className="mt-4 text-gray-600">Loading report...</p>
                        </div>
                    ) : (
                        <>
                            {activeRegister === 'sales' && <SalesRegisterTable data={salesRegister} formatCurrency={formatCurrency} />}
                            {activeRegister === 'purchase' && <PurchaseRegisterTable data={purchaseRegister} formatCurrency={formatCurrency} />}
                            {activeRegister === 'sales-by-product' && <SalesByProductTable data={salesByProduct} formatCurrency={formatCurrency} />}
                            {activeRegister === 'sales-by-customer' && <SalesByCustomerTable data={salesByCustomer} formatCurrency={formatCurrency} />}
                            {activeRegister === 'purchase-by-vendor' && <PurchaseByVendorTable data={purchaseByVendor} formatCurrency={formatCurrency} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sales Register Table
function SalesRegisterTable({ data, formatCurrency }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                            No sales register entries found.
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell className="text-gray-900">{row.sale_date}</TableCell>
                            <TableCell className="font-medium text-primary">{row.invoice_number}</TableCell>
                            <TableCell className="text-gray-900">{row.customer_name}</TableCell>
                            <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.sale_type === 'POS' ? 'bg-green-100 text-green-800' : 'bg-primary/10 text-primary'
                                    }`}>
                                    {row.sale_type}
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-gray-900">{formatCurrency(row.subtotal)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(row.discount_amount)}</TableCell>
                            <TableCell className="text-right text-gray-900">{formatCurrency(row.tax_amount)}</TableCell>
                            <TableCell className="text-right font-medium text-gray-900">{formatCurrency(row.total_amount)}</TableCell>
                            <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                    row.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {row.payment_status}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

// Purchase Register Table
function PurchaseRegisterTable({ data, formatCurrency }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>PO #</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">WHT</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                            No purchase register entries found.
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell className="text-gray-900">{row.bill_date}</TableCell>
                            <TableCell className="font-medium text-primary">{row.bill_number}</TableCell>
                            <TableCell className="text-gray-900">{row.vendor_name}</TableCell>
                            <TableCell className="text-gray-500">{row.po_number}</TableCell>
                            <TableCell className="text-right text-gray-900">{formatCurrency(row.subtotal)}</TableCell>
                            <TableCell className="text-right text-primary">{formatCurrency(row.sales_tax_amount)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(row.wht_amount)}</TableCell>
                            <TableCell className="text-right font-medium text-gray-900">{formatCurrency(row.total_amount)}</TableCell>
                            <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                    row.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {row.payment_status}
                                </span>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

// Sales by Product Table
function SalesByProductTable({ data, formatCurrency }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No product sales found.
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium text-gray-900">#{idx + 1}</TableCell>
                            <TableCell className="text-gray-600">{row.product_sku}</TableCell>
                            <TableCell className="text-gray-900">{row.product_name}</TableCell>
                            <TableCell className="text-right text-gray-900">{row.total_quantity}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{formatCurrency(row.total_sales)}</TableCell>
                            <TableCell className="text-right text-gray-900">{formatCurrency(row.avg_price)}</TableCell>
                            <TableCell className="text-center text-primary">{row.transaction_count}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

// Sales by Customer Table
function SalesByCustomerTable({ data, formatCurrency }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No customer sales found.
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium text-gray-900">#{idx + 1}</TableCell>
                            <TableCell className="text-gray-600">{row.customer_code}</TableCell>
                            <TableCell className="text-gray-900">{row.customer_name}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{formatCurrency(row.total_sales)}</TableCell>
                            <TableCell className="text-right text-gray-900">{formatCurrency(row.total_paid)}</TableCell>
                            <TableCell className="text-right text-orange-600">{formatCurrency(row.outstanding)}</TableCell>
                            <TableCell className="text-center text-primary">{row.transaction_count}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

// Purchase by Vendor Table
function PurchaseByVendorTable({ data, formatCurrency }: any) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Total Purchases</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Bills</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No vendor purchases found.
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium text-gray-900">#{idx + 1}</TableCell>
                            <TableCell className="text-gray-600">{row.vendor_code}</TableCell>
                            <TableCell className="text-gray-900">{row.vendor_name}</TableCell>
                            <TableCell className="text-right font-medium text-primary">{formatCurrency(row.total_purchases)}</TableCell>
                            <TableCell className="text-right text-gray-900">{formatCurrency(row.total_paid)}</TableCell>
                            <TableCell className="text-right text-orange-600">{formatCurrency(row.outstanding)}</TableCell>
                            <TableCell className="text-center text-primary">{row.bill_count}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
