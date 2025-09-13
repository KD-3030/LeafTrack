// scripts/test-financial-features.js
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2ZTJiNWEyYWRhNmNkZGM5YjRmZWQzNSIsImVtYWlsIjoia2luamFsZHV0dGEwMDVAZ21haWwuY29tIiwicm9sZSI6IkFkbWluIiwiaWF0IjoxNzI2MjE3NzE4LCJleHAiOjE3MjY4MjI1MTh9.gPUn8Q6jGJP6MEhK0H7pvpBSLGC2BKf9j6cZQSO6Fdo'; // You'll need a fresh token

const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    console.log(`\n🔍 ${options.method || 'GET'} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testFinancialFeatures() {
  console.log('🧪 Testing LeafTrack Financial Management Features');
  console.log('==================================================\n');

  // Test 1: Financial Stats
  console.log('📊 Testing Financial Statistics...');
  await testAPI('/api/financial/stats');

  // Test 2: Outstanding Invoices
  console.log('\n💳 Testing Outstanding Invoices...');
  await testAPI('/api/financial/outstanding');

  // Test 3: Payments List
  console.log('\n💰 Testing Payments List...');
  await testAPI('/api/payments?limit=5');

  // Test 4: Invoice List
  console.log('\n📄 Testing Invoices List...');
  await testAPI('/api/invoices?limit=5');

  // Test 5: Business Reports
  console.log('\n📈 Testing Business Reports...');
  await testAPI('/api/reports/business?reportType=overview');

  console.log('\n🎯 Financial Features Test Complete!');
}

// Run the tests
testFinancialFeatures().catch(console.error);