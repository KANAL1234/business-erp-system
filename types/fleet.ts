export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
export type DriverStatus = 'ACTIVE' | 'SUSPENDED' | 'ON_LEAVE'
export type TripStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'CREDIT' | 'ADVANCE'

export interface FleetVehicle {
    id: string
    registration_number: string
    make: string
    model: string
    year: number
    status: VehicleStatus
    current_mileage: number
    last_service_date: string | null
    last_service_mileage: number | null
    location_id: string | null // Linked mobile store location
    created_at: string
}

export interface FleetDriver {
    id: string
    employee_id: string
    license_number: string
    license_expiry: string
    status: DriverStatus
    created_at: string
    // Joined fields
    employee?: {
        full_name: string
        employee_code: string
    }
}

export interface TripGPSPoint {
    lat: number
    lng: number
    time: string
    speed?: number
}

export interface FleetTrip {
    id: string
    vehicle_id: string
    driver_id: string
    start_time: string
    end_time: string | null
    start_location: string
    end_location: string | null
    start_mileage: number
    end_mileage: number | null
    trip_purpose: string | null
    status: TripStatus
    gps_path: TripGPSPoint[] | null
    created_at: string
    // Joined fields
    vehicle?: FleetVehicle
    driver?: FleetDriver
}

export interface FleetTripVisit {
    id: string
    trip_id: string
    customer_id: string
    visit_time: string
    notes: string | null
    customer?: {
        name: string
        customer_code: string
    }
}

export interface FleetFuelLog {
    id: string
    vehicle_id: string
    trip_id: string | null
    log_date: string
    liters: number
    cost_per_liter: number
    total_cost: number
    odometer_reading: number
    receipt_url: string | null
    payment_method: PaymentMethod
    journal_entry_id: string | null
    created_at: string
    // Joined fields
    vehicle?: FleetVehicle
}

export interface FleetMaintenance {
    id: string
    vehicle_id: string
    service_type: string
    service_date: string
    odometer_reading: number
    cost: number
    description: string | null
    vendor_name: string | null
    next_service_due_date: string | null
    next_service_due_mileage: number | null
    payment_method: PaymentMethod
    journal_entry_id: string | null
    created_at: string
    // Joined fields
    vehicle?: FleetVehicle
}

// ============================================================================
// FLEET BUSINESS WORKFLOW TYPES
// ============================================================================

export type CashDepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED'
export type FuelAllowanceStatus = 'ACTIVE' | 'COMPLETED' | 'EXCEEDED' | 'CANCELLED'
export type VarianceType = 'FUEL' | 'CASH' | 'MAINTENANCE' | 'OTHER'
export type VarianceCategory = 'OVER_BUDGET' | 'UNDER_BUDGET' | 'MISSING_DEPOSIT' | 'EXCESS_CONSUMPTION'
export type VarianceStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED'

export interface FleetCashDeposit {
    id: string
    trip_id: string
    driver_id: string
    vehicle_id: string

    // Financial Details
    expected_cash: number
    actual_cash: number
    variance: number

    // Deposit Information
    deposit_date: string
    deposit_time: string
    bank_account_id: string | null
    deposit_slip_number: string | null

    // Approval Workflow
    status: CashDepositStatus
    submitted_by: string | null
    approved_by: string | null
    approved_at: string | null

    // Accounting Integration
    journal_entry_id: string | null

    // Metadata
    notes: string | null
    created_at: string
    updated_at: string

    // Joined fields
    trip?: FleetTrip
    driver?: FleetDriver
    vehicle?: FleetVehicle
    bank_account?: {
        account_name: string
        account_number: string
    }
}

export interface FleetFuelAllowance {
    id: string
    trip_id: string
    driver_id: string
    vehicle_id: string

    // Allowance Details
    allowance_date: string
    budgeted_fuel_liters: number
    budgeted_fuel_cost: number

    // Actual Consumption
    actual_fuel_liters: number
    actual_fuel_cost: number

    // Cash Tracking
    cash_issued: number
    cash_issued_date: string | null
    cash_returned: number
    cash_returned_date: string | null
    issue_journal_entry_id: string | null
    return_journal_entry_id: string | null

    // Variance Tracking
    fuel_variance_liters: number
    cost_variance: number
    variance_percentage: number

    // Approval Status
    status: FuelAllowanceStatus
    approved_by: string | null

    // Metadata
    notes: string | null
    created_at: string
    updated_at: string

    // Joined fields
    trip?: FleetTrip
    driver?: FleetDriver
    vehicle?: FleetVehicle
}

export interface FleetExpenseVariance {
    id: string
    trip_id: string

    // Variance Type
    variance_type: VarianceType
    variance_category: VarianceCategory

    // Financial Impact
    budgeted_amount: number
    actual_amount: number
    variance_amount: number
    variance_percentage: number

    // Alert Configuration
    alert_threshold_percentage: number
    is_alert_triggered: boolean

    // Resolution
    status: VarianceStatus
    resolved_by: string | null
    resolved_at: string | null
    resolution_notes: string | null

    // Metadata
    variance_date: string
    created_at: string

    // Joined fields
    trip?: FleetTrip
}

export interface FleetVarianceDashboard {
    total_variances: number
    total_variance_amount: number
    cash_variances: number
    fuel_variances: number
    open_alerts: number
    avg_variance_percentage: number
}

