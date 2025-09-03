'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Users, Clock, Trash2, Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import SalesmanLocationMap from '@/components/admin/SalesmanLocationMap';

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

export default function LocationTrackingPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('24');

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
      toast.error('Failed to fetch location data');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllLocations = async () => {
    if (!confirm('Are you sure you want to clear all location data? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/locations', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to clear locations');
      }

      setLocations([]);
      toast.success(`Cleared ${data.deleted} location records`);
    } catch (error) {
      console.error('Error clearing locations:', error);
      toast.error('Failed to clear location data');
    }
  };

  const exportLocations = () => {
    if (locations.length === 0) {
      toast.error('No location data available to export');
      return;
    }

    const csvData = locations.map(location => ({
      'Salesman Name': location.salesman_id.name,
      'Email': location.salesman_id.email,
      'Latitude': location.latitude,
      'Longitude': location.longitude,
      'Accuracy (m)': location.accuracy || 'N/A',
      'Timestamp': new Date(location.timestamp).toLocaleString(),
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${locations.length} location records`);
  };

  useEffect(() => {
    if (user && user.role === 'Admin') {
      fetchLocations();
    }
  }, [user, timeFilter]);

  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'medium',
      dateStyle: 'short'
    }).format(new Date(timestamp));
  };

  const getLocationAge = (timestamp: string) => {
    const now = new Date();
    const locationTime = new Date(timestamp);
    const diffMinutes = (now.getTime() - locationTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${Math.round(diffMinutes)}m ago`;
    if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
    return `${Math.round(diffMinutes / 1440)}d ago`;
  };

  const getStatusBadge = (timestamp: string) => {
    const now = new Date();
    const locationTime = new Date(timestamp);
    const diffMinutes = (now.getTime() - locationTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 10) return <Badge variant="default">Live</Badge>;
    if (diffMinutes < 30) return <Badge variant="secondary">Recent</Badge>;
    return <Badge variant="outline">Stale</Badge>;
  };

  if (!user || user.role !== 'Admin') {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view this page.</p>
      </div>
    );
  }

  const uniqueSalesmen = new Set(locations.map(loc => loc.salesman_id._id)).size;
  const recentLocations = locations.filter(loc => {
    const diffMinutes = (new Date().getTime() - new Date(loc.timestamp).getTime()) / (1000 * 60);
    return diffMinutes < 10;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor real-time salesman locations and movement history</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={fetchLocations}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={exportLocations}
            disabled={locations.length === 0}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          
          <Button
            variant="destructive"
            onClick={clearAllLocations}
            disabled={locations.length === 0}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-gray-600">GPS coordinates recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Salesmen</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueSalesmen}</div>
            <p className="text-xs text-gray-600">Unique salesmen tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Updates</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentLocations}</div>
            <p className="text-xs text-gray-600">Locations under 10 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Filter</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="6">Last 6 Hours</SelectItem>
                <SelectItem value="24">Last Day</SelectItem>
                <SelectItem value="168">Last Week</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Location Map */}
      <SalesmanLocationMap />

      {/* Location Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Location History</CardTitle>
          <CardDescription>
            Detailed location data for all salesmen (auto-refresh every 30 seconds)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Location Data</h3>
              <p className="text-gray-600">
                No location tracking data available for the selected time period.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salesman</TableHead>
                  <TableHead>Coordinates</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{location.salesman_id.name}</div>
                        <div className="text-sm text-gray-600">{location.salesman_id.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </TableCell>
                    <TableCell>
                      {location.accuracy ? `±${Math.round(location.accuracy)}m` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatTimestamp(location.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getLocationAge(location.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(location.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
