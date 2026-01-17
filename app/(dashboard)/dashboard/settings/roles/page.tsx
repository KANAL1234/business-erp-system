'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Save, Trash2, Check, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { PermissionGuard } from '@/components/permission-guard';
import { Role, PermissionCheck, PERMISSION_GROUPS, buildPermissionCode } from '@/lib/types/rbac';
import { emitSoftRefresh } from '@/lib/soft-refresh';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const supabase = createClient();

export default function RoleManagementPage() {
    return (
        <PermissionGuard permission="settings.roles.manage">
            <RoleManagementContent />
        </PermissionGuard>
    )
}

function RoleManagementContent() {
    const { user: currentUser, logAction, isAdmin } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<PermissionCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newRole, setNewRole] = useState({ role_name: '', role_code: '', description: '' });
    const [syncingPermissions, setSyncingPermissions] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permissionsRes] = await Promise.all([
                supabase.from('roles').select('*').order('role_name'),
                supabase.from('permissions').select('*').order('module, resource, action')
            ]);

            if (rolesRes.data) setRoles(rolesRes.data);
            if (permissionsRes.data) setPermissions(permissionsRes.data);

            if (rolesRes.data && rolesRes.data.length > 0 && !selectedRole) {
                handleSelectRole(rolesRes.data[0]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRole = async (role: Role) => {
        setLoading(true);
        setSelectedRole(role);
        try {
            // Fetch permissions directly from the join table since the RPC might be missing
            const { data, error } = await supabase
                .from('role_permissions')
                .select('permission_id')
                .eq('role_id', role.id);

            if (error) throw error;

            if (data) {
                setRolePermissions(data.map((rp: any) => rp.permission_id));
            } else {
                setRolePermissions([]);
            }
        } catch (error) {
            console.error('Error loading role permissions:', error);
            toast.error('Failed to load permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async () => {
        try {
            const { data, error } = await supabase.from('roles').insert([
                { ...newRole, is_system_role: false, is_active: true }
            ]).select().single();

            if (error) throw error;

            toast.success('Role created successfully');
            setShowCreateDialog(false);
            setNewRole({ role_name: '', role_code: '', description: '' });

            // Manually update local state to ensure immediate visibility
            if (data) {
                setRoles(prev => [...prev, data].sort((a, b) => a.role_name.localeCompare(b.role_name)));
                handleSelectRole(data);
            }

            // Background refresh to be safe
            loadData();
            emitSoftRefresh();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;

        try {
            const { error } = await supabase.rpc('assign_permissions_to_role', {
                p_role_id: selectedRole.id,
                p_permission_ids: rolePermissions,
                p_assigned_by: currentUser?.id
            });

            if (error) throw error;

            toast.success('Permissions saved successfully');
            await logAction('update_role_permissions', 'settings', 'roles', selectedRole.id);
            emitSoftRefresh();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSyncPermissions = async () => {
        setSyncingPermissions(true);
        try {
            const response = await fetch('/api/permissions/sync', { method: 'POST' });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result?.error || 'Failed to sync permissions');
            }

            toast.success(`Permissions synced (${result?.inserted || 0} added)`);
            await logAction('sync_permissions', 'settings', 'roles');
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to sync permissions');
        } finally {
            setSyncingPermissions(false);
        }
    };

    const togglePermission = (id: string) => {
        setRolePermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const groupedPermissions = permissions.reduce((acc: any, p: any) => {
        const key = `${p.module} / ${p.resource}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    const normalizePermissionCode = (code: string) => code.replace(/:/g, '.');

    const missingPermissionCount = (() => {
        const existing = new Set(permissions.map((p) => normalizePermissionCode(p.permission_code)));
        const desired = PERMISSION_GROUPS.flatMap((group) =>
            group.permissions.flatMap((permission) =>
                permission.actions.map((action) =>
                    normalizePermissionCode(buildPermissionCode(group.module, permission.resource, action.action))
                )
            )
        );
        return desired.filter((code) => !existing.has(code)).length;
    })();

    return (
        <div className="h-[calc(100vh-112px)] flex flex-col space-y-4 overflow-hidden">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
                    <p className="text-muted-foreground">Define roles and assign fine-grained allowances.</p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin() && (
                        <Button
                            variant="outline"
                            onClick={handleSyncPermissions}
                            disabled={syncingPermissions || missingPermissionCount === 0}
                        >
                            <Shield className="mr-2 h-4 w-4" />
                            {syncingPermissions ? 'Syncing...' : missingPermissionCount === 0 ? 'All Synced' : 'Sync Permissions'}
                        </Button>
                    )}
                    <PermissionGuard permission="settings.roles.manage">
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Role
                        </Button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
                {/* Roles Side List */}
                <Card className="col-span-4 flex flex-col overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg">Roles</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                        <div className="divide-y">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => handleSelectRole(role)}
                                    className={`w-full text-left p-4 hover:bg-muted transition-colors flex items-center justify-between ${selectedRole?.id === role.id ? 'bg-muted border-l-4 border-primary' : ''}`}
                                >
                                    <div>
                                        <div className="font-semibold text-sm">{role.role_name}</div>
                                        <div className="text-xs text-muted-foreground">{role.role_code}</div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Permissions Grid */}
                <Card className="col-span-8 flex flex-col overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">
                                {selectedRole ? `Allowances for ${selectedRole.role_name}` : 'Select a Role'}
                            </CardTitle>
                            <CardDescription>
                                {selectedRole?.description || 'Pick a role from the left to manage its permissions.'}
                            </CardDescription>
                        </div>
                        {selectedRole && (
                            <Button onClick={handleSavePermissions}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pt-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">Loading permissions...</div>
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupedPermissions).map(([title, perms]: [string, any]) => (
                                    <div key={title} className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">{title}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {perms.map((p: any) => (
                                                <div key={p.id} className="flex items-start space-x-3 space-y-0 border p-3 rounded-md hover:border-primary transition-colors cursor-pointer" onClick={() => togglePermission(p.id)}>
                                                    <Checkbox
                                                        checked={rolePermissions.includes(p.id)}
                                                        onCheckedChange={() => togglePermission(p.id)}
                                                    />
                                                    <div className="space-y-1 leading-none">
                                                        <Label className="text-sm font-medium leading-none cursor-pointer">
                                                            {p.action.charAt(0).toUpperCase() + p.action.slice(1)} {p.resource}
                                                        </Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {p.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create Role Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                        <DialogDescription>Add a new role to the system that can be assigned to users.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Role Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Sales Manager"
                                value={newRole.role_name}
                                onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code">Role Code (Unique)</Label>
                            <Input
                                id="code"
                                placeholder="e.g. SALES_MANAGER"
                                value={newRole.role_code}
                                onChange={(e) => setNewRole({ ...newRole, role_code: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="desc">Description</Label>
                            <Input
                                id="desc"
                                placeholder="Briefly describe what this role does"
                                value={newRole.description}
                                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateRole}>Create Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
