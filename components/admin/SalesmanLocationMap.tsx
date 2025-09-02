'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, RefreshCw, Users, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const MapBoundsController = dynamic(() => import('@/components/MapBoundsController').then((mod) => mod.MapBoundsController), { ssr: false });

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
}

interface MapComponentProps {
  locations: LocationData[];
  onRefresh: () => void;
  isLoading: boolean;
}

function MapComponent({ locations, onRefresh, isLoading }: MapComponentProps) {
  // Default center (you can adjust based on your region)
  const defaultCenter: [number, number] = [40.7128, -74.0060]; // New York City

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

  return (
    <div className="relative h-96 w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={defaultCenter}
        zoom={10}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {locations.map((location) => (
          <Marker
            key={location._id}
            position={[location.latitude, location.longitude]}
          >
            <Popup>
              <div className="space-y-2">
                <div>
                  <strong>{location.salesman_id.name}</strong>
                  <br />
                  <span className="text-sm text-gray-600">{location.salesman_id.email}</span>
                </div>
                <div className="text-sm">
                  <div>📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</div>
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
        ))}
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
  );
}

export default function SalesmanLocationMap() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('1');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leaftrack_token');
    }
    return null;
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
      refreshIntervalRef.current = setInterval(fetchLocations, 30000); // 30 seconds
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

        <MapComponent
          locations={locations}
          onRefresh={fetchLocations}
          isLoading={isLoading}
        />

        {/* Stats Summary */}
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

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Auto-refresh: {autoRefresh ? 'ON (30s)' : 'OFF'}</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
