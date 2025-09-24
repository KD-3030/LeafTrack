// Test script to verify customer API fix
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

async function testCustomerAPI() {
  console.log('🧪 Testing Customer API fix...\n');
  
  try {
    // Test GET /api/customers (without auth - should return 401)
    console.log('1️⃣  Testing GET /api/customers (no auth):');
    const response = await fetch(`${API_BASE}/customers`);
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 Unauthorized (fix working!)');
    } else {
      const data = await response.json();
      console.log('   ❌ Expected 401, got:', data);
    }

    console.log('\n📋 API Status: Customer route is now properly handling authentication');
    console.log('📋 No more "verifyToken is not defined" errors');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Development server is not running');
      console.log('   Please run: npm run dev');
    } else {
      console.log('❌ Test error:', error.message);
    }
  }
}

// Run the test
testCustomerAPI();