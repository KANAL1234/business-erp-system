// ========================================
// RBAC Type Definitions
// ========================================

export type RoleCode =
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'SALES_STAFF'
  | 'WAREHOUSE_STAFF'
  | 'CASHIER'
  | 'PURCHASE_OFFICER'
  | 'VIEWER';

export type ModuleType =
  | 'dashboard'
  | 'inventory'
  | 'hr'
  | 'pos'
  | 'sales'
  | 'procurement'
  | 'accounting'
  | 'reports'
  | 'settings'
  | 'system'
  | 'fleet';

export type ActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'view'
  | 'post'
  | 'cancel'
  | 'reverse'
  | 'write'
  | 'send'
  | 'email'
  | 'void'
  | 'manage'
  | 'perform'
  | 'convert'
  | 'adjust'
  | 'transfer'
  | 'request'
  | 'mark'
  | 'approve_adjustment'
  | 'approve_transfer';

// ========================================
// DATABASE TYPES
// ========================================

export interface Role {
  id: string;
  role_name: string;
  role_code: RoleCode;
  description?: string;
  is_active: boolean;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  module: ModuleType;
  resource: string;
  action: ActionType;
  permission_code: string;
  description?: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  employee_code?: string;
  email: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  module: string;
  resource: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'error';
  error_message?: string;
  created_at: string;
}

// ========================================
// EXTENDED TYPES WITH RELATIONS
// ========================================

export interface UserWithRoles {
  user_id: string;
  full_name: string;
  email: string;
  employee_code?: string;
  phone?: string;
  is_active: boolean;
  last_login?: string;
  roles: {
    role_id: string;
    role_code: RoleCode;
    role_name: string;
  }[];
  allowed_locations: {
    location_id: string;
    location_name: string;
    location_code: string;
  }[];
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface AuditLogWithUser extends AuditLog {
  user_email?: string;
  full_name?: string;
}

// ========================================
// PERMISSION CHECK TYPES
// ========================================

export interface PermissionCheck {
  permission_code: string;
  module: ModuleType;
  resource: string;
  action: ActionType;
  role_name: string;
}

export interface UserPermissions {
  permissions: PermissionCheck[];
  roles: Role[];
}

// ========================================
// FORM INPUT TYPES
// ========================================

export interface CreateUserInput {
  full_name: string;
  email: string;
  password: string;
  employee_code?: string;
  phone?: string;
  role_ids: string[];
}

export interface UpdateUserInput {
  full_name?: string;
  email?: string;
  employee_code?: string;
  phone?: string;
  is_active?: boolean;
}

export interface AssignRoleInput {
  user_id: string;
  role_id: string;
}

export interface RemoveRoleInput {
  user_id: string;
  role_id: string;
}

export interface CreateRoleInput {
  role_name: string;
  role_code: string;
  description?: string;
  permission_ids: string[];
}

export interface UpdateRolePermissionsInput {
  role_id: string;
  permission_ids: string[];
}

export interface AuditLogFilter {
  user_id?: string;
  module?: ModuleType;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

// ========================================
// PERMISSION CONSTANTS
// ========================================

export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  VIEW: 'view',
  POST: 'post',
  CANCEL: 'cancel',
  REVERSE: 'reverse',
  WRITE: 'write',
  SEND: 'send',
  EMAIL: 'email',
  VOID: 'void',
  MANAGE: 'manage',
  PERFORM: 'perform',
  CONVERT: 'convert',
  ADJUST: 'adjust',
  TRANSFER: 'transfer',
  REQUEST: 'request',
  MARK: 'mark'
} as const;

export const MODULES = {
  DASHBOARD: 'dashboard',
  INVENTORY: 'inventory',
  HR: 'hr',
  POS: 'pos',
  SALES: 'sales',
  PROCUREMENT: 'procurement',
  ACCOUNTING: 'accounting',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  SYSTEM: 'system',
  FLEET: 'fleet'
} as const;

// ========================================
// PERMISSION BUILDER HELPERS
// ========================================

export const buildPermissionCode = (
  module: ModuleType,
  resource: string,
  action: ActionType
): string => {
  return `${module}.${resource}.${action}`;
};

export const parsePermissionCode = (code: string): {
  module: string;
  resource: string;
  action: string;
} | null => {
  const parts = code.split('.');
  if (parts.length !== 3) return null;

  return {
    module: parts[0],
    resource: parts[1],
    action: parts[2]
  };
};

// ========================================
// ROLE DEFINITIONS
// ========================================

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  SUPER_ADMIN: 'Full system access with all permissions. Can manage users and roles.',
  MANAGER: 'Can manage operations, approve transactions, and view all reports.',
  ACCOUNTANT: 'Manages accounting, creates invoices, posts journals, and generates financial reports.',
  SALES_STAFF: 'Creates sales orders, quotations, manages customers, and handles sales transactions.',
  WAREHOUSE_STAFF: 'Manages inventory, stock transfers, GRN, and warehouse operations.',
  CASHIER: 'POS operations, receives payments, and handles cash transactions.',
  PURCHASE_OFFICER: 'Creates purchase orders, manages vendors, and handles procurement.',
  VIEWER: 'Read-only access to all data and reports.'
};

// ========================================
// PERMISSION GROUPS
// ========================================

export interface PermissionGroup {
  module: ModuleType;
  label: string;
  permissions: {
    resource: string;
    label: string;
    actions: {
      action: ActionType;
      label: string;
    }[];
  }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    permissions: [
      {
        resource: 'overview',
        label: 'Overview',
        actions: [{ action: 'view', label: 'View Dashboard' }]
      }
    ]
  },
  {
    module: 'inventory',
    label: 'Inventory',
    permissions: [
      {
        resource: 'products',
        label: 'Products',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'delete', label: 'Delete' }
        ]
      },
      {
        resource: 'stock',
        label: 'Stock',
        actions: [
          { action: 'view', label: 'View' },
          { action: 'adjust', label: 'Adjust' },
          { action: 'transfer', label: 'Transfer' },
          { action: 'approve_adjustment', label: 'Approve Adjustments' },
          { action: 'approve_transfer', label: 'Approve Transfers' }
        ]
      },
      {
        resource: 'locations',
        label: 'Locations',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' }
        ]
      },
      {
        resource: 'reports',
        label: 'Reports',
        actions: [{ action: 'view', label: 'View' }]
      }
    ]
  },
  {
    module: 'hr',
    label: 'Human Resources',
    permissions: [
      {
        resource: 'employees',
        label: 'Employees',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'delete', label: 'Delete' }
        ]
      },
      {
        resource: 'attendance',
        label: 'Attendance',
        actions: [
          { action: 'view', label: 'View' },
          { action: 'mark', label: 'Mark' }
        ]
      },
      {
        resource: 'leaves',
        label: 'Leaves',
        actions: [
          { action: 'request', label: 'Request' },
          { action: 'approve', label: 'Approve' }
        ]
      },
      {
        resource: 'advances',
        label: 'Employee Advances',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'approve', label: 'Approve' }
        ]
      },
      {
        resource: 'payroll',
        label: 'Payroll',
        actions: [{ action: 'view', label: 'View' }]
      }
    ]
  },
  {
    module: 'pos',
    label: 'Point of Sale',
    permissions: [
      {
        resource: 'sales',
        label: 'Sales',
        actions: [
          { action: 'create', label: 'Make Sales' },
          { action: 'view', label: 'View History' },
          { action: 'void', label: 'Void Sales' }
        ]
      },
      {
        resource: 'closing',
        label: 'Daily Closing',
        actions: [
          { action: 'perform', label: 'Perform Closing' },
          { action: 'view', label: 'View History' }
        ]
      }
    ]
  },
  {
    module: 'sales',
    label: 'Sales & B2B',
    permissions: [
      {
        resource: 'customers',
        label: 'Customers',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'delete', label: 'Delete' }
        ]
      },
      {
        resource: 'quotations',
        label: 'Quotations',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'delete', label: 'Delete' },
          { action: 'convert', label: 'Convert to Order' }
        ]
      },
      {
        resource: 'orders',
        label: 'Sales Orders',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'approve', label: 'Approve' },
          { action: 'cancel', label: 'Cancel' }
        ]
      },
      {
        resource: 'invoices',
        label: 'Invoices',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'approve', label: 'Approve' },
          { action: 'email', label: 'Email' }
        ]
      },
      {
        resource: 'returns',
        label: 'Returns',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'approve', label: 'Approve' }
        ]
      },
      {
        resource: 'deliveries',
        label: 'Deliveries',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'approve', label: 'Approve' }
        ]
      }
    ]
  },
  {
    module: 'procurement',
    label: 'Procurement',
    permissions: [
      {
        resource: 'vendors',
        label: 'Vendors',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'delete', label: 'Delete' }
        ]
      },
      {
        resource: 'purchase_orders',
        label: 'Purchase Orders',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'approve', label: 'Approve' },
          { action: 'send', label: 'Send to Vendor' }
        ]
      },
      {
        resource: 'grn',
        label: 'GRN',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'approve', label: 'Approve' }
        ]
      }
    ]
  },
  {
    module: 'accounting',
    label: 'Accounting',
    permissions: [
      {
        resource: 'vendor_bills',
        label: 'Vendor Bills',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'approve', label: 'Approve' }
        ]
      },
      {
        resource: 'payment_vouchers',
        label: 'Payment Vouchers',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'approve', label: 'Approve' }
        ]
      },
      {
        resource: 'receipt_vouchers',
        label: 'Receipt Vouchers',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' }
        ]
      },
      {
        resource: 'journal_entries',
        label: 'Journal Entries',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'post', label: 'Post' },
          { action: 'cancel', label: 'Cancel' },
          { action: 'write', label: 'Edit' },
          { action: 'delete', label: 'Delete' },
          { action: 'reverse', label: 'Reverse' }
        ]
      },
      {
        resource: 'chart_of_accounts',
        label: 'Chart of Accounts',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' }
        ]
      },
      {
        resource: 'bank_accounts',
        label: 'Bank Accounts',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' }
        ]
      },
      {
        resource: 'reports',
        label: 'Reports',
        actions: [{ action: 'read', label: 'View' }]
      }
    ]
  },
  {
    module: 'fleet',
    label: 'Fleet',
    permissions: [
      {
        resource: 'overview',
        label: 'Overview',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'vehicles',
        label: 'Vehicles',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'drivers',
        label: 'Drivers',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'trips',
        label: 'Trips',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'maintenance',
        label: 'Maintenance',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'variances',
        label: 'Variances',
        actions: [{ action: 'view', label: 'View' }]
      }
    ]
  },
  {
    module: 'reports',
    label: 'Reports',
    permissions: [
      {
        resource: 'trial_balance',
        label: 'Trial Balance',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'profit_loss',
        label: 'Profit & Loss',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'balance_sheet',
        label: 'Balance Sheet',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'aging',
        label: 'Aging Reports',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'registers',
        label: 'Transaction Registers',
        actions: [{ action: 'view', label: 'View' }]
      }
    ]
  },
  {
    module: 'settings',
    label: 'Settings',
    permissions: [
      {
        resource: 'company',
        label: 'Company',
        actions: [{ action: 'manage', label: 'Manage Settings' }]
      },
      {
        resource: 'users',
        label: 'Users',
        actions: [
          { action: 'create', label: 'Create' },
          { action: 'read', label: 'View' },
          { action: 'update', label: 'Edit' },
          { action: 'delete', label: 'Delete' }
        ]
      },
      {
        resource: 'roles',
        label: 'Roles & Permissions',
        actions: [{ action: 'manage', label: 'Manage' }]
      }
    ]
  },
  {
    module: 'system',
    label: 'System',
    permissions: [
      {
        resource: 'audit_logs',
        label: 'Audit Logs',
        actions: [{ action: 'view', label: 'View' }]
      },
      {
        resource: 'health',
        label: 'System Health',
        actions: [{ action: 'view', label: 'View' }]
      }
    ]
  }
];
