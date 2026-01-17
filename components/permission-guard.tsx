'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { ReactNode } from 'react'

interface PermissionGuardProps {
    permission: string
    children: ReactNode
    fallback?: ReactNode
}

export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
    const { hasPermission, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
            </div>
        )
    }

    if (!hasPermission(permission)) {
        if (fallback) {
            return <>{fallback}</>
        }

        return (
            <div className="flex items-center justify-center h-96">
                <Card className="w-96">
                    <CardContent className="pt-6 text-center">
                        <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold mb-2">Access Denied</p>
                        <p className="text-sm text-muted-foreground">
                            You don't have permission to access this page.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Required permission: <code className="bg-slate-100 px-2 py-1 rounded">{permission}</code>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Contact your administrator to request access.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <>{children}</>
}
