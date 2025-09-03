'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Users } from 'lucide-react';

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

interface SafeLeafletMapProps {
  locations: LocationData[];
  adminLocation: LocationData | null;
  onRefresh: () => void;
  isLoading: boolean;
  mapStyle: string;
}

export default function SafeLeafletMap({ locations, adminLocation, onRefresh, isLoading, mapStyle }: SafeLeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [salesmanColors, setSalesmanColors] = useState<{ [key: string]: { name: string; color: string } }>({});

  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      try {
        if (!mapRef.current || typeof window === 'undefined') return;

        // Dynamic import of Leaflet to avoid SSR issues
        const L = await import('leaflet');

        if (!mounted) return;

        // Initialize Leaflet map manually
        const map = L.default.map(mapRef.current, {
          center: [22.5726, 88.3639], // Kolkata coordinates
          zoom: 10,
          zoomControl: true,
          attributionControl: true
        });

        // Add tile layer
        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        leafletMapRef.current = map;
        
        if (mounted) {
          setIsMapReady(true);
          setMapError(null);
        }

        // Cleanup on unmount
        return () => {
          if (map) {
            map.remove();
          }
        };

      } catch (error) {
        console.error('Error initializing Leaflet map:', error);
        if (mounted) {
          setMapError('Failed to load map');
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {
          console.warn('Error cleaning up map:', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !leafletMapRef.current) return;

    const addMarkers = async () => {
      try {
        const L = await import('leaflet');
        const map = leafletMapRef.current;

        // Define color palette for salesmen
        const colors = [
          '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', 
          '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#95a5a6'
        ];

        // Create custom marker icons using CSS
        const createCustomIcon = (color: string, emoji: string = '👤') => {
          return L.default.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                background: ${color};
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                border: 3px solid white;
                transform: rotate(-45deg);
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
              ">
                <span style="
                  transform: rotate(45deg);
                  font-size: 12px;
                  line-height: 1;
                ">${emoji}</span>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
          });
        };

        // Clear existing markers
        map.eachLayer((layer: any) => {
          if (layer.options && layer.options.pane === 'markerPane') {
            map.removeLayer(layer);
          }
        });

        // Get unique salesman IDs and assign colors
        const uniqueSalesmen = [...new Set(locations.map(loc => loc.salesman_id._id))];
        const newSalesmanColors: { [key: string]: { name: string; color: string } } = {};
        const localSalesmanColors: { [key: string]: string } = {};
        
        uniqueSalesmen.forEach((id, index) => {
          const color = colors[index % colors.length];
          localSalesmanColors[id] = color;
          const salesman = locations.find(loc => loc.salesman_id._id === id)?.salesman_id;
          if (salesman) {
            newSalesmanColors[id] = {
              name: salesman.name,
              color: color
            };
          }
        });
        
        // Update the state for legend display
        setSalesmanColors(newSalesmanColors);

        // Add location markers with custom icons
        locations.forEach((location) => {
          const salesmanColor = localSalesmanColors[location.salesman_id._id];
          const customIcon = createCustomIcon(salesmanColor, '👤');
          
          const marker = L.default.marker([location.latitude, location.longitude], {
            icon: customIcon
          }).bindPopup(`
              <div style="max-width: 200px;">
                <strong style="color: ${salesmanColor};">${location.salesman_id.name}</strong><br/>
                <small>${location.salesman_id.email}</small><br/>
                <small>📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</small><br/>
                <small>🕐 ${new Date(location.timestamp).toLocaleString()}</small>
                ${location.address ? `<br/><small>📌 ${location.address}</small>` : ''}
              </div>
            `);
          marker.addTo(map);
        });

        // Add admin marker if exists
        if (adminLocation) {
          const adminIcon = createCustomIcon('#dc2626', '👑');
          const adminMarker = L.default.marker([adminLocation.latitude, adminLocation.longitude], {
            icon: adminIcon
          }).bindPopup(`
            <div style="max-width: 200px;">
              <strong style="color: #dc2626;">Administrator</strong><br/>
              <small>📍 ${adminLocation.latitude.toFixed(6)}, ${adminLocation.longitude.toFixed(6)}</small><br/>
              <small>🕐 ${new Date(adminLocation.timestamp).toLocaleString()}</small>
              ${adminLocation.address ? `<br/><small>📌 ${adminLocation.address}</small>` : ''}
            </div>
          `);
          adminMarker.addTo(map);
        }

        // Fit bounds if there are locations
        const allLocations = adminLocation ? [...locations, adminLocation] : locations;
        if (allLocations.length > 0) {
          const bounds = L.default.latLngBounds(
            allLocations.map(loc => [loc.latitude, loc.longitude])
          );
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
        }

      } catch (error) {
        console.error('Error adding markers:', error);
      }
    };

    addMarkers();
  }, [locations, adminLocation, isMapReady]);

  if (mapError) {
    return (
      <div className="map-container flex items-center justify-center h-96 bg-red-50 rounded-lg border-2 border-red-200">
        <div className="text-center p-6">
          <MapPin className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">Map Error</p>
          <p className="text-red-500 text-sm mt-1">{mapError}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()} 
            className="mt-3"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container relative">
      <div 
        ref={mapRef} 
        className="h-96 w-full rounded-lg border"
        style={{ height: '400px', width: '100%' }}
      />
      
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 font-medium">Loading map...</p>
            <p className="text-gray-500 text-sm mt-1">Initializing safely</p>
          </div>
        </div>
      )}
      
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
      
      {/* Salesmen Legend */}
      {Object.keys(salesmanColors).length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 border rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">Salesmen Legend</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(salesmanColors).map(([id, { name, color }]) => (
              <div key={id} className="flex items-center gap-3 p-2 bg-white rounded border">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-white"
                  style={{ 
                    backgroundColor: color,
                    position: 'relative'
                  }}
                >
                  👤
                </div>
                <span className="text-sm text-gray-700 font-medium truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
