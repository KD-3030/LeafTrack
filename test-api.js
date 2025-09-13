// Test API response
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a test admin token (using environment variables)
const adminPayload = {
  userId: '68b71f2dae10ec1477343139', // Admin User ID from debug output
  role: 'Admin'
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in environment variables');
  process.exit(1);
}

const token = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1d' });

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
