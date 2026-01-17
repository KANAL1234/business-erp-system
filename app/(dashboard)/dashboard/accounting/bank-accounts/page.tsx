'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBankAccounts } from '@/lib/queries/bank-accounts'
import { PermissionGuard } from '@/components/permission-guard'
import { Building2, Plus, Star } from 'lucide-react'

export default function BankAccountsPage() {
    return (
        <PermissionGuard permission="accounting.bank_accounts.read">
            <BankAccountsContent />
        </PermissionGuard>
    )
}

function BankAccountsContent() {
    const { data: accounts, isLoading } = useBankAccounts()

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
                    <p className="text-muted-foreground">Manage your business bank accounts</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bank Account
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{accounts?.length || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            PKR {accounts?.reduce((sum, acc) => sum + acc.current_balance, 0).toLocaleString() || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {accounts?.filter(acc => acc.is_active).length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">All Bank Accounts</CardTitle>
                    <CardDescription>View and manage your bank accounts</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Account Number</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Current Balance</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts?.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {account.account_name}
                                            {account.is_default && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                                        </TableCell>
                                        <TableCell>{account.bank_name}</TableCell>
                                        <TableCell className="font-mono">{account.account_number}</TableCell>
                                        <TableCell className="capitalize">{account.account_type}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            PKR {account.current_balance.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {account.is_active ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
