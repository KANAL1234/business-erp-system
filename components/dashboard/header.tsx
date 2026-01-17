'use client'

import { LocationSelector } from '@/components/location-selector'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut, User, ChevronDown, PanelLeft } from "lucide-react"
import { useSidebar } from "@/components/providers/sidebar-provider"

export function DashboardHeader({ userEmail }: { userEmail: string }) {
    const router = useRouter()
    const { toggle, isOpen } = useSidebar()

    const handleLogout = async () => {
        const logoutToast = toast.loading('Logging out...');
        try {
            const supabase = createClient()
            await supabase.auth.signOut()

            // Clear all local storage to prevent state leakage
            localStorage.clear();

            // Use window.location.href instead of router.push for a full clean redirect
            window.location.href = '/login'
        } catch (error) {
            console.error('Logout error:', error)
            toast.error('Logout failed', { id: logoutToast });
        }
    }

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggle}
                    className="md:hidden lg:flex"
                    aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                    <PanelLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold text-slate-900">Business-ERP-Software</h2>
            </div>
            <div className="flex items-center gap-4">
                <LocationSelector />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 p-2 h-auto hover:bg-slate-100">
                            <div className="flex bg-slate-100 p-2 rounded-full">
                                <User className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="text-left hidden md:block">
                                <p className="text-sm font-medium leading-none">Account</p>
                                <p className="text-xs text-muted-foreground">{userEmail}</p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuLabel className="font-normal text-xs text-muted-foreground pt-0">
                            {userEmail}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
