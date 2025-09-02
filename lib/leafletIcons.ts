'use client';

import L from 'leaflet';

// Fix for default markers not showing up in Next.js
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

const DefaultIcon = L.icon({
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

// Export for use in components
export { DefaultIcon };

// Alternative colored markers
export const createColoredIcon = (color: string) => {
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
