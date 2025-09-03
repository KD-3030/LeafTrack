// Test API response
const jwt = require('jsonwebtoken');

// Create a test admin token (using the same secret and payload structure)
const adminPayload = {
  userId: '68b71f2dae10ec1477343139', // Admin User ID from debug output
  role: 'Admin'
};

const token = jwt.sign(adminPayload, 'your-secret-key-change-in-production', { expiresIn: '1d' });

console.log('Test token for admin:', token);

// Test API call
async function testAPI() {
  try {
    const response = await fetch('http://localhost:3003/api/locations?hours=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (data.locations) {
      console.log(`\nTotal locations returned: ${data.locations.length}`);
      
      // Group by salesman
      const locationsBySalesman = {};
      data.locations.forEach(loc => {
        const salesmanName = loc.salesman_id?.name || 'Unknown';
        if (!locationsBySalesman[salesmanName]) {
          locationsBySalesman[salesmanName] = 0;
        }
        locationsBySalesman[salesmanName]++;
      });
      
      console.log('\nLocations by salesman:');
      for (const [name, count] of Object.entries(locationsBySalesman)) {
        console.log(`${name}: ${count} locations`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
