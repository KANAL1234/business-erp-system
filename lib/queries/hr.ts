import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
    Employee,
    Department,
    MarkAttendanceInput,
    AttendanceReport,
    RequestLeaveInput,
    LeaveBalanceDetail,
    LeaveType,
    LeaveRequest,
    EmployeeAdvance,
    CreateAdvanceInput,
    PayrollPeriod,
    Payslip
} from '@/lib/types/hr'

const supabase = createClient()

// ========================================
// EMPLOYEES
// ========================================

export function useEmployees() {
    return useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employees')
                .select(`
          *,
          department:departments(id, name)
        `)
                .order('full_name')

            if (error) throw error
            return data as (Employee & { department?: { id: string; name: string } })[]
        },
    })
}

export function useEmployee(id: string) {
    return useQuery({
        queryKey: ['employees', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data as Employee
        },
        enabled: !!id,
    })
}

export function useCreateEmployee() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (employee: any) => {
            const { data, error } = await supabase
                .from('employees')
                .insert(employee)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        }
    })
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...updates }: any) => {
            const { data, error } = await supabase
                .from('employees')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            queryClient.invalidateQueries({ queryKey: ['employees', variables.id] })
        }
    })
}

// ========================================
// DEPARTMENTS
// ========================================

export function useDepartments() {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .eq('is_active', true)
                .order('name')
            if (error) throw error
            return data as Department[]
        }
    })
}

// ========================================
// ATTENDANCE
// ========================================

export function useAttendanceReport(params: { employeeId?: string, dateFrom?: string, dateTo?: string, locationId?: string }) {
    return useQuery({
        queryKey: ['attendance-report', params],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_attendance_report', {
                p_employee_id: params.employeeId || null,
                p_date_from: params.dateFrom || null,
                p_date_to: params.dateTo || null,
                p_location_id: params.locationId || null
            })
            if (error) throw error
            return data as AttendanceReport[]
        }
    })
}

export function useMarkAttendance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: MarkAttendanceInput) => {
            const { data, error } = await supabase.rpc('mark_attendance', {
                p_employee_id: input.employee_id,
                p_attendance_date: input.attendance_date,
                p_check_in_time: input.check_in_time || null,
                p_check_out_time: input.check_out_time || null,
                p_status: input.status,
                p_location_id: input.location_id || null,
                p_notes: input.notes || null
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance-report'] })
        }
    })
}

// ========================================
// LEAVES
// ========================================

export function useLeaveTypes() {
    return useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => {
            const { data, error } = await supabase.from('leave_types').select('*').eq('is_active', true)
            if (error) throw error
            return data as LeaveType[]
        }
    })
}

export function useEmployeeLeaveBalance(employeeId: string, fiscalYear?: number) {
    return useQuery({
        queryKey: ['leave-balance', employeeId, fiscalYear],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_employee_leave_balance', {
                p_employee_id: employeeId,
                p_fiscal_year: fiscalYear || new Date().getFullYear()
            })
            if (error) throw error
            return data as LeaveBalanceDetail[]
        },
        enabled: !!employeeId
    })
}

export function useRequestLeave() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: RequestLeaveInput) => {
            const { data, error } = await supabase.rpc('request_leave', {
                p_employee_id: input.employee_id,
                p_leave_type_id: input.leave_type_id,
                p_from_date: input.from_date,
                p_to_date: input.to_date,
                p_reason: input.reason
            })
            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            queryClient.invalidateQueries({ queryKey: ['leave-balance', variables.employee_id] })
        }
    })
}

export function useLeaveRequests(params?: { status?: string, employeeId?: string }) {
    return useQuery({
        queryKey: ['leave-requests', params],
        queryFn: async () => {
            let query = supabase
                .from('leave_requests')
                .select(`
          *,
          employee:employees(id, full_name, employee_code, designation),
          leave_type:leave_types(id, leave_type_name)
        `)
                .order('created_at', { ascending: false })

            if (params?.status) query = query.eq('status', params.status)
            if (params?.employeeId) query = query.eq('employee_id', params.employeeId)

            const { data, error } = await query
            if (error) throw (error as any)
            return (data as any) as (LeaveRequest & { employee: any, leave_type: any })[]
        }
    })
}

export function useProcessLeave() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ requestId, action, rejectionReason }: { requestId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string }) => {
            const { data, error } = await supabase.rpc('process_leave_request', {
                p_request_id: requestId,
                p_action: action,
                p_approved_by: (await supabase.auth.getUser()).data.user?.id,
                p_rejection_reason: rejectionReason || null
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            queryClient.invalidateQueries({ queryKey: ['leave-balance'] })
        }
    })
}

// ========================================
// ADVANCES
// ========================================

export function useAdvances(params?: { employeeId?: string, status?: string }) {
    return useQuery({
        queryKey: ['advances', params],
        queryFn: async () => {
            let query = supabase
                .from('employee_advances')
                .select(`
          *,
          employee:employees(id, full_name, employee_code)
        `)
                .order('created_at', { ascending: false })

            if (params?.employeeId) query = query.eq('employee_id', params.employeeId)
            if (params?.status) query = query.eq('status', params.status)

            const { data, error } = await query
            if (error) throw (error as any)
            return (data as any) as (EmployeeAdvance & { employee: any })[]
        }
    })
}

export function useCreateAdvance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: CreateAdvanceInput) => {
            const { data, error } = await supabase.rpc('create_employee_advance', {
                p_employee_id: input.employee_id,
                p_advance_type: input.advance_type,
                p_amount: input.amount,
                p_reason: input.reason,
                p_installments: input.installments || 1,
                p_approved_by: (await supabase.auth.getUser()).data.user?.id
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['advances'] })
        }
    })
}

// ========================================
// PAYROLL
// ========================================

export function usePayrollPeriods() {
    return useQuery({
        queryKey: ['payroll-periods'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payroll_periods')
                .select('*')
                .order('start_date', { ascending: false })
            if (error) throw error
            return data as PayrollPeriod[]
        }
    })
}

export function useProcessPayroll() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (periodId: string) => {
            const { data, error } = await supabase.rpc('process_monthly_payroll', {
                p_payroll_period_id: periodId
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
            queryClient.invalidateQueries({ queryKey: ['payslips'] })
        }
    })
}

export function usePayslips(periodId?: string) {
    return useQuery({
        queryKey: ['payslips', periodId],
        queryFn: async () => {
            let query = supabase
                .from('payslips')
                .select(`
          *,
          employee:employees(id, full_name, employee_code, designation)
        `)
                .order('created_at', { ascending: false })

            if (periodId) query = query.eq('payroll_period_id', periodId)

            const { data, error } = await query
            if (error) throw error
            return data as (Payslip & { employee: any })[]
        },
        enabled: !!periodId
    })
}

export function useCreatePayrollPeriod() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: any) => {
            const { data, error } = await supabase
                .from('payroll_periods')
                .insert(input)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
        }
    })
}
