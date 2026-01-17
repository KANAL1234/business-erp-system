'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PermissionGuard } from '@/components/permission-guard'
import { EmployeesTable } from '@/components/hr/employees/employees-table'
import { EmployeeDialog } from '../../../../../components/hr/employees/employee-dialog'

export default function EmployeesPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <PermissionGuard permission="hr.employees.read">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Employee Master</h1>
                        <p className="text-muted-foreground">
                            Manage your workforce, departments, and payroll settings.
                        </p>
                    </div>
                    <PermissionGuard permission="hr.employees.create">
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Employee
                        </Button>
                    </PermissionGuard>
                </div>

                <Card>
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4">
                        <CardTitle className="text-base font-medium">Employee List</CardTitle>
                        <div className="relative w-full sm:w-[250px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employees..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <EmployeesTable searchQuery={searchQuery} />
                    </CardContent>
                </Card>

                <EmployeeDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                />
            </div>
        </PermissionGuard>
    )
}
