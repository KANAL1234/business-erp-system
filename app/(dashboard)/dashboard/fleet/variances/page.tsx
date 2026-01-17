'use client'

import { useState } from 'react'
import { useExpenseVariances, useVarianceDashboard, useResolveVariance, useEscalateVariance } from '@/lib/queries/fleet-workflow'
import { PermissionGuard } from '@/components/permission-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, TrendingUp, TrendingDown, Fuel, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

export default function VarianceDashboardPage() {
    return (
        <PermissionGuard permission="fleet:variances:view">
            <VarianceDashboardContent />
        </PermissionGuard>
    )
}

function VarianceDashboardContent() {
    const [selectedVariance, setSelectedVariance] = useState<any>(null)
    const [resolutionNotes, setResolutionNotes] = useState('')
    const [userId, setUserId] = useState<string>('')

    const { data: dashboard } = useVarianceDashboard()
    const { data: allVariances } = useExpenseVariances()
    const { data: alertVariances } = useExpenseVariances({ alertsOnly: true })
    const { data: openVariances } = useExpenseVariances({ status: 'OPEN' })

    const resolveVariance = useResolveVariance()
    const escalateVariance = useEscalateVariance()

    useState(() => {
        const getUser = async () => {
            const supabase = createClient()
            const { data } = await supabase.auth.getUser()
            if (data.user) {
                setUserId(data.user.id)
            }
        }
        getUser()
    })

    const getVarianceIcon = (type: string) => {
        switch (type) {
            case 'FUEL':
                return <Fuel className="h-4 w-4" />
            case 'CASH':
                return <DollarSign className="h-4 w-4" />
            default:
                return <AlertTriangle className="h-4 w-4" />
        }
    }

    const getVarianceBadge = (category: string) => {
        const colors: Record<string, string> = {
            OVER_BUDGET: 'bg-red-100 text-red-800 border-red-200',
            UNDER_BUDGET: 'bg-green-100 text-green-800 border-green-200',
            MISSING_DEPOSIT: 'bg-orange-100 text-orange-800 border-orange-200',
            EXCESS_CONSUMPTION: 'bg-amber-100 text-amber-800 border-amber-200',
        }
        return colors[category] || 'bg-gray-100 text-gray-800'
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            OPEN: 'bg-yellow-100 text-yellow-800',
            INVESTIGATING: 'bg-primary/10 text-primary',
            RESOLVED: 'bg-green-100 text-green-800',
            ESCALATED: 'bg-red-100 text-red-800',
        }
        return colors[status] || 'bg-gray-100 text-gray-800'
    }

    const handleResolve = async () => {
        if (!selectedVariance || !resolutionNotes.trim()) return

        await resolveVariance.mutateAsync({
            varianceId: selectedVariance.id,
            userId,
            notes: resolutionNotes,
        })

        setSelectedVariance(null)
        setResolutionNotes('')
    }

    const handleEscalate = async (varianceId: string) => {
        await escalateVariance.mutateAsync({
            varianceId,
            notes: 'Escalated for management review',
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Fleet Variance Dashboard</h1>
                <p className="text-muted-foreground">Monitor and manage expense variances across fleet operations</p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Variances</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboard?.total_variances || 0}</div>
                        <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Impact</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            Rs. {dashboard?.total_variance_amount?.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Avg: {dashboard?.avg_variance_percentage?.toFixed(2) || 0}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {dashboard?.open_alerts || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Require attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Breakdown</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Cash:</span>
                                <span className="font-medium">{dashboard?.cash_variances || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Fuel:</span>
                                <span className="font-medium">{dashboard?.fuel_variances || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Variance Tables */}
            <Tabs defaultValue="alerts" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="alerts">
                        Active Alerts ({alertVariances?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="open">
                        Open ({openVariances?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="all">
                        All Variances ({allVariances?.length || 0})
                    </TabsTrigger>
                </TabsList>

                {['alerts', 'open', 'all'].map((tab) => {
                    const variances =
                        tab === 'alerts' ? alertVariances :
                            tab === 'open' ? openVariances :
                                allVariances

                    return (
                        <TabsContent key={tab} value={tab}>
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Trip</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead className="text-right">Budgeted</TableHead>
                                                <TableHead className="text-right">Actual</TableHead>
                                                <TableHead className="text-right">Variance</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {variances?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                                        No variances found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                variances?.map((variance) => (
                                                    <TableRow key={variance.id} className={variance.is_alert_triggered ? 'bg-red-50/30' : ''}>
                                                        <TableCell className="font-medium">
                                                            {format(new Date(variance.variance_date), 'MMM dd, yyyy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-sm">
                                                                <div className="font-medium">{variance.trip?.vehicle?.registration_number}</div>
                                                                <div className="text-muted-foreground">
                                                                    {variance.trip?.driver?.employee?.full_name}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {getVarianceIcon(variance.variance_type)}
                                                                <span className="text-sm">{variance.variance_type}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getVarianceBadge(variance.variance_category)}>
                                                                {variance.variance_category.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {variance.budgeted_amount.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            Rs. {variance.actual_amount.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className={`font-medium ${variance.variance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {variance.variance_amount > 0 ? '+' : ''}
                                                                Rs. {variance.variance_amount.toLocaleString()}
                                                                <div className="text-xs text-muted-foreground">
                                                                    ({variance.variance_percentage > 0 ? '+' : ''}
                                                                    {variance.variance_percentage.toFixed(1)}%)
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={getStatusBadge(variance.status)}>
                                                                {variance.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {variance.status === 'OPEN' && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setSelectedVariance(variance)}
                                                                        >
                                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                                            Resolve
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => handleEscalate(variance.id)}
                                                                        >
                                                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                                                            Escalate
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )
                })}
            </Tabs>

            {/* Resolution Dialog */}
            <Dialog open={!!selectedVariance} onOpenChange={(open) => !open && setSelectedVariance(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolve Variance</DialogTitle>
                        <DialogDescription>
                            Provide resolution notes for this variance
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Resolution Notes</Label>
                            <Textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Explain how this variance was resolved..."
                                className="mt-2"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedVariance(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResolve}
                            disabled={!resolutionNotes.trim() || resolveVariance.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {resolveVariance.isPending ? 'Resolving...' : 'Mark as Resolved'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
