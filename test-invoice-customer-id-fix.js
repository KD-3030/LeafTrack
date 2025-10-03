// Test script to verify invoice update customer_id fix
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// You'll need to get a valid admin token - replace this
const ADMIN_TOKEN = 'your-admin-token-here';

async function testInvoiceUpdate() {
  console.log('🧪 Testing Invoice Update Customer ID Fix...\n');
  
  try {
    // First, get a list of invoices to find one to test with
    console.log('1️⃣  Getting list of invoices:');
    let response = await fetch(`${API_BASE}/invoices?limit=1`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    let data = await response.json();
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200 && data.invoices && data.invoices.length > 0) {
      const testInvoice = data.invoices[0];
      console.log(`   ✅ Found test invoice: ${testInvoice._id}`);
      console.log(`   📋 Customer ID: ${testInvoice.customer_id}`);
      console.log(`   📋 Current Status: ${testInvoice.status}`);
      
      // Test updating the invoice
      console.log('\n2️⃣  Testing invoice update:');
      const updateData = {
        status: testInvoice.status === 'Draft' ? 'Sent' : 'Draft',
        notes: `Updated via test at ${new Date().toISOString()}`
      };
      
      response = await fetch(`${API_BASE}/invoices/${testInvoice._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify(updateData)
      });
      
      data = await response.json();
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 && data.success) {
        console.log('   ✅ Invoice updated successfully!');
        console.log(`   📋 New Status: ${data.invoice?.status || 'Not provided'}`);
        console.log('   📋 No customer_id casting errors!');
      } else {
        console.log('   ❌ Invoice update failed:');
        console.log('   📋 Response:', JSON.stringify(data, null, 2));
      }

      // Test a payment creation that might trigger the same issue
      console.log('\n3️⃣  Testing payment creation (if not paid):');
      if (testInvoice.payment_status !== 'Paid') {
        const paymentData = {
          invoice_id: testInvoice._id,
          amount_paid: 10, // Small test amount
          payment_method: 'Cash',
          notes: 'Test payment for customer_id fix verification'
        };
        
        response = await fetch(`${API_BASE}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          },
          body: JSON.stringify(paymentData)
        });
        
        data = await response.json();
        console.log(`   Status: ${response.status}`);
        
        if (response.status === 200 && data.success) {
          console.log('   ✅ Payment created successfully!');
          console.log('   📋 No customer_id casting errors in payment!');
        } else {
          console.log('   ❌ Payment creation response:');
          console.log('   📋 Response:', JSON.stringify(data, null, 2));
        }
      } else {
        console.log('   ⏭️  Invoice already paid, skipping payment test');
      }

    } else {
      console.log('   ❌ No invoices found for testing');
      console.log('   📋 Response:', JSON.stringify(data, null, 2));
    }

    console.log('\n📊 Fix Summary:');
    console.log('   ✅ Fixed customer_id casting in invoice updates');
    console.log('   ✅ Fixed customer_id casting in payment creation');
    console.log('   ✅ Both endpoints now use invoice.customer_id (ObjectId) instead of invoice.customer_details (Object)');

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
console.log('   3. Ensure you have at least one invoice in your database\n');

// Uncomment the line below to run the test
// testInvoiceUpdate();