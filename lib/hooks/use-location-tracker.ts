'use client'

import { useState, useEffect, useRef } from 'react'
import { addToQueue } from '@/lib/offline/queue'

export function useLocationTracker() {
    const [isTracking, setIsTracking] = useState(false)
    const [currentTripId, setCurrentTripId] = useState<string | null>(null)
    const watchId = useRef<number | null>(null)

    // Load state from local storage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return

        const savedTripId = localStorage.getItem('current_trip_id')
        if (savedTripId) {
            setCurrentTripId(savedTripId)
            setIsTracking(true)
        }
    }, [])

    const startTracking = async (vehicleId: string, driverId: string, startLocation: string, startMileage: number) => {
        // Generate a UUID v4 compliant string
        const tripId = crypto.randomUUID()

        const tripData = {
            id: tripId,
            vehicle_id: vehicleId,
            driver_id: driverId,
            start_time: new Date().toISOString(),
            start_location: startLocation,
            start_mileage: startMileage,
            status: 'IN_PROGRESS'
        }

        await addToQueue('CREATE_TRIP', tripData)

        setCurrentTripId(tripId)
        setIsTracking(true)
        localStorage.setItem('current_trip_id', tripId)
    }

    const stopTracking = async (endLocation: string, endMileage: number) => {
        if (!currentTripId) return

        const updateData = {
            id: currentTripId,
            end_time: new Date().toISOString(),
            end_location: endLocation,
            end_mileage: endMileage,
            status: 'COMPLETED'
        }

        await addToQueue('UPDATE_TRIP', updateData)

        setCurrentTripId(null)
        setIsTracking(false)
        localStorage.removeItem('current_trip_id')

        if (watchId.current) {
            window.clearInterval(watchId.current)
            watchId.current = null
        }
    }

    // Effect to handle the tracking interval
    useEffect(() => {
        if (!isTracking || !currentTripId) {
            if (watchId.current) {
                window.clearInterval(watchId.current)
                watchId.current = null
            }
            return
        }

        // Capture immediately
        captureLocation(currentTripId)

        // Then every 30s
        watchId.current = window.setInterval(() => {
            captureLocation(currentTripId)
        }, 30000)

        return () => {
            if (watchId.current) window.clearInterval(watchId.current)
        }
    }, [isTracking, currentTripId])

    const captureLocation = (tripId: string) => {
        if (!navigator.geolocation) return

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const locData = {
                    trip_id: tripId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    speed: position.coords.speed || 0,
                    heading: position.coords.heading || 0,
                    accuracy: position.coords.accuracy,
                    recorded_at: new Date().toISOString()
                }
                // Add to queue
                await addToQueue('SAVE_LOCATION', locData)
            },
            (err) => console.error("Location Error:", err),
            { enableHighAccuracy: true }
        )
    }

    return { isTracking, startTracking, stopTracking, currentTripId }
}
