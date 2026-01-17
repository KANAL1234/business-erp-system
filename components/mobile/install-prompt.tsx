// components/mobile/install-prompt.tsx
'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('install-prompt-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < oneWeek) {
        return // Don't show for a week after dismissal
      }
    }

    // Listen for install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted install')
      setInstallPrompt(null)
      setShowPrompt(false)
      setIsInstalled(true)
    } else {
      console.log('User dismissed install')
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('install-prompt-dismissed', Date.now().toString())
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/90 text-white p-4 shadow-2xl z-[60] animate-in slide-in-from-top duration-300">
      <div className="max-w-md mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-5 h-5" />
              <p className="font-semibold text-lg">Install Business-ERP-Software App</p>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Install on your home screen for quick access and offline use
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-primary hover:bg-primary/5 font-semibold"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Install App
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="text-white hover:bg-white/10"
            size="lg"
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  )
}

// iOS Safari install instructions
export function IOSInstallInstructions() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

    if (isIOS && !isInStandaloneMode) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-primary text-white px-4 py-2 z-[60] pt-safe shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between gap-4">
        <div className="text-xs sm:text-sm">
          <span className="font-bold block sm:inline">Install on iOS:</span>
          <span className="opacity-90"> Tap the Share button <span className="inline-block border border-white/40 px-1 rounded text-[10px]">↑</span> then "Add to Home Screen"</span>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-white/80 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
