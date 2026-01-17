'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            toast.error('Login Failed', {
                description: error.message,
            })
        } else {
            toast.success('Logged in successfully!')

            // Check user role for redirection
            const { data: userRoles } = await supabase
                .from('user_roles')
                .select('roles(role_name, role_code)')
                .eq('user_id', data.user.id)

            const roles = userRoles?.map((ur: any) => ur.roles.role_name.toLowerCase()) || []
            const roleCodes = userRoles?.map((ur: any) => ur.roles.role_code) || []

            // Redirect Drivers/Sales Staff to Mobile App
            if (roles.includes('driver') || roleCodes.includes('SALES_STAFF')) {
                router.push('/mobile/select-vehicle')
            } else {
                router.push('/dashboard')
            }

            router.refresh()
        }

        setLoading(false)
    }

    const handleSignUp = async () => {
        setLoading(true)

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            toast.error('Sign Up Failed', {
                description: error.message,
            })
        } else {
            toast.success('Account created! Please log in.')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold">Business-ERP-Software</CardTitle>
                    <CardDescription>Sign in to access the system</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@bismillah.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1" disabled={loading}>
                                {loading ? 'Loading...' : 'Sign In'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSignUp}
                                disabled={loading}
                            >
                                Sign Up
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
