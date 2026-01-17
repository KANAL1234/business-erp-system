// ========================================
// HR & PAYROLL TYPE DEFINITIONS
// ========================================

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'PROBATION';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEK_OFF';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AdvanceType = 'ADVANCE' | 'LOAN';
export type AdvanceStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type PayrollStatus = 'DRAFT' | 'PROCESSED' | 'PAID' | 'CANCELLED';
export type CommissionType = 'SALES_VALUE' | 'PROFIT_MARGIN' | 'FIXED';
export type ComponentType = 'ALLOWANCE' | 'DEDUCTION';
export type CalculationType = 'FIXED' | 'PERCENTAGE';

// ========================================
// EMPLOYEE
// ========================================

export interface Employee {
  id: string;
  user_profile_id?: string;
  employee_code: string;
  full_name: string;
  cnic: string;
  date_of_birth?: string;
  department_id?: string;
  designation: string;
  joining_date: string;
  leaving_date?: string;
  employment_status: EmploymentStatus;
  phone?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  basic_salary: number;
  allowances?: Record<string, number>;
  commission_rate?: number;
  commission_type?: CommissionType;
  bank_account_number?: string;
  bank_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  manager_id?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// ========================================
// ATTENDANCE
// ========================================

export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  status: AttendanceStatus;
  location_id?: string;
  notes?: string;
  marked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceReport {
  attendance_date: string;
  employee_code: string;
  employee_name: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours?: number;
  status: AttendanceStatus;
  location_name?: string;
}

export interface MarkAttendanceInput {
  employee_id: string;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: AttendanceStatus;
  location_id?: string;
  notes?: string;
}

// ========================================
// LEAVE MANAGEMENT
// ========================================

export interface LeaveType {
  id: string;
  leave_type_code: string;
  leave_type_name: string;
  days_allowed_per_year: number;
  carry_forward: boolean;
  paid: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  fiscal_year: number;
  opening_balance: number;
  accrued: number;
  taken: number;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  request_number: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalanceDetail {
  leave_type_name: string;
  opening_balance: number;
  accrued: number;
  taken: number;
  balance: number;
}

export interface RequestLeaveInput {
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  reason: string;
}

// ========================================
// ADVANCES & LOANS
// ========================================

export interface EmployeeAdvance {
  id: string;
  advance_number: string;
  employee_id: string;
  advance_type: AdvanceType;
  amount: number;
  reason: string;
  advance_date: string;
  installments: number;
  installment_amount?: number;
  amount_recovered: number;
  balance: number;
  status: AdvanceStatus;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AdvanceDeduction {
  id: string;
  advance_id: string;
  payslip_id?: string;
  deduction_date: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface CreateAdvanceInput {
  employee_id: string;
  advance_type: AdvanceType;
  amount: number;
  reason: string;
  installments?: number;
}

// ========================================
// COMMISSION
// ========================================

export interface CommissionRecord {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  commission_rate: number;
  commission_amount: number;
  payslip_id?: string;
  notes?: string;
  created_at: string;
}

// ========================================
// OVERTIME
// ========================================

export interface OvertimeRecord {
  id: string;
  employee_id: string;
  overtime_date: string;
  hours: number;
  rate_per_hour: number;
  total_amount: number;
  payslip_id?: string;
  approved_by?: string;
  notes?: string;
  created_at: string;
}

// ========================================
// SALARY COMPONENTS
// ========================================

export interface SalaryComponent {
  id: string;
  component_code: string;
  component_name: string;
  component_type: ComponentType;
  calculation_type: CalculationType;
  default_value: number;
  is_taxable: boolean;
  is_active: boolean;
  display_order: number;
  description?: string;
  created_at: string;
}

export interface EmployeeSalaryComponent {
  id: string;
  employee_id: string;
  component_id: string;
  amount: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
}

// ========================================
// PAYROLL
// ========================================

export interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  status: PayrollStatus;
  created_at: string;
}

export interface Payslip {
  id: string;
  payslip_number: string;
  employee_id: string;
  payroll_period_id: string;
  basic_salary: number;
  allowances: number;
  commission: number;
  overtime: number;
  bonus: number;
  gross_salary: number;
  income_tax: number;
  eobi: number;
  advance: number;
  loan_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  working_days: number;
  days_present: number;
  days_absent: number;
  leaves_taken: number;
  notes?: string;
  created_at: string;
}

export interface PayslipDetail {
  id: string;
  payslip_id: string;
  component_id: string;
  amount: number;
  created_at: string;
}

export interface PayslipWithDetails {
  payslip: Payslip;
  employee: {
    employee_code: string;
    full_name: string;
    designation: string;
    department?: string;
    bank_account?: string;
    bank_name?: string;
  };
  period: {
    period_name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
  };
}

// ========================================
// FORM INPUTS
// ========================================

export interface CreateEmployeeInput {
  employee_code: string;
  full_name: string;
  cnic: string;
  date_of_birth?: string;
  department_id?: string;
  designation: string;
  joining_date: string;
  phone?: string;
  email?: string;
  address?: string;
  basic_salary: number;
  commission_rate?: number;
  commission_type?: CommissionType;
  bank_account_number?: string;
  bank_name?: string;
}

export interface UpdateEmployeeInput {
  full_name?: string;
  designation?: string;
  department_id?: string;
  phone?: string;
  email?: string;
  address?: string;
  basic_salary?: number;
  commission_rate?: number;
  employment_status?: EmploymentStatus;
}

export interface CreatePayrollPeriodInput {
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
}

// ========================================
// REPORTS
// ========================================

export interface EmployeeSummary {
  employee_id: string;
  employee_code: string;
  full_name: string;
  designation: string;
  department?: string;
  basic_salary: number;
  employment_status: EmploymentStatus;
  joining_date: string;
}

export interface PayrollSummary {
  period_name: string;
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  total_commission: number;
  total_overtime: number;
}

export interface AttendanceSummary {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  total_days: number;
  present: number;
  absent: number;
  leaves: number;
  half_days: number;
  late: number;
  attendance_percentage: number;
}

// ========================================
// CONSTANTS
// ========================================

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'TERMINATED',
  'ON_LEAVE',
  'PROBATION'
];

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'LATE',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEK_OFF'
];

export const LEAVE_STATUSES: LeaveStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
];

export const COMMISSION_TYPES: CommissionType[] = [
  'SALES_VALUE',
  'PROFIT_MARGIN',
  'FIXED'
];

export const PAYROLL_STATUSES: PayrollStatus[] = [
  'DRAFT',
  'PROCESSED',
  'PAID',
  'CANCELLED'
];

// ========================================
// HELPER FUNCTIONS
// ========================================

export const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    // Skip Sundays (0)
    if (day !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
};

export const formatCNIC = (cnic: string): string => {
  // Format: 12345-1234567-1
  return cnic.replace(/(\d{5})(\d{7})(\d{1})/, '$1-$2-$3');
};

export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

export const getEmploymentDuration = (joiningDate: string): string => {
  const start = new Date(joiningDate);
  const now = new Date();

  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else if (months < 0) {
    return `${years - 1} year${years - 1 !== 1 ? 's' : ''} ${12 + months} month${12 + months !== 1 ? 's' : ''}`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
  }
};

export const getAttendanceStatusColor = (status: AttendanceStatus): string => {
  const colors = {
    PRESENT: 'green',
    ABSENT: 'red',
    HALF_DAY: 'yellow',
    LATE: 'orange',
    ON_LEAVE: 'blue',
    HOLIDAY: 'purple',
    WEEK_OFF: 'gray'
  };

  return colors[status] || 'gray';
};

export const getLeaveStatusColor = (status: LeaveStatus): string => {
  const colors = {
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    CANCELLED: 'gray'
  };

  return colors[status] || 'gray';
};
