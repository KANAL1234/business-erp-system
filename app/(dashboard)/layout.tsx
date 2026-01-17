import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { SidebarProvider } from '@/components/providers/sidebar-provider'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    async function signOut() {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return (
        <SidebarProvider>
            <div className="flex h-screen bg-gray-50">
                {/* Left Sidebar */}
                <Sidebar />

                {/* Main Content Area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Top Header */}
                    <DashboardHeader userEmail={user.email || ''} />

                    {/* Sign Out Form (hidden, triggered by header) */}
                    <form id="signout-form" action={signOut} className="hidden" />

                    {/* Main Content */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}
