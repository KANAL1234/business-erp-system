'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, CheckCircle2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useEmployees, useMarkAttendance, useAttendanceReport } from '@/lib/queries/hr'
import { PermissionGuard } from '@/components/permission-guard'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const { data: employees, isLoading: employeesLoading } = useEmployees()
    const { data: report, isLoading: reportLoading } = useAttendanceReport({
        dateFrom: selectedDate,
        dateTo: selectedDate
    })
    const markAttendance = useMarkAttendance()

    // Track local changes before saving
    const [attendanceData, setAttendanceData] = useState<Record<string, any>>({})

    // Initialize attendance data from report if exists, or active employees
    useEffect(() => {
        if (employees) {
            const initial: Record<string, any> = {}
            employees.filter(e => e.employment_status === 'ACTIVE').forEach(emp => {
                const existing = report?.find(r => r.employee_code === emp.employee_code)
                initial[emp.id] = {
                    status: existing?.status || 'PRESENT',
                    check_in_time: existing?.check_in_time || '09:00',
                    check_out_time: existing?.check_out_time || '18:00',
                    notes: ''
                }
            })
            setAttendanceData(initial)
        }
    }, [employees, report, selectedDate])

    const handleStatusChange = (employeeId: string, status: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [employeeId]: { ...prev[employeeId], status }
        }))
    }

    const handleTimeChange = (employeeId: string, field: string, value: string) => {
        setAttendanceData(prev => ({
            ...prev,
            [employeeId]: { ...prev[employeeId], [field]: value }
        }))
    }

    const handleSaveAll = async () => {
        try {
            const promises = Object.entries(attendanceData).map(([employeeId, data]) =>
                markAttendance.mutateAsync({
                    employee_id: employeeId,
                    attendance_date: selectedDate,
                    status: data.status,
                    check_in_time: data.status === 'ABSENT' ? undefined : data.check_in_time,
                    check_out_time: data.status === 'ABSENT' ? undefined : data.check_out_time,
                })
            )
            await Promise.all(promises)
            toast.success('Attendance updated successfully')
        } catch (error) {
            toast.error('Failed to update attendance')
        }
    }

    const isLoading = employeesLoading || reportLoading

    return (
        <PermissionGuard permission="hr.attendance.view">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
                        <p className="text-muted-foreground">
                            Manage daily check-ins and check-outs for your team.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            className="w-[200px]"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <PermissionGuard permission="hr.attendance.mark">
                            <Button onClick={handleSaveAll} disabled={markAttendance.isPending}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Save Attendance
                            </Button>
                        </PermissionGuard>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Present</CardTitle>
                            <UserCheck className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {Object.values(attendanceData).filter(a => a.status === 'PRESENT' || a.status === 'LATE').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Absent</CardTitle>
                            <CalendarIcon className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">
                                {Object.values(attendanceData).filter(a => a.status === 'ABSENT').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-base font-medium">Attendance Register</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Check In</TableHead>
                                    <TableHead>Check Out</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    employees?.filter(e => e.employment_status === 'ACTIVE').map((emp) => {
                                        const data = attendanceData[emp.id] || { status: 'PRESENT', check_in_time: '09:00', check_out_time: '18:00' }
                                        const existingReport = report?.find(r => r.employee_code === emp.employee_code)

                                        return (
                                            <TableRow key={emp.id}>
                                                <TableCell>
                                                    <div className="font-medium">{emp.full_name}</div>
                                                    <div className="text-xs text-muted-foreground">{emp.employee_code}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={data.status}
                                                        onValueChange={(val) => handleStatusChange(emp.id, val)}
                                                    >
                                                        <SelectTrigger className="w-[130px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="PRESENT">Present</SelectItem>
                                                            <SelectItem value="ABSENT">Absent</SelectItem>
                                                            <SelectItem value="LATE">Late</SelectItem>
                                                            <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                                            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="time"
                                                        className="w-[120px]"
                                                        disabled={data.status === 'ABSENT' || data.status === 'ON_LEAVE'}
                                                        value={data.check_in_time}
                                                        onChange={(e) => handleTimeChange(emp.id, 'check_in_time', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="time"
                                                        className="w-[120px]"
                                                        disabled={data.status === 'ABSENT' || data.status === 'ON_LEAVE'}
                                                        value={data.check_out_time}
                                                        onChange={(e) => handleTimeChange(emp.id, 'check_out_time', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {existingReport?.total_hours ? (
                                                        <Badge variant="secondary">{existingReport.total_hours} hrs</Badge>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {existingReport?.status && !markAttendance.isPending && (
                                                        <Badge variant="outline" className="text-[10px] uppercase">Marked</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </PermissionGuard>
    )
}
