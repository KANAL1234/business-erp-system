'use client'

import React from 'react'
import { MapPin } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useLocation } from '@/components/providers/location-provider'
import { Badge } from '@/components/ui/badge'

export function LocationSelector() {
    const { currentLocationId, setCurrentLocationId, allowedLocations, loading } = useLocation()

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md animate-pulse">
                <MapPin className="h-4 w-4" />
                <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
            </div>
        )
    }

    if (allowedLocations.length === 0) {
        return (
            <Badge variant="destructive" className="gap-1">
                <MapPin className="h-3 w-3" />
                No Location Access
            </Badge>
        )
    }

    if (allowedLocations.length === 1) {
        // Single location - just show as badge
        return (
            <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20">
                <MapPin className="h-3 w-3" />
                {allowedLocations[0].location_name}
            </Badge>
        )
    }

    // Multiple locations - show dropdown with "All" option
    return (
        <Select value={currentLocationId || 'ALL'} onValueChange={(value) => {
            if (value === 'ALL') {
                // Set to empty string to indicate "all locations"
                setCurrentLocationId('')
            } else {
                setCurrentLocationId(value)
            }
        }}>
            <SelectTrigger className="w-[200px] h-9">
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select Location" />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">
                    <span className="font-medium">All My Locations</span>
                </SelectItem>
                {allowedLocations.map((location) => (
                    <SelectItem key={location.location_id} value={location.location_id}>
                        <span>{location.location_name}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// Compact version for mobile/small spaces
export function LocationSelectorCompact() {
    const { currentLocation, allowedLocations } = useLocation()

    if (allowedLocations.length <= 1) {
        return null
    }

    return (
        <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {currentLocation?.location_code || 'Select'}
        </Badge>
    )
}
