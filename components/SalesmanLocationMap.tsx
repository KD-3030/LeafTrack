'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, RefreshCw, Navigation, Clock, AlertCircle, Map } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OSM_CONFIG, OSM_GEOCODING, MAP_UTILS, MapStyle } from '@/lib/osmConfig';
import { createPersonalizedIcon } from '@/lib/leafletIcons';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

// Component to handle map resizing after load
const MapResizer = dynamic(() => 
  import('react-leaflet').then((mod) => {
    const { useMap } = mod;
    return function MapResizer() {
      const map = useMap();
      
      useEffect(() => {
        // Fix for map not displaying properly - invalidate size after mount
        const timer = setTimeout(() => {
          map.invalidateSize();
        }, 100);
        
        return () => clearTimeout(timer);
      }, [map]);
      
      return null;
    };
  }), 
  { ssr: false }
);

interface LocationData {
  _id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  address?: string;
}

interface SalesmanLocationMapProps {
  className?: string;
}

export default function SalesmanLocationMap({ className }: SalesmanLocationMapProps) {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('STANDARD');
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [markerIcon, setMarkerIcon] = useState<any>(null);
  
  // Default center - Kolkata, West Bengal, India
  const defaultCenter: [number, number] = [22.5726, 88.3639];
  const currentMapConfig = OSM_CONFIG[mapStyle];

  // Load marker icon
  useEffect(() => {
    const loadMarkerIcon = async () => {
      if (user) {
        try {
          const icon = await createPersonalizedIcon(user.id || user._id, 'Salesman', new Date().toISOString());
          setMarkerIcon(icon);
        } catch (error) {
          console.error('Failed to load marker icon:', error);
        }
      }
    };

    loadMarkerIcon();
  }, [user]);

  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short',
      dateStyle: 'short'
    }).format(new Date(timestamp));
  };

  // Get address for location (reverse geocoding)
  const getLocationAddress = async (lat: number, lon: number): Promise<string> => {
    try {
      const address = await OSM_GEOCODING.reverseGeocode(lat, lon);
      return address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  };

  // Load current location
  const loadCurrentLocation = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('leaftrack_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/locations?hours=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch location data');
      }

      // Find the most recent location for the current user
      const userLocations = data.locations.filter((loc: any) => 
        loc.salesman_id._id === user.id || loc.salesman_id._id === user._id
      );

      if (userLocations.length > 0) {
        // Get the most recent location
        const sortedLocations = userLocations.sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        const location = sortedLocations[0];
        const locationData: LocationData = {
          _id: location._id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp
        };

        setCurrentLocation(locationData);

        // Load address for the location
        setIsLoadingAddress(true);
        try {
          const address = await getLocationAddress(location.latitude, location.longitude);
          setLocationAddress(address);
        } catch (error) {
          console.error('Failed to get address:', error);
          setLocationAddress(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
        } finally {
          setIsLoadingAddress(false);
        }
      } else {
        setCurrentLocation(null);
        setLocationAddress('');
        setError('No recent location data found. Please ensure location tracking is enabled.');
      }
    } catch (error) {
      console.error('Error loading location:', error);
      setError(error instanceof Error ? error.message : 'Failed to load location data');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current location using browser geolocation
  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Send location to server
          const token = localStorage.getItem('leaftrack_token');
          if (!token) {
            throw new Error('Authentication token not found');
          }

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
            }),
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to save location');
          }

          // Update current location display
          const locationData: LocationData = {
            _id: data.location._id,
            latitude,
            longitude,
            accuracy,
            timestamp: new Date().toISOString()
          };

          setCurrentLocation(locationData);

          // Load address for the new location
          setIsLoadingAddress(true);
          try {
            const address = await getLocationAddress(latitude, longitude);
            setLocationAddress(address);
          } catch (error) {
            console.error('Failed to get address:', error);
            setLocationAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } finally {
            setIsLoadingAddress(false);
          }

        } catch (error) {
          console.error('Error saving location:', error);
          setError(error instanceof Error ? error.message : 'Failed to save location');
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get current location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Load location on component mount
  useEffect(() => {
    loadCurrentLocation();
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadCurrentLocation, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const mapCenter: [number, number] = currentLocation 
    ? [currentLocation.latitude, currentLocation.longitude]
    : defaultCenter;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">My Location</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {currentLocation && (
              <Badge variant="default" className="text-xs">
                <Navigation className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
            {isLoadingAddress && (
              <Badge variant="outline" className="text-xs">
                Loading address...
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Your current location on the map
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map Style Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Map className="h-4 w-4" />
            <span className="text-sm font-medium">Map Style:</span>
          </div>
          <Select value={mapStyle} onValueChange={(value) => setMapStyle(value as MapStyle)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="HUMANITARIAN">Humanitarian</SelectItem>
              <SelectItem value="DARK">Dark Theme</SelectItem>
              <SelectItem value="LIGHT">Light Theme</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Map Container */}
        <div className="relative h-64 w-full bg-gray-100 rounded-lg overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={currentLocation ? 15 : 10}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution={currentMapConfig.attribution}
              url={currentMapConfig.url}
              maxZoom={currentMapConfig.maxZoom}
            />
            
            <MapResizer />
            
            {/* Current Location Marker */}
            {currentLocation && markerIcon && (
              <Marker
                position={[currentLocation.latitude, currentLocation.longitude]}
                icon={markerIcon}
              >
                <Popup>
                  <div className="space-y-2 min-w-[200px]">
                    <div>
                      <strong>📍 My Current Location</strong>
                      <br />
                      <span className="text-sm text-gray-600">{user?.name}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span>📍 Coordinates:</span>
                        <button 
                          onClick={() => copyToClipboard(`${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Copy coordinates"
                        >
                          {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                        </button>
                      </div>
                      {locationAddress && (
                        <div className="flex items-start justify-between">
                          <span>🏠 Address:</span>
                          <button 
                            onClick={() => copyToClipboard(locationAddress)}
                            className="text-blue-600 hover:text-blue-800 text-xs max-w-[150px] text-right"
                            title="Copy address"
                          >
                            {locationAddress}
                          </button>
                        </div>
                      )}
                      {currentLocation.accuracy && <div>🎯 Accuracy: ±{Math.round(currentLocation.accuracy)}m</div>}
                      <div>🕐 {formatTimestamp(currentLocation.timestamp)}</div>
                    </div>
                    <Badge variant="default" className="text-xs">
                      Current Location
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
          
          {/* Update Location Button Overlay */}
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 z-[1000] bg-white shadow-md"
            onClick={getCurrentPosition}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Location Info */}
        {currentLocation && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Current Location Details</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coordinates:</span>
                <span className="font-mono text-blue-900">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </span>
              </div>
              
              {locationAddress && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="text-blue-900 text-right max-w-[200px]">{locationAddress}</span>
                </div>
              )}
              
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

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentPosition}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Updating...' : 'Update Location'}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={loadCurrentLocation}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Info Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {currentLocation ? 'Map updates automatically every 30 seconds' : 'Click "Update Location" to show your position on the map'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
