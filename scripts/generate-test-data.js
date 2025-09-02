const fetch = require('node-fetch');

async function generateTestData() {
  try {
    console.log('🚀 Starting test data generation...');
    
    // Note: You need to get an admin token first by logging in to the web app
    // and copying it from localStorage
    const BASE_URL = 'http://localhost:3001';
    
    // You'll need to replace this with an actual admin token
    const ADMIN_TOKEN = process.argv[2] || 'YOUR_ADMIN_TOKEN_HERE';
    
    if (ADMIN_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
      console.log('❌ Please provide an admin token as the first argument');
      console.log('Example: node scripts/generate-test-data.js "your-jwt-token-here"');
      console.log('\n💡 To get your token:');
      console.log('1. Open http://localhost:3001 in your browser');
      console.log('2. Log in as admin');
      console.log('3. Open browser dev tools (F12)');
      console.log('4. Go to Application/Storage tab');
      console.log('5. Look for localStorage > leaftrack_token');
      console.log('6. Copy the token value');
      return;
    }
    
    console.log('1️⃣ Creating test salesmen...');
    const usersResponse = await fetch(`${BASE_URL}/api/test-users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const usersData = await usersResponse.json();
    if (!usersData.success) {
      throw new Error(`Failed to create users: ${usersData.error}`);
    }
    console.log('✅ Users:', usersData.message);
    
    console.log('2️⃣ Creating Kolkata location data...');
    const locationsResponse = await fetch(`${BASE_URL}/api/test-locations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    const locationsData = await locationsResponse.json();
    if (!locationsData.success) {
      throw new Error(`Failed to create locations: ${locationsData.error}`);
    }
    console.log('✅ Locations:', locationsData.message);
    
    console.log('🎉 Test data generation complete!');
    console.log('📍 Check the admin dashboard to see Kolkata sample locations');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  generateTestData();
}

module.exports = { generateTestData };
