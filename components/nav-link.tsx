'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface NavLinkProps {
    href: string
    permission: string
    children: ReactNode
    className?: string
}

export function NavLink({ href, permission, children, className }: NavLinkProps) {
    const { hasPermission, loading } = useAuth()

    if (loading) {
        return (
            <div className={cn(className, "opacity-50 animate-pulse")}>
                {children}
            </div>
        )
    }

    const hasAccess = hasPermission(permission)

    if (!hasAccess) {
        return (
            <div
                className={cn(
                    className,
                    "opacity-50 cursor-not-allowed"
                )}
                title="Access Denied - Contact administrator"
            >
                {children}
                <Lock className="h-3 w-3 text-red-500 ml-auto" />
            </div>
        )
    }

    return (
        <Link href={href} className={className}>
            {children}
        </Link>
    )
}
