// Test script to verify manual invoice creation fix
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// You'll need to get a valid admin token - replace this
const ADMIN_TOKEN = 'your-admin-token-here';

const testData = {
  customer_id: "67434a74e7e93b1a3f123456", // Replace with a valid customer ID from your DB
  invoice_date: "2025-09-29",
  due_date: "2025-10-29",
  payment_terms: "30 days",
  notes: "Test manual invoice",
  items: [
    {
      product_id: "67434a74e7e93b1a3f789012", // Replace with a valid product ID
      product_name: "Test Product",
      quantity: 2,
      unit_price: 100,
      gst_rate: 18
    }
  ]
};

async function testManualInvoiceCreation() {
  console.log('🧪 Testing Manual Invoice Creation Fix...\n');
  
  try {
    console.log('1️⃣  Testing POST /api/invoices/manual (with auth):');
    
    const response = await fetch(`${API_BASE}/invoices/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && data.success) {
      console.log('   ✅ Manual invoice created successfully!');
      console.log('   📋 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('   ❌ Error creating manual invoice:');
      console.log('   📋 Response:', JSON.stringify(data, null, 2));
    }

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
console.log('   3. Update customer_id and product_id with valid IDs from your database');
console.log('   4. Make sure CompanySettings exists in your database\n');

// Uncomment the line below to run the test
// testManualInvoiceCreation();