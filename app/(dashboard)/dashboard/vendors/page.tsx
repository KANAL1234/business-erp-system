'use client'

import { useVendors } from '@/lib/queries/vendors'
import { PermissionGuard } from '@/components/permission-guard'
import { VendorsTable } from '@/components/vendors/vendors-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function VendorsPage() {
    return (
        <PermissionGuard permission="procurement.vendors.read">
            <VendorsContent />
        </PermissionGuard>
    )
}

function VendorsContent() {
    const { data: vendors, isLoading } = useVendors()
    const [searchQuery, setSearchQuery] = useState('')

    const filteredVendors = (vendors || []).filter((vendor: any) => {
        const query = searchQuery.toLowerCase()
        if (!query) return true
        return vendor.name?.toLowerCase().includes(query) ||
            vendor.code?.toLowerCase().includes(query) ||
            vendor.contact_person?.toLowerCase().includes(query) ||
            vendor.email?.toLowerCase().includes(query) ||
            vendor.phone?.toLowerCase().includes(query)
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
                    <p className="text-muted-foreground">Manage your supplier relationships</p>
                </div>
                <Link href="/dashboard/vendors/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vendor
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Vendor List</CardTitle>
                    <div className="relative w-full sm:w-[250px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vendors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <VendorsTable vendors={filteredVendors} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    )
}
