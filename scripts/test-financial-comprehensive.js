// scripts/test-financial-comprehensive.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Models (simplified schemas)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  state: String
}, { timestamps: true });

const invoiceSchema = new mongoose.Schema({
  invoice_number: String,
  customer_id: mongoose.Types.ObjectId,
  salesman_id: mongoose.Types.ObjectId,
  invoice_date: Date,
  due_date: Date,
  customer_details: {
    name: String,
    email: String,
    phone: String,
    address: String,
    state: String
  },
  items: [{
    product_name: String,
    quantity: Number,
    unit_price: Number,
    total_amount: Number
  }],
  subtotal: Number,
  grand_total: Number,
  status: String
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  invoice_id: mongoose.Types.ObjectId,
  customer_id: mongoose.Types.ObjectId,
  payment_date: Date,
  amount_paid: Number,
  payment_method: String,
  status: String,
  reconciled: Boolean
}, { timestamps: true });

async function setupTestData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Create models
    const User = mongoose.model('User', userSchema);
    const Product = mongoose.model('Product', productSchema);
    const Customer = mongoose.model('Customer', customerSchema);
    const Invoice = mongoose.model('Invoice', invoiceSchema);
    const Payment = mongoose.model('Payment', paymentSchema);

    // Check if admin exists (should exist from production setup)
    let admin = await User.findOne({ role: 'Admin' });
    if (!admin) {
      console.log('❌ Admin user not found. Please run production setup first.');
      return;
    }

    console.log('✅ Found admin user:', admin.name);

    // Create test products if they don't exist
    let product = await Product.findOne();
    if (!product) {
      console.log('📦 Creating test products...');
      const products = await Product.insertMany([
        { name: 'Premium Green Tea', price: 150, category: 'Tea' },
        { name: 'Classic Black Tea', price: 120, category: 'Tea' },
        { name: 'Earl Grey Tea', price: 180, category: 'Tea' }
      ]);
      product = products[0];
      console.log(`✅ Created ${products.length} products`);
    } else {
      console.log('✅ Products already exist');
    }

    // Create test customer if doesn't exist
    let customer = await Customer.findOne();
    if (!customer) {
      console.log('👤 Creating test customer...');
      customer = await Customer.create({
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '9876543210',
        address: '123 Tea Street',
        state: 'West Bengal'
      });
      console.log('✅ Created test customer');
    } else {
      console.log('✅ Customer already exists');
    }

    // Create test invoices if they don't exist
    let invoice = await Invoice.findOne();
    if (!invoice) {
      console.log('📄 Creating test invoices...');
      
      const invoiceDate = new Date();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const invoices = await Invoice.insertMany([
        {
          invoice_number: 'INV-2025090001',
          customer_id: customer._id,
          salesman_id: admin._id,
          invoice_date: invoiceDate,
          due_date: dueDate,
          customer_details: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            state: customer.state
          },
          items: [{
            product_name: product.name,
            quantity: 10,
            unit_price: product.price,
            total_amount: product.price * 10
          }],
          subtotal: product.price * 10,
          grand_total: product.price * 10,
          status: 'Sent'
        },
        {
          invoice_number: 'INV-2025090002',
          customer_id: customer._id,
          salesman_id: admin._id,
          invoice_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
          customer_details: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            state: customer.state
          },
          items: [{
            product_name: 'Classic Black Tea',
            quantity: 20,
            unit_price: 120,
            total_amount: 120 * 20
          }],
          subtotal: 120 * 20,
          grand_total: 120 * 20,
          status: 'Sent'
        }
      ]);
      
      console.log(`✅ Created ${invoices.length} test invoices`);
      invoice = invoices[0];
    } else {
      console.log('✅ Invoices already exist');
    }

    // Create test payment if doesn't exist
    let payment = await Payment.findOne();
    if (!payment) {
      console.log('💰 Creating test payment...');
      payment = await Payment.create({
        invoice_id: invoice._id,
        customer_id: customer._id,
        payment_date: new Date(),
        amount_paid: 500, // Partial payment
        payment_method: 'Cash',
        status: 'Confirmed',
        reconciled: true
      });
      console.log('✅ Created test payment');
    } else {
      console.log('✅ Payment already exists');
    }

    console.log('\n🎯 Test data setup complete!');
    return { admin, customer, product, invoice, payment };

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  }
}

async function testFinancialAPIs(admin) {
  try {
    // Generate JWT token for admin
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('\n🧪 Testing Financial API Endpoints...');
    console.log('=====================================');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: Financial Stats
    console.log('\n📊 Testing Financial Statistics...');
    const statsResponse = await fetch('http://localhost:3000/api/financial/stats', { headers });
    const statsData = await statsResponse.json();
    console.log(`Status: ${statsResponse.status}`);
    if (statsData.success) {
      console.log('✅ Financial stats working!');
      console.log(`   Total Revenue: ₹${statsData.stats.total_revenue.toLocaleString()}`);
      console.log(`   Total Paid: ₹${statsData.stats.total_paid.toLocaleString()}`);
      console.log(`   Total Pending: ₹${statsData.stats.total_pending.toLocaleString()}`);
    } else {
      console.log('❌ Financial stats failed:', statsData);
    }

    // Test 2: Outstanding Invoices
    console.log('\n💳 Testing Outstanding Invoices...');
    const outstandingResponse = await fetch('http://localhost:3000/api/financial/outstanding', { headers });
    const outstandingData = await outstandingResponse.json();
    console.log(`Status: ${outstandingResponse.status}`);
    if (outstandingData.success) {
      console.log('✅ Outstanding invoices working!');
      console.log(`   Found ${outstandingData.invoices.length} outstanding invoices`);
      console.log(`   Total Outstanding: ₹${outstandingData.summary.total_outstanding.toLocaleString()}`);
    } else {
      console.log('❌ Outstanding invoices failed:', outstandingData);
    }

    // Test 3: Payments List
    console.log('\n💰 Testing Payments List...');
    const paymentsResponse = await fetch('http://localhost:3000/api/payments?limit=5', { headers });
    const paymentsData = await paymentsResponse.json();
    console.log(`Status: ${paymentsResponse.status}`);
    if (paymentsData.success) {
      console.log('✅ Payments list working!');
      console.log(`   Found ${paymentsData.payments.length} payments`);
      console.log(`   Total Amount: ₹${paymentsData.summary.total_amount.toLocaleString()}`);
    } else {
      console.log('❌ Payments list failed:', paymentsData);
    }

    // Test 4: Invoices List
    console.log('\n📄 Testing Invoices List...');
    const invoicesResponse = await fetch('http://localhost:3000/api/invoices?limit=5', { headers });
    const invoicesData = await invoicesResponse.json();
    console.log(`Status: ${invoicesResponse.status}`);
    if (invoicesData.success) {
      console.log('✅ Invoices list working!');
      console.log(`   Found ${invoicesData.invoices.length} invoices`);
      console.log(`   Total Value: ₹${invoicesData.invoices.reduce((sum, inv) => sum + inv.grand_total, 0).toLocaleString()}`);
    } else {
      console.log('❌ Invoices list failed:', invoicesData);
    }

    // Test 5: Business Reports
    console.log('\n📈 Testing Business Reports...');
    const reportsResponse = await fetch('http://localhost:3000/api/reports/business?reportType=overview', { headers });
    const reportsData = await reportsResponse.json();
    console.log(`Status: ${reportsResponse.status}`);
    if (reportsData.success) {
      console.log('✅ Business reports working!');
      console.log(`   Total Revenue: ₹${reportsData.data.overview.total_revenue.toLocaleString()}`);
      console.log(`   Total Invoices: ${reportsData.data.overview.total_invoices}`);
    } else {
      console.log('❌ Business reports failed:', reportsData);
    }

  } catch (error) {
    console.error('❌ Error testing APIs:', error);
  }
}

async function main() {
  console.log('🧪 LeafTrack Financial Management Test Suite');
  console.log('=============================================\n');

  const testData = await setupTestData();
  if (testData && testData.admin) {
    await testFinancialAPIs(testData.admin);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Database connection closed');
  console.log('\n🎯 Financial Management Test Complete!');
}

main().catch(console.error);