'use client';

import { OSM_GEOCODING } from '@/lib/osmConfig';

interface EnhancedLocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  address?: string;
}

export class LocationService {
  // Enhanced location tracking with address resolution
  static async getCurrentLocationWithAddress(): Promise<EnhancedLocationData | null> {
    try {
      // Get current position
      const position = await this.getCurrentPosition();
      
      // Get address using reverse geocoding
      const address = await OSM_GEOCODING.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
        address: address || undefined,
      };
    } catch (error) {
      console.error('Enhanced location tracking error:', error);
      return null;
    }
  }
  
  // Standard geolocation
  static getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }
  
  // Calculate area coverage for multiple locations
  static getLocationsBounds(locations: Array<{ latitude: number; longitude: number }>) {
    if (locations.length === 0) return null;
    
    const lats = locations.map(l => l.latitude);
    const lons = locations.map(l => l.longitude);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons),
      center: {
        lat: (Math.max(...lats) + Math.min(...lats)) / 2,
        lon: (Math.max(...lons) + Math.min(...lons)) / 2,
      }
    };
  }
  
  // Format coordinates for display
  static formatCoordinates(lat: number, lon: number, precision: number = 6): string {
    return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
  }
  
  // Validate coordinates
  static isValidCoordinates(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }
  
  // Get location accuracy description
  static getAccuracyDescription(accuracy?: number): string {
    if (!accuracy) return 'Unknown';
    
    if (accuracy <= 5) return 'Excellent (≤5m)';
    if (accuracy <= 10) return 'Good (≤10m)';
    if (accuracy <= 25) return 'Fair (≤25m)';
    if (accuracy <= 50) return 'Poor (≤50m)';
    return `Very Poor (${Math.round(accuracy)}m)`;
  }
}

// React hook for enhanced location tracking
import { useEffect, useState, useRef } from 'react';

export function useEnhancedLocationTracking(options: {
  enabled?: boolean;
  interval?: number;
  includeAddress?: boolean;
} = {}) {
  const {
    enabled = true,
    interval = 5 * 60 * 1000, // 5 minutes
    includeAddress = true
  } = options;

  const [currentLocation, setCurrentLocation] = useState<EnhancedLocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateLocation = async () => {
    try {
      setError(null);
      
      if (includeAddress) {
        const location = await LocationService.getCurrentLocationWithAddress();
        setCurrentLocation(location);
      } else {
        const position = await LocationService.getCurrentPosition();
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Location tracking failed';
      setError(errorMessage);
      console.error('Location update error:', error);
    }
  };

  const startTracking = () => {
    if (!enabled) return;
    
    setIsTracking(true);
    updateLocation(); // Initial update
    
    intervalRef.current = setInterval(updateLocation, interval);
  };

  const stopTracking = () => {
    setIsTracking(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (enabled) {
      startTracking();
    }
    
    return () => stopTracking();
  }, [enabled, interval]);

  return {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking,
    updateLocation,
  };
}
