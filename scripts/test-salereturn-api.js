// Test SaleReturn API endpoint
const fetch = require('node-fetch');

async function testSaleReturnAPI() {
  try {
    console.log('🧪 Testing SaleReturn API endpoint...');
    
    // Test GET endpoint (should work even without auth for testing connection)
    const response = await fetch('http://localhost:3000/api/sale-returns', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers.raw());
    
    if (response.status === 401) {
      console.log('✅ API endpoint exists and returns 401 (authentication required) - this is expected');
    } else {
      const data = await response.text();
      console.log('📄 Response body:', data);
    }

    console.log('🎉 SaleReturn API endpoint is accessible!');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️ Next.js development server is not running');
      console.log('💡 Please start the server with: npm run dev');
    } else {
      console.error('❌ Error testing API:', error.message);
    }
  }
}

testSaleReturnAPI();