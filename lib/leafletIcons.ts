'use client';

// Dynamic import and icon setup (client-side only)
let L: any = null;
let DefaultIcon: any = null;

// Initialize Leaflet only on client side
const initializeLeaflet = async () => {
  if (typeof window !== 'undefined' && !L) {
    L = await import('leaflet');
    
    // Fix for default markers not showing up in Next.js
    const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
    const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
    const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

    DefaultIcon = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    // Apply the default icon
    L.Marker.prototype.options.icon = DefaultIcon;
  }
  return L;
};

// Export for use in components
export { DefaultIcon };

// Predefined color palette for salesmen
const SALESMAN_COLORS = [
  '#e74c3c', // Red
  '#3498db', // Blue  
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Turquoise
  '#e67e22', // Carrot
  '#34495e', // Wet Asphalt
  '#f1c40f', // Yellow
  '#95a5a6', // Concrete
  '#d35400', // Pumpkin
  '#8e44ad', // Wisteria
  '#16a085', // Green Sea
  '#27ae60', // Nephritis
  '#2980b9', // Belize Hole
];

// Special admin color
const ADMIN_COLOR = '#ff1744'; // Bright red for admin

// Generate unique color for salesman based on their ID
export const getSalesmanColor = (salesmanId: string): string => {
  // Create a simple hash from the salesman ID
  let hash = 0;
  for (let i = 0; i < salesmanId.length; i++) {
    const char = salesmanId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get consistent color index
  const colorIndex = Math.abs(hash) % SALESMAN_COLORS.length;
  return SALESMAN_COLORS[colorIndex];
};

// Create marker icon with specific color and role
export const createPersonalizedIcon = async (salesmanId: string, role: 'Admin' | 'Salesman', timestamp?: string) => {
  const L = await initializeLeaflet();
  if (!L) return null;

  const isAdmin = role === 'Admin';
  const baseColor = isAdmin ? ADMIN_COLOR : getSalesmanColor(salesmanId);
  
  // Determine opacity based on timestamp (if provided)
  let opacity = 1;
  if (timestamp) {
    const now = new Date();
    const locationTime = new Date(timestamp);
    const diffMinutes = (now.getTime() - locationTime.getTime()) / (1000 * 60);
    
    if (diffMinutes > 30) opacity = 0.6; // Fade old locations
    else if (diffMinutes > 10) opacity = 0.8; // Semi-fade recent locations
  }
  
  const iconHtml = isAdmin 
    ? `
      <div style="
        background: linear-gradient(45deg, ${baseColor}, #ff4569); 
        width: 30px; 
        height: 30px; 
        border-radius: 50%; 
        border: 4px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        opacity: ${opacity};
      ">
        <div style="
          color: white;
          font-size: 14px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        ">A</div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 12px solid ${baseColor};
          position: absolute;
          bottom: -12px;
          left: 9px;
        "></div>
      </div>
    `
    : `
      <div style="
        background-color: ${baseColor}; 
        width: 26px; 
        height: 26px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        opacity: ${opacity};
      ">
        <div style="
          color: white;
          font-size: 11px;
          font-weight: bold;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.7);
        ">S</div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 10px solid ${baseColor};
          position: absolute;
          bottom: -10px;
          left: 8px;
        "></div>
      </div>
    `;

  return L.divIcon({
    className: 'custom-personalized-marker',
    html: iconHtml,
    iconSize: isAdmin ? [30, 42] : [26, 36],
    iconAnchor: isAdmin ? [15, 42] : [13, 36],
    popupAnchor: [0, isAdmin ? -42 : -36]
  });
};

// Alternative colored markers (keep for backward compatibility)
export const createColoredIcon = async (color: string) => {
  const L = await initializeLeaflet();
  if (!L) return null;

  const colorMap: Record<string, string> = {
    green: '#22c55e',
    orange: '#f97316', 
    red: '#ef4444',
    blue: '#3b82f6',
    purple: '#8b5cf6'
  };

  const iconColor = colorMap[color] || '#3b82f6';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${iconColor}; 
        width: 24px; 
        height: 24px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          width: 0; 
          height: 0; 
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 8px solid ${iconColor};
          position: absolute;
          bottom: -8px;
          left: 8px;
        "></div>
      </div>
    `,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32]
  });
};
