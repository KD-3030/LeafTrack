'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Activity, Clock, AlertCircle } from 'lucide-react';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { useState } from 'react';

export default function LocationTrackingWidget() {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const { isTracking, lastLocation, error, startTracking, stopTracking, trackLocation } = useLocationTracking({
    enabled: trackingEnabled,
    interval: 5 * 60 * 1000, // 5 minutes
  });

  const handleToggleTracking = (enabled: boolean) => {
    setTrackingEnabled(enabled);
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      timeStyle: 'medium',
      dateStyle: 'short'
    }).format(timestamp);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Location Tracking</CardTitle>
          </div>
          <Badge variant={isTracking ? "default" : "secondary"}>
            {isTracking ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription>
          Real-time location monitoring for field operations
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="location-tracking">Enable Location Tracking</Label>
            <p className="text-sm text-muted-foreground">
              Updates every 5 minutes
            </p>
          </div>
          <Switch
            id="location-tracking"
            checked={trackingEnabled}
            onCheckedChange={handleToggleTracking}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
          {isTracking ? (
            <>
              <Activity className="h-4 w-4 text-green-600 animate-pulse" />
              <span className="text-sm font-medium text-green-600">Tracking Active</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-500">Tracking Disabled</span>
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Last Location Info */}
        {lastLocation && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Last Known Location</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coordinates:</span>
                <span className="font-mono text-blue-900">
                  {formatCoordinates(lastLocation.latitude, lastLocation.longitude)}
                </span>
              </div>
              
              {lastLocation.accuracy && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="text-blue-900">±{Math.round(lastLocation.accuracy)}m</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Updated:</span>
                <span className="text-blue-900">{formatTimestamp(lastLocation.timestamp)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Manual Update Button */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={trackLocation}
            disabled={!trackingEnabled}
            className="flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Update Now</span>
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Next automatic update in ~5 minutes
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Privacy Notice:</strong> Your location data is used solely for business purposes 
            and is automatically deleted after 7 days. Location tracking can be disabled at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
