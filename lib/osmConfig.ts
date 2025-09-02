// OpenStreetMap configuration and utilities
export const OSM_CONFIG = {
  // Free tile servers (no API key required)
  STANDARD: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  
  // Alternative tile styles (also free)
  HUMANITARIAN: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
    maxZoom: 17,
  },
  
  DARK: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  
  LIGHT: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
};

// Geocoding using Nominatim (free OSM service)
export const OSM_GEOCODING = {
  NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
  
  // Cache for geocoding results to reduce API calls
  cache: new Map<string, string>(),
  
  // Rate limiting: max 1 request per second as per Nominatim usage policy
  lastRequestTime: 0,
  
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Reverse geocoding: coordinates to address
  async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }
    
    try {
      // Rate limiting: ensure at least 1 second between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < 1000) {
        await this.delay(1000 - timeSinceLastRequest);
      }
      this.lastRequestTime = Date.now();
      
      // Use our backend proxy to avoid CORS issues
      const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const address = data.success ? data.address : null;
      
      // Cache the result
      if (address) {
        this.cache.set(cacheKey, address);
        // Limit cache size to prevent memory issues
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }
      
      return address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Return a formatted coordinate string as fallback
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  },
  
  // Forward geocoding: address to coordinates (if needed in the future)
  async geocode(address: string): Promise<{ lat: number; lon: number } | null> {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < 1000) {
        await this.delay(1000 - timeSinceLastRequest);
      }
      this.lastRequestTime = Date.now();
      
      const response = await fetch(
        `${this.NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'LeafTrack-App/1.0 (contact@leaftrack.com)',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },
};

// Map utility functions
export const MAP_UTILS = {
  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  },
  
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },
  
  // Get appropriate zoom level based on area coverage
  getOptimalZoom(bounds: { north: number; south: number; east: number; west: number }): number {
    const latDiff = bounds.north - bounds.south;
    const lonDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lonDiff);
    
    if (maxDiff > 10) return 5;
    if (maxDiff > 5) return 7;
    if (maxDiff > 2) return 9;
    if (maxDiff > 1) return 11;
    if (maxDiff > 0.5) return 13;
    if (maxDiff > 0.1) return 15;
    return 17;
  },
  
  // Generate bounds from array of coordinates
  getBounds(coordinates: Array<{ lat: number; lon: number }>) {
    if (coordinates.length === 0) return null;
    
    const lats = coordinates.map(c => c.lat);
    const lons = coordinates.map(c => c.lon);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons),
    };
  },
};

export type MapStyle = keyof typeof OSM_CONFIG;
