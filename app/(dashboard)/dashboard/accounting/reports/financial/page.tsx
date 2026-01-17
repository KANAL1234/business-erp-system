'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const supabase = createClient();

type ReportType = 'profit-loss' | 'balance-sheet' | 'vendor-aging' | 'customer-aging';

interface ProfitLossData {
  revenue: {
    salesRevenue: number;
    serviceRevenue: number;
    otherIncome: number;
    salesReturns: number;
    totalRevenue: number;
  };
  costOfSales: {
    purchases: number;
    purchaseReturns: number;
    directExpenses: number;
    totalCOGS: number;
  };
  grossProfit: number;
  grossProfitMargin: number;
  expenses: {
    selling: number;
    administrative: number;
    financial: number;
    totalExpenses: number;
  };
  netProfit: number;
  netProfitMargin: number;
}

interface BalanceSheetData {
  assets: {
    currentAssets: {
      cash: number;
      bank: number;
      accountsReceivable: number;
      inventory: number;
      other: number;
      total: number;
    };
    fixedAssets: {
      grossValue: number;
      depreciation: number;
      netValue: number;
    };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      taxPayable: number;
      other: number;
      total: number;
    };
    longTermLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    capital: number;
    retainedEarnings: number;
    currentYearProfit: number;
    totalEquity: number;
  };
  totalLiabilitiesEquity: number;
}

interface AgingBucket {
  current: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  over_120: number;
  total: number;
}

interface VendorAgingRow {
  vendor_id: string;
  vendor_name: string;
  vendor_code: string;
  buckets: AgingBucket;
}

interface CustomerAgingRow {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  buckets: AgingBucket;
}

export default function FinancialReports() {
  const [activeReport, setActiveReport] = useState<ReportType>('profit-loss');
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('2025-07-01'); // Pakistan FY start
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Report data
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData | null>(null);
  const [vendorAging, setVendorAging] = useState<VendorAgingRow[]>([]);
  const [customerAging, setCustomerAging] = useState<CustomerAgingRow[]>([]);

  useEffect(() => {
    loadReport();
  }, [activeReport, dateFrom, dateTo]);

  const loadReport = async () => {
    setLoading(true);
    try {
      switch (activeReport) {
        case 'profit-loss':
          await loadProfitLoss();
          break;
        case 'balance-sheet':
          await loadBalanceSheet();
          break;
        case 'vendor-aging':
          await loadVendorAging();
          break;
        case 'customer-aging':
          await loadCustomerAging();
          break;
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitLoss = async () => {
    const { data, error } = await supabase.rpc('get_profit_loss_statement', {
      p_date_from: dateFrom,
      p_date_to: dateTo
    });

    if (error) {
      console.error('RPC Error (Profit Loss):', error);
      throw error;
    }
    setProfitLossData(data);
  };

  const loadBalanceSheet = async () => {
    const { data, error } = await supabase.rpc('get_balance_sheet', {
      p_as_of_date: dateTo
    });

    if (error) throw error;
    setBalanceSheetData(data);
  };

  const loadVendorAging = async () => {
    const { data, error } = await supabase.rpc('get_vendor_aging_report', {
      p_as_of_date: dateTo
    });

    if (error) throw error;
    setVendorAging(data || []);
  };

  const loadCustomerAging = async () => {
    const { data, error } = await supabase.rpc('get_customer_aging_report', {
      p_as_of_date: dateTo
    });

    if (error) throw error;
    setCustomerAging(data || []);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    let ws: any;
    let filename = '';

    switch (activeReport) {
      case 'profit-loss':
        if (!profitLossData) return;
        ws = XLSX.utils.json_to_sheet([
          { Section: 'REVENUE', Amount: '' },
          { Section: 'Sales Revenue', Amount: profitLossData.revenue.salesRevenue },
          { Section: 'Service Revenue', Amount: profitLossData.revenue.serviceRevenue },
          { Section: 'Other Income', Amount: profitLossData.revenue.otherIncome },
          { Section: 'Less: Sales Returns', Amount: -profitLossData.revenue.salesReturns },
          { Section: 'Total Revenue', Amount: profitLossData.revenue.totalRevenue },
          { Section: '', Amount: '' },
          { Section: 'COST OF SALES', Amount: '' },
          { Section: 'Purchases', Amount: profitLossData.costOfSales.purchases },
          { Section: 'Less: Purchase Returns', Amount: -profitLossData.costOfSales.purchaseReturns },
          { Section: 'Direct Expenses', Amount: profitLossData.costOfSales.directExpenses },
          { Section: 'Total Cost of Sales', Amount: profitLossData.costOfSales.totalCOGS },
          { Section: '', Amount: '' },
          { Section: 'GROSS PROFIT', Amount: profitLossData.grossProfit },
          { Section: '', Amount: '' },
          { Section: 'EXPENSES', Amount: '' },
          { Section: 'Selling Expenses', Amount: profitLossData.expenses.selling },
          { Section: 'Administrative Expenses', Amount: profitLossData.expenses.administrative },
          { Section: 'Financial Expenses', Amount: profitLossData.expenses.financial },
          { Section: 'Total Expenses', Amount: profitLossData.expenses.totalExpenses },
          { Section: '', Amount: '' },
          { Section: 'NET PROFIT', Amount: profitLossData.netProfit }
        ]);
        filename = `Profit_Loss_${dateFrom}_to_${dateTo}.xlsx`;
        break;

      case 'balance-sheet':
        if (!balanceSheetData) return;
        ws = XLSX.utils.json_to_sheet([
          { Section: 'ASSETS', Amount: '' },
          { Section: 'Current Assets', Amount: '' },
          { Section: '  Cash & Bank', Amount: balanceSheetData.assets.currentAssets.cash + balanceSheetData.assets.currentAssets.bank },
          { Section: '  Accounts Receivable', Amount: balanceSheetData.assets.currentAssets.accountsReceivable },
          { Section: '  Inventory', Amount: balanceSheetData.assets.currentAssets.inventory },
          { Section: '  Other Current Assets', Amount: balanceSheetData.assets.currentAssets.other },
          { Section: 'Total Current Assets', Amount: balanceSheetData.assets.currentAssets.total },
          { Section: '', Amount: '' },
          { Section: 'Fixed Assets (Net)', Amount: balanceSheetData.assets.fixedAssets.netValue },
          { Section: '', Amount: '' },
          { Section: 'TOTAL ASSETS', Amount: balanceSheetData.assets.totalAssets },
          { Section: '', Amount: '' },
          { Section: 'LIABILITIES', Amount: '' },
          { Section: 'Current Liabilities', Amount: balanceSheetData.liabilities.currentLiabilities.total },
          { Section: 'Long-term Liabilities', Amount: balanceSheetData.liabilities.longTermLiabilities },
          { Section: 'Total Liabilities', Amount: balanceSheetData.liabilities.totalLiabilities },
          { Section: '', Amount: '' },
          { Section: 'EQUITY', Amount: '' },
          { Section: 'Capital', Amount: balanceSheetData.equity.capital },
          { Section: 'Retained Earnings', Amount: balanceSheetData.equity.retainedEarnings },
          { Section: 'Current Year Profit', Amount: balanceSheetData.equity.currentYearProfit },
          { Section: 'Total Equity', Amount: balanceSheetData.equity.totalEquity },
          { Section: '', Amount: '' },
          { Section: 'TOTAL LIABILITIES + EQUITY', Amount: balanceSheetData.totalLiabilitiesEquity }
        ]);
        filename = `Balance_Sheet_${dateTo}.xlsx`;
        break;

      case 'vendor-aging':
        ws = XLSX.utils.json_to_sheet(vendorAging.map(v => ({
          'Vendor Code': v.vendor_code,
          'Vendor Name': v.vendor_name,
          'Current (0-30)': v.buckets.current,
          '31-60 Days': v.buckets.days_31_60,
          '61-90 Days': v.buckets.days_61_90,
          '91-120 Days': v.buckets.days_91_120,
          'Over 120 Days': v.buckets.over_120,
          'Total Outstanding': v.buckets.total
        })));
        filename = `Vendor_Aging_${dateTo}.xlsx`;
        break;

      case 'customer-aging':
        ws = XLSX.utils.json_to_sheet(customerAging.map(c => ({
          'Customer Code': c.customer_code,
          'Customer Name': c.customer_name,
          'Current (0-30)': c.buckets.current,
          '31-60 Days': c.buckets.days_31_60,
          '61-90 Days': c.buckets.days_61_90,
          '91-120 Days': c.buckets.days_91_120,
          'Over 120 Days': c.buckets.over_120,
          'Total Outstanding': c.buckets.total
        })));
        filename = `Customer_Aging_${dateTo}.xlsx`;
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
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Pakistan FBR Compliant Reports</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Export to Excel
        </button>
      </div>

      {/* Report Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp },
            { id: 'balance-sheet', label: 'Balance Sheet', icon: FileText },
            { id: 'vendor-aging', label: 'Vendor Aging', icon: DollarSign },
            { id: 'customer-aging', label: 'Customer Aging', icon: DollarSign }
          ].map(report => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id as ReportType)}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${activeReport === report.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
            >
              <report.icon className="w-5 h-5" />
              {report.label}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            {activeReport === 'balance-sheet' ? (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">As of Date:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40"
                />
              </div>
            ) : (
              <>
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
              </>
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

        {/* Report Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading report...</p>
            </div>
          ) : (
            <>
              {activeReport === 'profit-loss' && profitLossData && (
                <ProfitLossReport data={profitLossData} formatCurrency={formatCurrency} />
              )}
              {activeReport === 'balance-sheet' && balanceSheetData && (
                <BalanceSheetReport data={balanceSheetData} formatCurrency={formatCurrency} />
              )}
              {activeReport === 'vendor-aging' && (
                <VendorAgingReport data={vendorAging} formatCurrency={formatCurrency} />
              )}
              {activeReport === 'customer-aging' && (
                <CustomerAgingReport data={customerAging} formatCurrency={formatCurrency} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Profit & Loss Component
function ProfitLossReport({ data, formatCurrency }: { data: ProfitLossData; formatCurrency: (n: number) => string }) {
  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">PROFIT & LOSS STATEMENT</h2>
        <p className="text-sm text-gray-600 mt-1">For the Period Ended</p>
      </div>

      {/* Revenue */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-3">REVENUE</h3>
        <div className="space-y-2 ml-4">
          <div className="flex justify-between">
            <span className="text-gray-700">Sales Revenue</span>
            <span className="font-medium">{formatCurrency(data.revenue.salesRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Service Revenue</span>
            <span className="font-medium">{formatCurrency(data.revenue.serviceRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Other Income</span>
            <span className="font-medium">{formatCurrency(data.revenue.otherIncome)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Less: Sales Returns</span>
            <span className="font-medium">({formatCurrency(data.revenue.salesReturns)})</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total Revenue</span>
            <span>{formatCurrency(data.revenue.totalRevenue)}</span>
          </div>
        </div>
      </section>

      {/* Cost of Sales */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-3">COST OF SALES</h3>
        <div className="space-y-2 ml-4">
          <div className="flex justify-between">
            <span className="text-gray-700">Purchases</span>
            <span className="font-medium">{formatCurrency(data.costOfSales.purchases)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Less: Purchase Returns</span>
            <span className="font-medium">({formatCurrency(data.costOfSales.purchaseReturns)})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Direct Expenses</span>
            <span className="font-medium">{formatCurrency(data.costOfSales.directExpenses)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total Cost of Sales</span>
            <span>{formatCurrency(data.costOfSales.totalCOGS)}</span>
          </div>
        </div>
      </section>

      {/* Gross Profit */}
      <div className="bg-primary/5 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-bold text-gray-900">GROSS PROFIT</span>
            <span className="ml-3 text-sm text-gray-600">
              ({data.grossProfitMargin.toFixed(2)}% margin)
            </span>
          </div>
          <span className={`text-xl font-bold ${data.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.grossProfit)}
          </span>
        </div>
      </div>

      {/* Expenses */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-3">EXPENSES</h3>
        <div className="space-y-2 ml-4">
          <div className="flex justify-between">
            <span className="text-gray-700">Selling & Distribution Expenses</span>
            <span className="font-medium">{formatCurrency(data.expenses.selling)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Administrative Expenses</span>
            <span className="font-medium">{formatCurrency(data.expenses.administrative)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Financial Expenses</span>
            <span className="font-medium">{formatCurrency(data.expenses.financial)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total Expenses</span>
            <span>{formatCurrency(data.expenses.totalExpenses)}</span>
          </div>
        </div>
      </section>

      {/* Net Profit */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-2xl font-bold text-gray-900">NET PROFIT</span>
            <span className="ml-3 text-sm text-gray-600">
              ({data.netProfitMargin.toFixed(2)}% margin)
            </span>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.netProfit)}
            </div>
            {data.netProfit >= 0 ? (
              <TrendingUp className="w-6 h-6 text-green-600 ml-auto mt-1" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600 ml-auto mt-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Balance Sheet Component
function BalanceSheetReport({ data, formatCurrency }: { data: BalanceSheetData; formatCurrency: (n: number) => string }) {
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Assets Side */}
      <div className="space-y-6">
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold text-gray-900">ASSETS</h2>
        </div>

        {/* Current Assets */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Current Assets</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span className="text-gray-700">Cash in Hand</span>
              <span className="font-medium">{formatCurrency(data.assets.currentAssets.cash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Bank Accounts</span>
              <span className="font-medium">{formatCurrency(data.assets.currentAssets.bank)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Accounts Receivable</span>
              <span className="font-medium">{formatCurrency(data.assets.currentAssets.accountsReceivable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Inventory</span>
              <span className="font-medium">{formatCurrency(data.assets.currentAssets.inventory)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Other Current Assets</span>
              <span className="font-medium">{formatCurrency(data.assets.currentAssets.other)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total Current Assets</span>
              <span>{formatCurrency(data.assets.currentAssets.total)}</span>
            </div>
          </div>
        </section>

        {/* Fixed Assets */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Fixed Assets</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span className="text-gray-700">Fixed Assets (Gross)</span>
              <span className="font-medium">{formatCurrency(data.assets.fixedAssets.grossValue)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Less: Accumulated Depreciation</span>
              <span className="font-medium">({formatCurrency(data.assets.fixedAssets.depreciation)})</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Net Fixed Assets</span>
              <span>{formatCurrency(data.assets.fixedAssets.netValue)}</span>
            </div>
          </div>
        </section>

        {/* Total Assets */}
        <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
          <div className="flex justify-between">
            <span className="text-xl font-bold text-gray-900">TOTAL ASSETS</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(data.assets.totalAssets)}
            </span>
          </div>
        </div>
      </div>

      {/* Liabilities & Equity Side */}
      <div className="space-y-6">
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold text-gray-900">LIABILITIES & EQUITY</h2>
        </div>

        {/* Liabilities */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Liabilities</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span className="text-gray-700">Accounts Payable</span>
              <span className="font-medium">{formatCurrency(data.liabilities.currentLiabilities.accountsPayable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Tax Payable</span>
              <span className="font-medium">{formatCurrency(data.liabilities.currentLiabilities.taxPayable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Other Current Liabilities</span>
              <span className="font-medium">{formatCurrency(data.liabilities.currentLiabilities.other)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total Current Liabilities</span>
              <span>{formatCurrency(data.liabilities.currentLiabilities.total)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-700">Long-term Liabilities</span>
              <span className="font-medium">{formatCurrency(data.liabilities.longTermLiabilities)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total Liabilities</span>
              <span>{formatCurrency(data.liabilities.totalLiabilities)}</span>
            </div>
          </div>
        </section>

        {/* Equity */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Equity</h3>
          <div className="space-y-2 ml-4">
            <div className="flex justify-between">
              <span className="text-gray-700">Owner's Capital</span>
              <span className="font-medium">{formatCurrency(data.equity.capital)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Retained Earnings</span>
              <span className="font-medium">{formatCurrency(data.equity.retainedEarnings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Current Year Profit</span>
              <span className={`font-medium ${data.equity.currentYearProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.equity.currentYearProfit)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>Total Equity</span>
              <span>{formatCurrency(data.equity.totalEquity)}</span>
            </div>
          </div>
        </section>

        {/* Total Liabilities & Equity */}
        <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
          <div className="flex justify-between">
            <span className="text-xl font-bold text-gray-900">TOTAL LIABILITIES + EQUITY</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(data.totalLiabilitiesEquity)}
            </span>
          </div>
        </div>

        {/* Balance Verification */}
        {Math.abs(data.assets.totalAssets - data.totalLiabilitiesEquity) < 1 ? (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
            <span className="text-green-700 font-medium">✓ Balance Sheet is Balanced</span>
          </div>
        ) : (
          <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
            <span className="text-red-700 font-medium">
              ⚠ Difference: {formatCurrency(Math.abs(data.assets.totalAssets - data.totalLiabilitiesEquity))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Vendor Aging Component
function VendorAgingReport({ data, formatCurrency }: { data: VendorAgingRow[]; formatCurrency: (n: number) => string }) {
  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + row.buckets.current,
      days_31_60: acc.days_31_60 + row.buckets.days_31_60,
      days_61_90: acc.days_61_90 + row.buckets.days_61_90,
      days_91_120: acc.days_91_120 + row.buckets.days_91_120,
      over_120: acc.over_120 + row.buckets.over_120,
      total: acc.total + row.buckets.total
    }),
    { current: 0, days_31_60: 0, days_61_90: 0, days_91_120: 0, over_120: 0, total: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">VENDOR AGING REPORT</h2>
        <p className="text-sm text-gray-600 mt-1">Accounts Payable by Age</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current<br />(0-30)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">91-120<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-red-50">Over 120<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-primary/5">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.vendor_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.vendor_name}</div>
                  <div className="text-sm text-gray-500">{row.vendor_code}</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(row.buckets.current)}</td>
                <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(row.buckets.days_31_60)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.buckets.days_61_90)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.buckets.days_91_120)}</td>
                <td className="px-4 py-3 text-right text-red-700 font-medium bg-red-50">{formatCurrency(row.buckets.over_120)}</td>
                <td className="px-4 py-3 text-right font-bold text-primary bg-primary/5">{formatCurrency(row.buckets.total)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-3 text-gray-900">TOTAL</td>
              <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.current)}</td>
              <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(totals.days_31_60)}</td>
              <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totals.days_61_90)}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totals.days_91_120)}</td>
              <td className="px-4 py-3 text-right text-red-700 bg-red-100">{formatCurrency(totals.over_120)}</td>
              <td className="px-4 py-3 text-right text-primary bg-primary/10">{formatCurrency(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Customer Aging Component (similar to Vendor Aging)
function CustomerAgingReport({ data, formatCurrency }: { data: CustomerAgingRow[]; formatCurrency: (n: number) => string }) {
  const totals = data.reduce(
    (acc, row) => ({
      current: acc.current + row.buckets.current,
      days_31_60: acc.days_31_60 + row.buckets.days_31_60,
      days_61_90: acc.days_61_90 + row.buckets.days_61_90,
      days_91_120: acc.days_91_120 + row.buckets.days_91_120,
      over_120: acc.over_120 + row.buckets.over_120,
      total: acc.total + row.buckets.total
    }),
    { current: 0, days_31_60: 0, days_61_90: 0, days_91_120: 0, over_120: 0, total: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">CUSTOMER AGING REPORT</h2>
        <p className="text-sm text-gray-600 mt-1">Accounts Receivable by Age</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current<br />(0-30)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">31-60<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">61-90<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">91-120<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-red-50">Over 120<br />Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase bg-primary/5">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.customer_id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.customer_name}</div>
                  <div className="text-sm text-gray-500">{row.customer_code}</div>
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(row.buckets.current)}</td>
                <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(row.buckets.days_31_60)}</td>
                <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.buckets.days_61_90)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.buckets.days_91_120)}</td>
                <td className="px-4 py-3 text-right text-red-700 font-medium bg-red-50">{formatCurrency(row.buckets.over_120)}</td>
                <td className="px-4 py-3 text-right font-bold text-primary bg-primary/5">{formatCurrency(row.buckets.total)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-3 text-gray-900">TOTAL</td>
              <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(totals.current)}</td>
              <td className="px-4 py-3 text-right text-yellow-600">{formatCurrency(totals.days_31_60)}</td>
              <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(totals.days_61_90)}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(totals.days_91_120)}</td>
              <td className="px-4 py-3 text-right text-red-700 bg-red-100">{formatCurrency(totals.over_120)}</td>
              <td className="px-4 py-3 text-right text-primary bg-primary/10">{formatCurrency(totals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
