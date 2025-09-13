'use client';


import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Map, MapPin, Navigation, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { 
    ssr: false,
    loading: () => <div>Loading map...</div>
  }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface LocationResponse {
  success: boolean;
  location?: {
    _id: string;
    salesman_id: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
  };
  error?: string;
}

interface LocationData {
  _id: string;
  salesman_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export default function SalesmanLocationMap() {
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Ensure we're on the client side before rendering Leaflet components
  useEffect(() => {
    setIsClient(true);
  }, []);

  const getAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leaftrack_token');
    }
    return null;
  }, []);

  const loadCurrentLocation = useCallback(async () => {
    if (!user || user.role !== 'Salesman') return;

    try {
      setIsLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get current location from browser
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      // Send location to server
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
        }),
      });

      const data: LocationResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update location');
      }

      // Update current location state
      if (data.location) {
        setCurrentLocation({
          _id: data.location._id,
          salesman_id: data.location.salesman_id,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          accuracy: data.location.accuracy,
          timestamp: data.location.timestamp,
        });
      }

    } catch (error) {
      console.error('Error loading current location:', error);
      let errorMessage = 'Failed to get location';
      
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your GPS.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user, getAuthToken]);

  const startLocationTracking = useCallback(() => {
    setIsTracking(true);
    loadCurrentLocation();
    
    // Update location every 5 minutes
    const interval = setInterval(() => {
      loadCurrentLocation();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadCurrentLocation]);

  const stopLocationTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short',
      dateStyle: 'short'
    }).format(new Date(timestamp));
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Don't render for non-salesman users
  if (!user || user.role !== 'Salesman') {
    return null;
  }

  // Default center - Kolkata, West Bengal, India
  const defaultCenter: [number, number] = [22.5726, 88.3639];
  const mapCenter: [number, number] = currentLocation 
    ? [currentLocation.latitude, currentLocation.longitude]
    : defaultCenter;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">My Location</CardTitle>
          </div>
          <Badge variant={isTracking ? "default" : "secondary"}>
            {isTracking ? "Tracking" : "Inactive"}
          </Badge>
        </div>
        <CardDescription>
          View and track your current location
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant={isTracking ? "destructive" : "default"}
            size="sm"
            onClick={isTracking ? stopLocationTracking : startLocationTracking}
            disabled={isLoading}
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadCurrentLocation}
            disabled={isLoading}
          >
            <Clock className="h-4 w-4 mr-2" />
            Update Now
          </Button>
        </div>

        {/* Current Location Info */}
        {currentLocation && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Current Location</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coordinates:</span>
                <span className="font-mono text-blue-900">
                  {formatCoordinates(currentLocation.latitude, currentLocation.longitude)}
                </span>
              </div>
              
              {currentLocation.accuracy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="text-blue-900">±{Math.round(currentLocation.accuracy)}m</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="text-blue-900">{formatTimestamp(currentLocation.timestamp)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Map Container */}
        {isClient ? (
          <div className="relative">
            <MapContainer
              center={mapCenter}
              zoom={currentLocation ? 15 : 10}
              className="h-64 w-full rounded-lg border"
              style={{ height: '300px', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              
              {currentLocation && (
                <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div>
                        <strong>{user.name}</strong>
                        <br />
                        <span className="text-sm text-gray-600">{user.email}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>📍 {formatCoordinates(currentLocation.latitude, currentLocation.longitude)}</div>
                        {currentLocation.accuracy && <div>🎯 Accuracy: ±{Math.round(currentLocation.accuracy)}m</div>}
                        <div>🕐 {formatTimestamp(currentLocation.timestamp)}</div>
                      </div>
                      <Badge variant="default">
                        Your Location
                      </Badge>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center p-6">
              <Map className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">Loading map...</p>
            </div>
          </div>
        )}

        {/* Status Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Status: {isTracking ? 'Active tracking' : 'Manual updates only'}</span>
          {currentLocation && (
            <span>Last updated: {formatTimestamp(currentLocation.timestamp)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}