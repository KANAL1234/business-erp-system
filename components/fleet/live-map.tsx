'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const supabase = createClient()

export default function LiveFleetMap() {
    const { data: activeTrips } = useQuery({
        queryKey: ['active-fleet-trips'],
        queryFn: async () => {
            // Get active trips
            const { data: trips } = await supabase
                .from('fleet_trips')
                .select(`
                    id,
                    vehicle:vehicles(license_plate),
                    driver:user_profiles!driver_id(full_name)
                `)
                .eq('status', 'IN_PROGRESS')

            if (!trips?.length) return []

            // Get all trip IDs
            const tripIds = trips.map(t => t.id)

            // Fetch latest locations for ALL trips in a single query using distinct on
            const { data: allLocations } = await supabase
                .from('fleet_trip_locations')
                .select('*')
                .in('trip_id', tripIds)
                .order('trip_id')
                .order('recorded_at', { ascending: false })

            // Group locations by trip_id and get the latest one for each
            const latestLocationByTrip = new Map<string, any>()
            allLocations?.forEach(loc => {
                if (!latestLocationByTrip.has(loc.trip_id)) {
                    latestLocationByTrip.set(loc.trip_id, loc)
                }
            })

            // Combine trips with their locations
            return trips
                .map(t => ({ ...t, location: latestLocationByTrip.get(t.id) }))
                .filter(t => t.location)
        },
        refetchInterval: 30000, // Poll every 30s
        staleTime: 25000 // Consider data fresh for 25s
    })

    // Center map (Islamabad default or first trip)
    const center = activeTrips?.[0]?.location
        ? { lat: activeTrips[0].location.latitude, lng: activeTrips[0].location.longitude }
        : { lat: 33.6844, lng: 73.0479 }

    return (
        <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height: '600px', width: '100%', borderRadius: '0.5rem' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {activeTrips?.map((trip: any) => (
                <Marker
                    key={trip.id}
                    position={[trip.location.latitude, trip.location.longitude]}
                >
                    <Popup>
                        <div className="font-sans">
                            <div className="text-sm font-bold">{trip.vehicle?.license_plate || 'Unknown Vehicle'}</div>
                            <div className="text-xs">{trip.driver?.full_name || 'Unknown Driver'}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Speed: {Math.round((trip.location.speed || 0) * 3.6)} km/h
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">
                                Updated: {new Date(trip.location.recorded_at).toLocaleTimeString()}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
