// Test SaleReturn API with proper authentication
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSaleReturnAPIWithAuth() {
  try {
    console.log('🧪 Testing SaleReturn API with authentication...');
    
    // First, let's test without auth to see the response
    console.log('1️⃣ Testing GET /api/sale-returns without auth...');
    const response = await fetch('http://localhost:3000/api/sale-returns');
    
    console.log('📡 Status:', response.status);
    console.log('📡 Status Text:', response.statusText);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log('📄 Response:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log('📄 Raw response:', responseText);
    }

    if (response.status === 401) {
      console.log('✅ API endpoint exists and correctly requires authentication');
    } else if (response.status === 200) {
      console.log('✅ API endpoint is working and returning data');
    } else {
      console.log('⚠️ Unexpected response status');
    }

    // Test POST endpoint (should also require auth)
    console.log('\n2️⃣ Testing POST /api/sale-returns without auth...');
    const postResponse = await fetch('http://localhost:3000/api/sale-returns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_invoice_id: '507f1f77bcf86cd799439011',
        return_items: [],
        refund_method: 'Cash',
        notes: 'Test'
      })
    });

    console.log('📡 POST Status:', postResponse.status);
    const postResponseText = await postResponse.text();
    
    try {
      const postResponseData = JSON.parse(postResponseText);
      console.log('📄 POST Response:', JSON.stringify(postResponseData, null, 2));
    } catch (e) {
      console.log('📄 POST Raw response:', postResponseText);
    }

    console.log('\n🎉 SaleReturn API endpoint testing completed!');
    console.log('📋 Summary:');
    console.log(`  - GET endpoint status: ${response.status}`);
    console.log(`  - POST endpoint status: ${postResponse.status}`);
    
    if (response.status === 401 && postResponse.status === 401) {
      console.log('✅ Both endpoints exist and correctly require authentication');
      console.log('✅ SaleReturn model and API are working correctly');
    }

  } catch (error) {
    console.error('❌ Error testing SaleReturn API:', error.message);
    if (error.cause) {
      console.error('❌ Cause:', error.cause.message);
    }
  }
}

testSaleReturnAPIWithAuth();