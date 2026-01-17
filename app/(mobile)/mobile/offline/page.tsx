'use client'

import { Button } from '@/components/ui/button'
import { WifiOff, RotateCw, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
    const router = useRouter()

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
            <div className="bg-rose-100 p-6 rounded-full mb-6">
                <WifiOff className="w-12 h-12 text-rose-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">You're Offline</h1>
            <p className="text-slate-500 mb-8 max-w-xs">
                It looks like you don't have an internet connection. Some features may be limited until you're back online.
            </p>

            <div className="flex flex-col w-full gap-3">
                <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-primary hover:bg-primary/90 h-12 rounded-xl"
                >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>

                <Button
                    variant="outline"
                    onClick={() => router.push('/mobile')}
                    className="w-full h-12 rounded-xl border-slate-200"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                </Button>
            </div>

            <p className="mt-10 text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Business-ERP-Software
            </p>
        </div>
    )
}
