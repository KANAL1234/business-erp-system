'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, User, RefreshCw, ChevronDown, ChevronUp, AlertCircle, Clock, XCircle } from 'lucide-react'
import { useAutoSync } from '@/lib/offline/sync'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { getQueue, QueueItem } from '@/lib/offline/queue'

export default function MobileProfilePage() {
    const { user, roles } = useAuth()
    const { isOnline, isSyncing, stats, syncNow, resetQueueRetries, clearFailedItems } = useAutoSync()
    const router = useRouter()
    const supabase = createClient()
    const [showQueue, setShowQueue] = useState(false)
    const [queueItems, setQueueItems] = useState<QueueItem[]>([])

    // Load queue items when expanded
    useEffect(() => {
        if (showQueue) {
            getQueue().then(setQueueItems)
        }
    }, [showQueue, stats])

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            localStorage.clear()
            window.location.href = '/login'
        } catch (error) {
            console.error('Logout error:', error)
            toast.error('Logout failed')
        }
    }

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-2xl font-bold">My Profile</h1>

            {/* User Info Card */}
            <Card className="p-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{user?.full_name || 'User'}</h2>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        <div className="flex gap-2 mt-2">
                            {roles?.map(role => (
                                <Badge key={role.id} variant="secondary" className="text-xs">
                                    {role.role_name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Sync Status Card */}
            <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Sync Status
                </h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Connection</span>
                        <Badge variant={isOnline ? 'default' : 'destructive'} className={isOnline ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Badge>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Pending Items</span>
                        <span className="font-medium text-primary">{stats.pending}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Retrying</span>
                        <span className="font-medium text-amber-600">{stats.retrying}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Failed</span>
                        <span className="font-medium text-rose-600">{stats.failed}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    await resetQueueRetries()
                                    toast.success('Retries reset. Syncing now...')
                                    syncNow()
                                }}
                                disabled={!isOnline || isSyncing || stats.failed === 0}
                                className="text-xs"
                            >
                                Retry Failed
                            </Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 text-xs"
                                onClick={syncNow}
                                disabled={!isOnline || isSyncing || stats.total === 0}
                            >
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </Button>
                        </div>
                        {stats.failed > 0 && (
                            <Button
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs w-full mt-2 border border-rose-100"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to clear failing items? These changes will be lost.')) {
                                        await clearFailedItems()
                                        toast.success('Failed items cleared')
                                    }
                                }}
                            >
                                Clear All Failed Items
                            </Button>
                        )}
                    </div>

                    {/* Queue Viewer */}
                    {stats.total > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowQueue(!showQueue)}
                                className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-800"
                            >
                                <span>View Queue ({stats.total} items)</span>
                                {showQueue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {showQueue && (
                                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                    {queueItems.map(item => (
                                        <div
                                            key={item.id}
                                            className={`p-3 rounded-lg text-xs ${item.retryCount >= 3
                                                    ? 'bg-rose-50 border border-rose-100'
                                                    : item.retryCount > 0
                                                        ? 'bg-amber-50 border border-amber-100'
                                                        : 'bg-gray-50 border border-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium">{item.action.replace(/_/g, ' ')}</span>
                                                {item.retryCount >= 3 ? (
                                                    <XCircle className="w-3 h-3 text-rose-500" />
                                                ) : item.retryCount > 0 ? (
                                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                                ) : (
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="text-gray-500">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </div>
                                            {item.lastError && (
                                                <div className="mt-1 text-rose-600 truncate">
                                                    Error: {item.lastError}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* App Info */}
            <Card className="p-6">
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <span className="text-gray-600">App Version</span>
                        <span className="font-medium">1.0.0 (PWA)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Build</span>
                        <span className="font-medium">Production</span>
                    </div>
                </div>
            </Card>

            <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-4">
                Business-ERP-Software Mobile • {new Date().getFullYear()}
            </p>
        </div>
    )
}
