'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Next.js/webpack
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapMarker {
  lat: number;
  lng: number;
  popup?: string;
  color?: 'blue' | 'green' | 'red' | 'orange';
}

interface SalesMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

const MARKER_COLORS: Record<string, string> = {
  blue: '2196F3',
  green: '4CAF50',
  red: 'F44336',
  orange: 'FF9800',
};

function createColoredIcon(color: string) {
  const hex = MARKER_COLORS[color] || MARKER_COLORS.blue;
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

export default function SalesMap({ markers, center, zoom = 10, className = '' }: SalesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // If map already exists, remove it
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center: India
    const defaultCenter: [number, number] = center || [26.1, 91.7]; // Assam region

    const map = L.map(mapRef.current).setView(defaultCenter, zoom);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Add markers
    const validMarkers = markers.filter(m => m.lat && m.lng);
    validMarkers.forEach((m) => {
      const icon = m.color ? createColoredIcon(m.color) : undefined;
      const marker = icon
        ? L.marker([m.lat, m.lng], { icon }).addTo(map)
        : L.marker([m.lat, m.lng]).addTo(map);
      if (m.popup) {
        marker.bindPopup(m.popup);
      }
    });

    // Auto-fit bounds if markers exist
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map(m => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers, center, zoom]);

  return <div ref={mapRef} className={`w-full h-[400px] rounded-lg border ${className}`} />;
}
