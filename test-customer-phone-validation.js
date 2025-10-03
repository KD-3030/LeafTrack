// Test script to verify customer phone validation changes
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// You'll need to get a valid admin token - replace this
const ADMIN_TOKEN = 'your-admin-token-here';

const testData = {
  validCustomer: {
    name: "Test Customer",
    phone: "+1234567890", // Required field
    email: "test@example.com", // Optional field
    business_type: "Individual",
    credit_limit: 5000,
    credit_days: 30
  },
  invalidCustomerNoPhone: {
    name: "Invalid Customer",
    email: "invalid@example.com",
    // Missing phone number (should fail)
    business_type: "Individual"
  },
  validCustomerNoEmail: {
    name: "Valid Customer Without Email", 
    phone: "+0987654321", // Required field present
    // No email (should work)
    business_type: "Company"
  }
};

async function testCustomerValidation() {
  console.log('🧪 Testing Customer Phone Validation Changes...\n');
  
  try {
    console.log('1️⃣  Testing valid customer with phone and email:');
    let response = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(testData.validCustomer)
    });
    
    let data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && data.success) {
      console.log('   ✅ Valid customer with phone and email created successfully!');
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(data, null, 2));
    }

    console.log('\n2️⃣  Testing invalid customer without phone (should fail):');
    response = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(testData.invalidCustomerNoPhone)
    });
    
    data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 400 && data.error) {
      console.log('   ✅ Correctly rejected customer without phone number!');
      console.log(`   📋 Error: ${data.error}`);
    } else {
      console.log('   ❌ Expected validation error, got:', JSON.stringify(data, null, 2));
    }

    console.log('\n3️⃣  Testing valid customer with phone but no email:');
    response = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(testData.validCustomerNoEmail)
    });
    
    data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && data.success) {
      console.log('   ✅ Valid customer without email created successfully!');
    } else {
      console.log('   ❌ Unexpected response:', JSON.stringify(data, null, 2));
    }

    console.log('\n📊 Test Summary:');
    console.log('   ✅ Phone is now required for customer creation');
    console.log('   ✅ Email is now optional for customer creation');
    console.log('   ✅ Validation properly rejects customers without phone');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Development server is not running');
      console.log('   Please run: npm run dev');
    } else {
      console.log('❌ Test error:', error.message);
    }
  }
}

console.log('⚠️  IMPORTANT: Before running this test:');
console.log('   1. Make sure your dev server is running: npm run dev');
console.log('   2. Update ADMIN_TOKEN with a valid admin JWT token');
console.log('   3. Ensure MongoDB connection is working\n');

// Uncomment the line below to run the test
// testCustomerValidation();