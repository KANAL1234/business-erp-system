'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type SidebarContextType = {
    isOpen: boolean
    toggle: () => void
    setIsOpen: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true)

    // Optional: Persist to localStorage
    useEffect(() => {
        const stored = localStorage.getItem('sidebar-open')
        if (stored !== null) {
            setIsOpen(stored === 'true')
        }
    }, [])

    const toggle = () => {
        setIsOpen(prev => {
            const newValue = !prev
            localStorage.setItem('sidebar-open', String(newValue))
            return newValue
        })
    }

    const setOpenState = (value: boolean) => {
        setIsOpen(value)
        localStorage.setItem('sidebar-open', String(value))
    }

    return (
        <SidebarContext.Provider value={{ isOpen, toggle, setIsOpen: setOpenState }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}
