'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface UseLocationTrackingOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  highAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useLocationTracking(options: UseLocationTrackingOptions = {}) {
  const {
    enabled = true,
    interval = 5 * 60 * 1000, // 5 minutes
    highAccuracy = true,
    timeout = 10000,
    maximumAge = 60000
  } = options;

  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leaftrack_token');
    }
    return null;
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge
        }
      );
    });
  };

  const sendLocationToServer = async (position: GeolocationPosition) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(locationData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send location');
      }

      setLastLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(),
      });

      setError(null);
      return data.location;

    } catch (error) {
      console.error('Error sending location:', error);
      setError(error instanceof Error ? error.message : 'Failed to send location');
      throw error;
    }
  };

  const trackLocation = async () => {
    try {
      const position = await getCurrentPosition();
      await sendLocationToServer(position);
    } catch (error) {
      console.error('Location tracking error:', error);
      setError(error instanceof Error ? error.message : 'Location tracking failed');
    }
  };

  const startTracking = () => {
    if (!enabled || !user || user.role !== 'Salesman') {
      return;
    }

    if (isTracking) {
      return;
    }

    setIsTracking(true);
    setError(null);

    // Send initial location
    trackLocation();

    // Set up interval for periodic updates
    intervalRef.current = setInterval(trackLocation, interval);

    toast({
      title: "📍 Location tracking started",
      description: "Your location will be updated every 5 minutes",
      duration: 5000,
    });
  };

  const stopTracking = () => {
    setIsTracking(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    toast({
      title: "📍 Location tracking stopped",
      description: "Location updates have been disabled",
      duration: 3000,
    });
  };

  // Auto-start tracking when user logs in as salesman
  useEffect(() => {
    if (user && user.role === 'Salesman' && enabled) {
      // Small delay to ensure user is fully authenticated
      const timer = setTimeout(() => {
        startTracking();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    isTracking,
    lastLocation,
    error,
    startTracking,
    stopTracking,
    trackLocation,
  };
}
