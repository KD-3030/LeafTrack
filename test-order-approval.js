// Test script to check order approval/rejection API
const BASE_URL = 'http://localhost:3000';

async function testOrderApproval() {
  console.log('🧪 Testing Order Approval/Rejection API\n');
  
  // Get admin token
  console.log('Step 1: Getting admin token...');
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@sohagtea.com', // Update with your admin email
      password: 'admin123', // Update with your admin password
    }),
  });
  
  const loginData = await loginResponse.json();
  if (!loginData.success) {
    console.error('❌ Login failed:', loginData.error);
    return;
  }
  
  const token = loginData.token;
  console.log('✅ Admin token obtained\n');
  
  // Get all orders
  console.log('Step 2: Fetching pending orders...');
  const ordersResponse = await fetch(`${BASE_URL}/api/orders?status=pending`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const ordersData = await ordersResponse.json();
  if (!ordersData.success) {
    console.error('❌ Failed to fetch orders:', ordersData.error);
    return;
  }
  
  console.log(`✅ Found ${ordersData.orders.length} pending orders\n`);
  
  if (ordersData.orders.length === 0) {
    console.log('⚠️  No pending orders to test. Please create a test order first.');
    return;
  }
  
  const testOrder = ordersData.orders[0];
  console.log(`📦 Test Order: ${testOrder.order_number}`);
  console.log(`   Customer: ${testOrder.customer_name}`);
  console.log(`   Amount: ₹${testOrder.total_amount}`);
  console.log(`   Status: ${testOrder.status}\n`);
  
  // Test approval
  console.log('Step 3: Testing order approval...');
  const approvalResponse = await fetch(`${BASE_URL}/api/orders/${testOrder._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'approved',
      admin_notes: 'Test approval from script',
    }),
  });
  
  const approvalData = await approvalResponse.json();
  console.log('Approval Response:', JSON.stringify(approvalData, null, 2));
  
  if (approvalData.success) {
    console.log('✅ Order approved successfully!\n');
    
    // Verify the status changed
    console.log('Step 4: Verifying status change...');
    const verifyResponse = await fetch(`${BASE_URL}/api/orders/${testOrder._id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const verifyData = await verifyResponse.json();
    if (verifyData.success) {
      console.log(`   New Status: ${verifyData.order.status}`);
      console.log(`   Reviewed At: ${verifyData.order.reviewed_at}`);
      console.log(`   Reviewer: ${verifyData.order.reviewer_name}`);
      console.log(`   Admin Notes: ${verifyData.order.admin_notes || 'None'}`);
      
      if (verifyData.order.status === 'approved') {
        console.log('✅ Status successfully changed to approved!\n');
      } else {
        console.log('❌ Status did not change to approved\n');
      }
    }
  } else {
    console.error('❌ Approval failed:', approvalData.error);
  }
  
  console.log('\n🔄 Resetting order status to pending for next test...');
  await fetch(`${BASE_URL}/api/orders/${testOrder._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'pending',
    }),
  });
  console.log('✅ Done!');
}

testOrderApproval().catch(console.error);
