'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './auth-provider'

interface LocationContextType {
    currentLocationId: string | null
    setCurrentLocationId: (locationId: string) => void
    currentLocation: { location_id: string; location_name: string; location_code: string } | null
    allowedLocations: { location_id: string; location_name: string; location_code: string }[]
    allowedLocationIds: string[] // Helper for filtering
    validateLocationAccess: (locationId: string) => boolean
    loading: boolean
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
    const { allowedLocations, hasLocationAccess, isAdmin, loading: authLoading } = useAuth()
    const [currentLocationId, setCurrentLocationIdState] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Load saved location from localStorage on mount
    useEffect(() => {
        if (authLoading) return

        const savedLocationId = localStorage.getItem('currentLocationId')

        if (savedLocationId && (hasLocationAccess(savedLocationId) || isAdmin())) {
            setCurrentLocationIdState(savedLocationId)
        } else if (allowedLocations.length > 0) {
            // Auto-select first allowed location
            setCurrentLocationIdState(allowedLocations[0].location_id)
            localStorage.setItem('currentLocationId', allowedLocations[0].location_id)
        }

        setLoading(false)
    }, [allowedLocations, hasLocationAccess, isAdmin, authLoading])

    const setCurrentLocationId = (locationId: string) => {
        if (!hasLocationAccess(locationId) && !isAdmin()) {
            console.error('Access denied to location:', locationId)
            return
        }

        setCurrentLocationIdState(locationId)
        localStorage.setItem('currentLocationId', locationId)
    }

    const validateLocationAccess = (locationId: string): boolean => {
        return hasLocationAccess(locationId) || isAdmin()
    }

    const currentLocation = allowedLocations.find(l => l.location_id === currentLocationId) || null
    const allowedLocationIds = allowedLocations.map(l => l.location_id)

    const value = {
        currentLocationId,
        setCurrentLocationId,
        currentLocation,
        allowedLocations,
        allowedLocationIds,
        validateLocationAccess,
        loading: loading || authLoading
    }

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
    const context = useContext(LocationContext)
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider')
    }
    return context
}

// Hook for components that require a location to be selected
export function useRequireLocation() {
    const context = useLocation()

    if (!context.currentLocationId && !context.loading) {
        throw new Error('No location selected. Please select a location to continue.')
    }

    return context
}

// Hook for validating location access
export function useLocationAccess(locationId: string | null | undefined) {
    const { validateLocationAccess, loading } = useLocation()

    if (!locationId) {
        return { hasAccess: false, loading }
    }

    return {
        hasAccess: validateLocationAccess(locationId),
        loading
    }
}
