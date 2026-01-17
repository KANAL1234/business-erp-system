'use client'

import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState } from 'react'

// Fix for default markers
if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
}

interface TripRouteMapProps {
    gpsPath: any[]
}

export default function TripRouteMap({ gpsPath }: TripRouteMapProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted || !gpsPath || gpsPath.length === 0) {
        return (
            <div className="h-full w-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                {gpsPath?.length === 0 ? "No GPS data recorded yet" : "Loading map..."}
            </div>
        )
    }

    const positions = gpsPath.map(p => [p.lat, p.lng] as [number, number])
    const center = positions[positions.length - 1]

    return (
        <MapContainer
            center={center}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline positions={positions} color="blue" weight={3} opacity={0.7} />
            <Marker position={center}>
                <Popup>
                    <div className="text-xs font-bold">Current / Last Location</div>
                    <div className="text-[10px] text-gray-500">
                        Recorded at: {new Date(gpsPath[gpsPath.length - 1].time).toLocaleTimeString()}
                    </div>
                </Popup>
            </Marker>
        </MapContainer>
    )
}
