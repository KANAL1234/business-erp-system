'use client'

import { useState } from 'react'
import { Plus, Calendar, CheckCircle, XCircle, Clock, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLeaveRequests, useProcessLeave } from '@/lib/queries/hr'
import { PermissionGuard } from '@/components/permission-guard'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { LeaveRequestDialog } from '@/components/hr/leaves/leave-request-dialog'
import { Skeleton } from '@/components/ui/skeleton'

export default function LeavesPage() {
    const [activeTab, setActiveTab] = useState('pending')
    const { data: requests, isLoading } = useLeaveRequests(
        activeTab === 'all' ? undefined : { status: activeTab.toUpperCase() }
    )
    const processLeave = useProcessLeave()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
        try {
            await processLeave.mutateAsync({ requestId, action })
            toast.success(`Leave request ${action.toLowerCase()}ed`)
        } catch (error) {
            toast.error(`Failed to ${action.toLowerCase()} leave request`)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle className="h-4 w-4 text-green-600" />
            case 'REJECTED':
                return <XCircle className="h-4 w-4 text-destructive" />
            case 'PENDING':
                return <Clock className="h-4 w-4 text-yellow-600" />
            default:
                return null
        }
    }

    return (
        <PermissionGuard permission="hr.leaves.request">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
                        <p className="text-muted-foreground">
                            Track and process employee leave requests.
                        </p>
                    </div>
                    <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Request Leave
                    </Button>
                </div>

                <Tabs defaultValue="pending" onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        <TabsTrigger value="all">All Requests</TabsTrigger>
                    </TabsList>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Request #</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Leave Type</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Days</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        requests?.map((req) => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium">{req.request_number}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{req.employee.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">{req.employee.employee_code}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{req.leave_type.leave_type_name}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        {formatDate(req.from_date)} - {formatDate(req.to_date)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{req.total_days}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(req.status)}
                                                        <span className="text-sm font-medium">{req.status}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {req.status === 'PENDING' && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <PermissionGuard permission="hr.leaves.approve">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-green-600 hover:text-green-700"
                                                                    onClick={() => handleAction(req.id, 'APPROVE')}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-destructive"
                                                                    onClick={() => handleAction(req.id, 'REJECT')}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </PermissionGuard>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {requests?.length === 0 && !isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No leave requests found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Tabs>

                <LeaveRequestDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                />
            </div>
        </PermissionGuard>
    )
}
