'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomersTable } from '@/components/customers/customers-table'
import { CustomerDialog } from '@/components/customers/customer-dialog'
import { useCustomers } from '@/lib/queries/customers'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ListSortControls } from '@/components/list-sort-controls'

export default function CustomersPage() {
    return (
        <PermissionGuard permission="sales.customers.read">
            <CustomersContent />
        </PermissionGuard>
    )
}

function CustomersContent() {
    const [searchQuery, setSearchQuery] = useState('')
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const { data: customers = [], isLoading } = useCustomers()

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.customer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
    )

    const sortedCustomers = useMemo(() => {
        const data = filteredCustomers ? [...filteredCustomers] : []
        const sorters: Record<string, (row: any) => string | number> = {
            created_at: (row) => new Date(row.created_at).getTime(),
            name: (row) => String(row.name || ''),
            code: (row) => String(row.customer_code || ''),
            balance: (row) => Number(row.current_balance || 0),
            credit_limit: (row) => Number(row.credit_limit || 0),
            status: (row) => row.is_active ? 1 : 0,
        }
        const getValue = sorters[sortBy] || sorters.created_at
        data.sort((a, b) => {
            const av = getValue(a)
            const bv = getValue(b)
            if (av < bv) return sortOrder === 'asc' ? -1 : 1
            if (av > bv) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
        return data
    }, [filteredCustomers, sortBy, sortOrder])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground">Manage your customer database and credit limits.</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Customer
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Customer List</CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative w-full sm:w-[250px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <ListSortControls
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSortByChange={setSortBy}
                            onSortOrderChange={setSortOrder}
                            options={[
                                { value: 'created_at', label: 'Date Added' },
                                { value: 'name', label: 'Customer Name' },
                                { value: 'code', label: 'Customer Code' },
                                { value: 'balance', label: 'Balance' },
                                { value: 'credit_limit', label: 'Credit Limit' },
                                { value: 'status', label: 'Status' },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <CustomersTable
                        customers={sortedCustomers}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>

            <CustomerDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
            />
        </div>
    )
}
