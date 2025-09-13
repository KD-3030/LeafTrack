// scripts/test-financial-simple.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function testFinancialData() {
  try {
    console.log('🧪 LeafTrack Financial Management Test');
    console.log('=======================================\n');
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Check admin user
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    const admin = users.find(u => u.role === 'Admin');
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }

    console.log(`✅ Found admin: ${admin.name} (${admin.email})`);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Generated auth token');

    // Check database collections
    console.log('\n📊 Database Status:');
    const collections = ['invoices', 'payments', 'customers', 'products'];
    
    for (const collectionName of collections) {
      const count = await mongoose.connection.db.collection(collectionName).countDocuments();
      console.log(`   ${collectionName}: ${count} documents`);
    }

    // Sample some data if exists
    console.log('\n📄 Sample Data:');
    
    const invoices = await mongoose.connection.db.collection('invoices').find({}).limit(2).toArray();
    console.log(`   Invoices: ${invoices.length} found`);
    invoices.forEach(inv => {
      console.log(`     - ${inv.invoice_number}: ₹${inv.grand_total}`);
    });

    const payments = await mongoose.connection.db.collection('payments').find({}).limit(2).toArray();
    console.log(`   Payments: ${payments.length} found`);
    payments.forEach(pay => {
      console.log(`     - ₹${pay.amount_paid} via ${pay.payment_method} (${pay.status})`);
    });

    console.log('\n🔑 Authentication Token (for manual testing):');
    console.log(token);

    console.log('\n📋 Manual Testing Commands:');
    console.log('1. Financial Stats:');
    console.log(`   curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/financial/stats`);
    
    console.log('\n2. Outstanding Invoices:');
    console.log(`   curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/financial/outstanding`);
    
    console.log('\n3. Payments List:');
    console.log(`   curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/payments`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

testFinancialData();