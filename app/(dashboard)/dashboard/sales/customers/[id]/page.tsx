'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCustomer, useCustomerTransactions } from '@/lib/queries/customers'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Receipt, Printer } from 'lucide-react'
import { CustomerProfileCard } from '@/components/customers/customer-profile-card'
import { CustomerLedgerTable } from '@/components/customers/customer-ledger-table'
import { CustomerPaymentDialog } from '@/components/customers/customer-payment-dialog'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { PermissionGuard } from '@/components/permission-guard'

export default function CustomerLedgerPage() {
    const params = useParams()
    const router = useRouter()
    const customerId = params.id as string

    const { data: customer, isLoading: isLoadingCustomer } = useCustomer(customerId)
    const { data: transactions = [], isLoading: isLoadingTx } = useCustomerTransactions(customerId)

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

    if (isLoadingCustomer) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Customer Not Found</h2>
                <p className="text-slate-500 mb-6">The customer you are looking for does not exist or has been removed.</p>
                <Button onClick={() => router.push('/dashboard/sales/customers')}>
                    Back to Customers
                </Button>
            </div>
        )
    }

    return (
        <PermissionGuard permission="sales.customers.read">
            <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
                {/* Header Actions */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-slate-500"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Ledger</h1>
                            <p className="text-sm text-slate-500">Transaction history and financial overview.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Statement
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setIsPaymentDialogOpen(true)}
                        >
                            <Receipt className="mr-2 h-4 w-4" />
                            Receive Payment
                        </Button>
                    </div>
                </div>

                {/* Profile Section */}
                <CustomerProfileCard customer={customer} />

                {/* Ledger Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Statement of Account</h2>
                        <div className="text-xs text-slate-500 font-mono">
                            Showing {transactions.length} entries
                        </div>
                    </div>

                    {isLoadingTx ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <CustomerLedgerTable transactions={transactions} />
                    )}
                </div>

                {/* Dialogs */}
                <CustomerPaymentDialog
                    open={isPaymentDialogOpen}
                    onOpenChange={setIsPaymentDialogOpen}
                    customer={customer}
                />
            </div>
        </PermissionGuard>
    )
}
