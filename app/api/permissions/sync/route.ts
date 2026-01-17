import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { PERMISSION_GROUPS, buildPermissionCode } from '@/lib/types/rbac'

const normalizePermissionCode = (code: string) => code.replace(/:/g, '.')

const buildPermissionPayload = () => {
    return PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.flatMap((permission) =>
            permission.actions.map((action) => ({
                module: group.module,
                resource: permission.resource,
                action: action.action,
                permission_code: buildPermissionCode(group.module, permission.resource, action.action),
                description: `${group.label} - ${permission.label}: ${action.label}`,
            }))
        )
    )
}

export async function POST() {
    const supabase = await createClient()
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: roles, error: rolesError } = await supabase.rpc('get_user_roles', {
        p_user_id: user.id,
    })

    if (rolesError) {
        return NextResponse.json({ error: 'Unable to verify role' }, { status: 403 })
    }

    const isSuperAdmin = roles?.some((role: any) => role.role_code === 'SUPER_ADMIN')
    if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()
    const { data: existingPermissions, error: existingError } = await adminSupabase
        .from('permissions')
        .select('permission_code')

    if (existingError) {
        return NextResponse.json({ error: 'Failed to load permissions' }, { status: 500 })
    }

    const existingNormalized = new Set(
        (existingPermissions || []).map((permission) => normalizePermissionCode(permission.permission_code))
    )

    const desiredPermissions = buildPermissionPayload()
    const toInsert = desiredPermissions.filter(
        (permission) => !existingNormalized.has(normalizePermissionCode(permission.permission_code))
    )

    if (toInsert.length === 0) {
        return NextResponse.json({ inserted: 0 })
    }

    const { error: insertError } = await adminSupabase.from('permissions').insert(toInsert)

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ inserted: toInsert.length })
}
