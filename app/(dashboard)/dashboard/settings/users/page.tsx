'use client';

import React, { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { Users, Plus, Edit, Shield, Clock, MapPin, Mail, Phone, Key, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { PermissionGuard } from '@/components/permission-guard';
import { emitSoftRefresh } from '@/lib/soft-refresh';
import { UserWithRoles, Role } from '@/lib/types/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { createUser } from '@/app/actions/users';
import { Label } from '@/components/ui/label';

const supabase = createClient();

export default function UserManagementPage() {
    return (
        <PermissionGuard permission="settings.users.read">
            <UserManagementContent />
        </PermissionGuard>
    )
}

function UserManagementContent() {
    const { user: currentUser, logAction } = useAuth();
    // ... existing ...

    const handleCreateUserSubmit = async (formData: FormData) => {
        try {
            const result = await createUser(null, formData);
            if (result.success) {
                toast.success(result.message);
                setShowCreateDialog(false);
                setSelectedEmployeeId(""); // Reset selection
                setLoading(true);
                // Slight delay to ensure DB propagation
                setTimeout(() => {
                    loadData();
                }, 1000);
                emitSoftRefresh();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };
    const [users, setUsers] = useState<UserWithRoles[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showRolesDialog, setShowRolesDialog] = useState(false);
    const [showLocationsDialog, setShowLocationsDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, locationsRes, employeesRes] = await Promise.all([
                supabase.rpc('get_all_users_with_roles'),
                supabase.from('roles').select('*').eq('is_active', true).order('role_name'),
                supabase.from('locations').select('*').order('name'),
                supabase.from('employees').select('id, employee_code, full_name, email')
                    .eq('employment_status', 'ACTIVE')
                    .order('full_name') // Fetch active employees
            ]);

            if (usersRes.data) setUsers(usersRes.data);
            if (rolesRes.data) setRoles(rolesRes.data);
            if (locationsRes.data) setLocations(locationsRes.data);
            if (employeesRes.data) setEmployees(employeesRes.data);
            return usersRes.data as UserWithRoles[];
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            // Auto-fill hidden inputs logic handled by keeping values in form hidden fields
        }
    }

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.rpc('update_user_status', {
                p_user_id: userId,
                p_is_active: !currentStatus,
                p_updated_by: currentUser?.id
            });

            if (error) throw error;

            toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            await loadData();
            emitSoftRefresh();
            await logAction(
                !currentStatus ? 'activate_user' : 'deactivate_user',
                'settings',
                'users',
                userId
            );
        } catch (error) {
            console.error('Error updating user status:', error);
            toast.error('Failed to update user status');
        }
    };

    return (
        <div className="h-[calc(100vh-112px)] flex flex-col space-y-6 overflow-hidden">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage users, roles, and location assignments.</p>
                </div>
                <PermissionGuard permission="settings.users.create">
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </PermissionGuard>
            </div>

            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="py-4">
                    <CardTitle>System Users</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-0 border-t">
                    <Table>
                        <TableHeader className="sticky top-0 z-30 bg-white shadow-sm">
                            <TableRow>
                                <TableHead className="w-[180px]">User</TableHead>
                                <TableHead>Employee Code</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Allowed Locations</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right sticky top-0 right-0 bg-white border-l z-40 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        Loading users...
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.user_id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{user.full_name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.employee_code || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles && user.roles.length > 0 ? (
                                                    user.roles.map((role) => (
                                                        <Badge key={role.role_id} variant="secondary" className="text-[10px]">
                                                            {role.role_name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.allowed_locations && user.allowed_locations.length > 0 ? (
                                                    user.allowed_locations.map((loc) => (
                                                        <Badge key={loc.location_id} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                                            {loc.location_name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">None (No Access)</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.last_login ? (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    {formatDate(user.last_login)}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Never</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50 border-l z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] transition-colors">
                                            <div className="flex items-center justify-end gap-2 pr-2">
                                                <PermissionGuard permission="settings.roles.manage">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowRolesDialog(true);
                                                        }}
                                                    >
                                                        <Shield className="mr-2 h-4 w-4" />
                                                        Roles
                                                    </Button>
                                                </PermissionGuard>
                                                <PermissionGuard permission="settings.users.update">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setShowLocationsDialog(true);
                                                        }}
                                                    >
                                                        <MapPin className="mr-2 h-4 w-4" />
                                                        Locations
                                                    </Button>
                                                </PermissionGuard>
                                                <PermissionGuard permission="settings.users.update">
                                                    <Button
                                                        variant={user.is_active ? "destructive" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                                                    >
                                                        <Key className="mr-2 h-4 w-4" />
                                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                                    </Button>
                                                </PermissionGuard>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create User Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Create a new user account with system access.</DialogDescription>
                    </DialogHeader>
                    <form action={async (formData) => {
                        setLoading(true);
                        // Import dynamically to avoid client constraints if needed, but standard import is fine usually.
                        // We will add the import at the top.
                        // Assuming handleCreateUser wrapper or direct action usage.
                        // Let's use a wrapper function for cleaner async handling here.
                        handleCreateUserSubmit(formData);
                    }}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Employee</Label>
                                <Select value={selectedEmployeeId} onValueChange={handleEmployeeSelect} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.full_name} ({emp.employee_code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {employees.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-amber-600">
                                        No active employees found. Please add employees in HR module first.
                                    </p>
                                )}
                            </div>

                            {selectedEmployeeId && (() => {
                                const emp = employees.find(e => e.id === selectedEmployeeId);
                                if (!emp) return null;
                                return (
                                    <>
                                        <input type="hidden" name="fullName" value={emp.full_name} />
                                        <input type="hidden" name="employeeCode" value={emp.employee_code} />
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                defaultValue={emp.email || ''}
                                                required
                                                placeholder="john@example.com"
                                            />
                                            <p className="text-[10px] text-muted-foreground">
                                                Auto-filled from HR record. You can change it if needed.
                                            </p>
                                        </div>
                                    </>
                                )
                            })()}

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" name="password" type="password" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="roleId">Initial Role</Label>
                                <select
                                    id="roleId"
                                    name="roleId"
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Select a role...</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.role_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                            <Button type="submit">Create User</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Roles Dialog */}
            <Dialog open={showRolesDialog} onOpenChange={setShowRolesDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Roles: {selectedUser?.full_name}</DialogTitle>
                        <DialogDescription>Assign or remove roles for this user.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-1 gap-2 border rounded-md p-4 max-h-[300px] overflow-y-auto">
                            {roles.map((role) => {
                                const isAssigned = selectedUser?.roles?.some(r => r.role_id === role.id);
                                return (
                                    <div key={role.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md transition-colors">
                                        <div>
                                            <div className="text-sm font-medium">{role.role_name}</div>
                                            <div className="text-xs text-muted-foreground">{role.description}</div>
                                        </div>
                                        <Button
                                            variant={isAssigned ? "destructive" : "default"}
                                            size="sm"
                                            onClick={async () => {
                                                if (isAssigned) {
                                                    await supabase.rpc('remove_role_from_user', {
                                                        p_user_id: selectedUser?.user_id,
                                                        p_role_id: role.id,
                                                        p_removed_by: currentUser?.id
                                                    });
                                                } else {
                                                    await supabase.rpc('assign_role_to_user', {
                                                        p_user_id: selectedUser?.user_id,
                                                        p_role_id: role.id,
                                                        p_assigned_by: currentUser?.id
                                                    });
                                                }
                                                const updatedUsers = await loadData();
                                                const updatedUser = updatedUsers.find(u => u.user_id === selectedUser?.user_id);
                                                if (updatedUser) setSelectedUser(updatedUser);
                                                emitSoftRefresh();
                                            }}
                                        >
                                            {isAssigned ? "Remove" : "Assign"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Manage Locations Dialog */}
            <Dialog open={showLocationsDialog} onOpenChange={setShowLocationsDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Manage Location Access: {selectedUser?.full_name}</DialogTitle>
                        <DialogDescription>Select the stores or vehicles this user is allowed to access.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-1 gap-2 border rounded-md p-4 max-h-[400px] overflow-y-auto">
                            {locations.map((loc) => {
                                const isAssigned = selectedUser?.allowed_locations?.some(al => al.location_id === loc.id);
                                return (
                                    <div key={loc.id} className="flex items-center justify-between p-3 hover:bg-muted rounded-md transition-colors border-b last:border-0 border-slate-100">
                                        <div className="flex flex-col">
                                            <div className="text-sm font-semibold">{loc.name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase flex gap-2">
                                                <span>Code: {loc.code}</span>
                                                {loc.vehicle_number && <span>• Vehicle: {loc.vehicle_number}</span>}
                                            </div>
                                        </div>
                                        <Button
                                            variant={isAssigned ? "destructive" : "default"}
                                            size="sm"
                                            className="h-8"
                                            onClick={async () => {
                                                const { error } = await supabase.rpc('toggle_user_location_access', {
                                                    p_user_id: selectedUser?.user_id,
                                                    p_location_id: loc.id,
                                                    p_assigned_by: currentUser?.id
                                                });

                                                if (error) {
                                                    toast.error(error.message);
                                                } else {
                                                    const updatedUsers = await loadData();
                                                    const updatedUser = updatedUsers.find(u => u.user_id === selectedUser?.user_id);
                                                    if (updatedUser) setSelectedUser(updatedUser);
                                                    emitSoftRefresh();
                                                }
                                            }}
                                        >
                                            {isAssigned ? "Revoke" : "Authorize"}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                            Tip: Users with NO locations assigned will be unable to access location-specific modules like Inventory or POS.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
