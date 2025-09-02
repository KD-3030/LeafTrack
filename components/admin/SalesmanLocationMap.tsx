'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, RefreshCw, Users, Clock, AlertCircle, Map } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { OSM_CONFIG, OSM_GEOCODING, MAP_UTILS, MapStyle } from '@/lib/osmConfig';
import { createColoredIcon } from '@/lib/leafletIcons';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const MapBoundsController = dynamic(() => import('@/components/MapBoundsController').then((mod) => mod.MapBoundsController), { ssr: false });

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
  salesman_id: {
    _id: string;
    name: string;
    email: string;
  };
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  address?: string; // For reverse geocoded address
}

interface MapComponentProps {
  locations: LocationData[];
  onRefresh: () => void;
  isLoading: boolean;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
}

function MapComponent({ locations, onRefresh, isLoading, mapStyle, onMapStyleChange }: MapComponentProps) {
  // Default center - Kolkata, West Bengal, India
  const defaultCenter: [number, number] = [22.5726, 88.3639]; // Kolkata coordinates
  const [locationAddresses, setLocationAddresses] = useState<{[key: string]: string}>({});
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  
  const currentMapConfig = OSM_CONFIG[mapStyle];
  
  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'short',
      dateStyle: 'short'
    }).format(new Date(timestamp));
  };

  const getMarkerColor = (timestamp: string) => {
    const now = new Date();
    const locationTime = new Date(timestamp);
    const diffMinutes = (now.getTime() - locationTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 10) return 'green'; // Very recent
    if (diffMinutes < 30) return 'orange'; // Recent
    return 'red'; // Old
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

  // Load addresses for all locations
  useEffect(() => {
    const loadAddresses = async () => {
      if (locations.length === 0) return;
      
      // Process only new locations that don't have addresses yet
      const locationsNeedingAddresses = locations.filter(
        location => !locationAddresses[location._id]
      );
      
      if (locationsNeedingAddresses.length === 0) return;
      
      setIsLoadingAddresses(true);
      
      try {
        // Process in small batches to avoid overwhelming the API
        const batchSize = 3;
        for (let i = 0; i < locationsNeedingAddresses.length; i += batchSize) {
          const batch = locationsNeedingAddresses.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (location) => {
            try {
              const address = await getLocationAddress(location.latitude, location.longitude);
              return { id: location._id, address };
            } catch (error) {
              console.error(`Failed to get address for location ${location._id}:`, error);
              return { 
                id: location._id, 
                address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` 
              };
            }
          });

          try {
            const results = await Promise.all(batchPromises);
            const newAddresses: {[key: string]: string} = {};
            
            results.forEach((result) => {
              if (result && result.address) {
                newAddresses[result.id] = result.address;
              }
            });

            if (Object.keys(newAddresses).length > 0) {
              setLocationAddresses(prev => ({ ...prev, ...newAddresses }));
            }
          } catch (error) {
            console.error('Batch address loading failed:', error);
          }
          
          // Add delay between batches to respect rate limiting
          if (i + batchSize < locationsNeedingAddresses.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    // Debounce the address loading
    const timeoutId = setTimeout(loadAddresses, 1000);
    return () => clearTimeout(timeoutId);
  }, [locations]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
        {/* Map Style Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Map className="h-4 w-4" />
            <span className="text-sm font-medium">Map Style:</span>
            {isLoadingAddresses && (
              <Badge variant="outline" className="text-xs">
                Loading addresses...
              </Badge>
            )}
          </div>
          <Select value={mapStyle} onValueChange={(value) => onMapStyleChange(value as MapStyle)}>
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
        </div>      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution={currentMapConfig.attribution}
            url={currentMapConfig.url}
            maxZoom={currentMapConfig.maxZoom}
          />
          
          <MapResizer />
          <MapBoundsController locations={locations} />
          
          {locations.map((location) => {
            const markerColor = getMarkerColor(location.timestamp);
            return (
              <Marker
                key={location._id}
                position={[location.latitude, location.longitude]}
                icon={createColoredIcon(markerColor)}
              >
              <Popup>
                <div className="space-y-2 min-w-[200px]">
                  <div>
                    <strong>{location.salesman_id.name}</strong>
                    <br />
                    <span className="text-sm text-gray-600">{location.salesman_id.email}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span>📍 Coordinates:</span>
                      <button 
                        onClick={() => copyToClipboard(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                        title="Copy coordinates"
                      >
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </button>
                    </div>
                    {locationAddresses[location._id] && 
                     locationAddresses[location._id] !== `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` && (
                      <div className="flex items-start justify-between">
                        <span>🏠 Address:</span>
                        <button 
                          onClick={() => copyToClipboard(locationAddresses[location._id])}
                          className="text-blue-600 hover:text-blue-800 text-xs max-w-[150px] text-right"
                          title="Copy address"
                        >
                          {locationAddresses[location._id]}
                        </button>
                      </div>
                    )}
                    {location.accuracy && <div>🎯 Accuracy: ±{Math.round(location.accuracy)}m</div>}
                    <div>🕐 {formatTimestamp(location.timestamp)}</div>
                  </div>
                  <Badge variant={getMarkerColor(location.timestamp) === 'green' ? 'default' : 'secondary'}>
                    {getMarkerColor(location.timestamp) === 'green' ? 'Live' : 
                     getMarkerColor(location.timestamp) === 'orange' ? 'Recent' : 'Stale'}
                  </Badge>
                </div>
              </Popup>
            </Marker>
            );
          })}
        </MapContainer>
        
        {/* Refresh Button Overlay */}
        <Button
          variant="outline"
          size="sm"
          className="absolute top-2 right-2 z-[1000] bg-white shadow-md"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}

export default function SalesmanLocationMap() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('1');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyle>('STANDARD');
  const [isGeneratingTestData, setIsGeneratingTestData] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leaftrack_token');
    }
    return null;
  };

  const clearOldData = async () => {
    try {
      setIsClearingData(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/clear-locations', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to clear old data');
      }

      // Refresh locations after clearing
      await fetchLocations();
    } catch (error) {
      console.error('Error clearing old data:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear old data');
    } finally {
      setIsClearingData(false);
    }
  };

  const generateTestData = async () => {
    try {
      setIsGeneratingTestData(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // First create test users if they don't exist
      const usersResponse = await fetch('/api/test-users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const usersData = await usersResponse.json();
      if (!usersData.success) {
        throw new Error(usersData.error || 'Failed to create test users');
      }

      // Then create test locations
      const locationsResponse = await fetch('/api/test-locations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const locationsData = await locationsResponse.json();
      if (!locationsData.success) {
        throw new Error(locationsData.error || 'Failed to generate test data');
      }

      // Refresh locations after generating test data
      await fetchLocations();
    } catch (error) {
      console.error('Error generating test data:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate test data');
    } finally {
      setIsGeneratingTestData(false);
    }
  };

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/locations?hours=${timeFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch locations');
      }

      setLocations(data.locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchLocations, 300000); // 5 minutes (300,000 ms)
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, timeFilter]);

  // Initial fetch and when time filter changes
  useEffect(() => {
    if (user && user.role === 'Admin') {
      fetchLocations();
    }
  }, [user, timeFilter]);

  // Don't render for non-admin users
  if (!user || user.role !== 'Admin') {
    return null;
  }

  const uniqueSalesmen = new Set(locations.map(loc => loc.salesman_id._id)).size;
  const recentLocations = locations.filter(loc => {
    const diffMinutes = (new Date().getTime() - new Date(loc.timestamp).getTime()) / (1000 * 60);
    return diffMinutes < 10;
  }).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Salesman Locations</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{uniqueSalesmen} Active</span>
            </Badge>
            <Badge variant={recentLocations > 0 ? "default" : "secondary"} className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{recentLocations} Live</span>
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <CardDescription>
            Real-time tracking of field sales team locations
          </CardDescription>
          
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last Hour</SelectItem>
              <SelectItem value="6">Last 6 Hours</SelectItem>
              <SelectItem value="24">Last Day</SelectItem>
              <SelectItem value="168">Last Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {!isLoading && locations.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-96 border rounded-lg bg-gray-50">
            <MapPin className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Location Data</h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              No salesman locations found for the selected time period. 
              {timeFilter === '1' ? ' Try expanding the time range to see more data.' : ''}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={fetchLocations} 
                variant="outline" 
                size="sm" 
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={clearOldData} 
                variant="destructive" 
                size="sm" 
                disabled={isClearingData || isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isClearingData ? 'animate-spin' : ''}`} />
                Clear Old Data
              </Button>
              <Button 
                onClick={generateTestData} 
                variant="default" 
                size="sm" 
                disabled={isGeneratingTestData || isLoading}
              >
                <MapPin className={`h-4 w-4 mr-2 ${isGeneratingTestData ? 'animate-spin' : ''}`} />
                Generate Kolkata Data
              </Button>
            </div>
          </div>
        )}

        {locations.length > 0 && (
          <MapComponent
            locations={locations}
            onRefresh={fetchLocations}
            isLoading={isLoading}
            mapStyle={mapStyle}
            onMapStyleChange={setMapStyle}
          />
        )}

        {/* Stats Summary */}
        {locations.length > 0 && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
              <div className="text-sm text-blue-800">Total Locations</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{uniqueSalesmen}</div>
              <div className="text-sm text-green-800">Active Salesmen</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{recentLocations}</div>
              <div className="text-sm text-purple-800">Live Updates</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Auto-refresh: {autoRefresh ? 'ON (5 min)' : 'OFF'}</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
