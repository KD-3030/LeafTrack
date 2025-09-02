// Debug script to test location tracking
console.log('=== Location Tracking Debug ===');

// Check if geolocation is supported
if (navigator.geolocation) {
  console.log('✅ Geolocation is supported');
  
  // Test location permissions
  navigator.permissions.query({name: 'geolocation'}).then(function(result) {
    console.log('📍 Geolocation permission:', result.state);
    
    if (result.state === 'granted') {
      console.log('✅ Location permission is granted');
    } else if (result.state === 'prompt') {
      console.log('⚠️ Location permission will be prompted');
    } else {
      console.log('❌ Location permission is denied');
    }
  });
  
  // Test getting current position
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('✅ Location obtained:', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      console.log('❌ Geolocation error:', error.code, error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
} else {
  console.log('❌ Geolocation is not supported');
}

// Check authentication token
const token = localStorage.getItem('leaftrack_token');
if (token) {
  console.log('✅ Auth token found');
  
  // Test API call
  fetch('/api/locations?hours=1', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ API call successful, locations:', data.locations?.length || 0);
    } else {
      console.log('❌ API call failed:', data.error);
    }
  })
  .catch(error => {
    console.log('❌ API error:', error.message);
  });
} else {
  console.log('❌ No auth token found');
}

// Check user authentication
const user = JSON.parse(localStorage.getItem('leaftrack_user') || 'null');
if (user) {
  console.log('✅ User authenticated:', user.name, user.role);
} else {
  console.log('❌ No user data found');
}
