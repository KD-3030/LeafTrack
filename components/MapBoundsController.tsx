'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface LocationData {
  _id: string;
  salesman_id: {
    _id: string;
    name: string;
    email: string;
  };
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  address?: string;
}

interface MapBoundsControllerProps {
  locations: LocationData[];
}

export function MapBoundsController({ locations }: MapBoundsControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      try {
        // Create bounds from all location points
        const bounds = L.latLngBounds(
          locations.map(location => [location.latitude, location.longitude])
        );
        
        // Fit map to bounds with some padding
        map.fitBounds(bounds, {
          padding: [20, 20],
          maxZoom: 15, // Don't zoom in too much for single points
        });
        
        // Ensure map tiles refresh properly after bounds change
        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (error) {
        console.error('Error setting map bounds:', error);
      }
    } else {
      // If no locations, set a default view to Kolkata
      map.setView([22.5726, 88.3639], 11); // Kolkata coordinates with city-level zoom
    }
  }, [locations, map]);

  return null; // This component doesn't render anything
}
