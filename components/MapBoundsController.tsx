'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapBoundsControllerProps {
  locations: Array<{ latitude: number; longitude: number }>;
}

export function MapBoundsController({ locations }: MapBoundsControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [locations, map]);

  return null;
}
