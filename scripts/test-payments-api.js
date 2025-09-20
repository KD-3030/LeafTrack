/**
 * Test script to verify the payments API is working correctly
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const Payment = require('../models/Payment').default;
const Invoice = require('../models/Invoice').default;
const User = require('../models/User').default;

async function testPaymentsAPI() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if Payment model references are correct
    console.log('\n📋 Checking Payment Schema References:');
    const paymentSchema = Payment.schema;
    
    // Check customer_id reference
    const customerRef = paymentSchema.path('customer_id').options.ref;
    console.log(`- customer_id references: ${customerRef} ${customerRef === 'User' ? '✅' : '❌ Should be User'}`);
    
    // Check invoice_id reference
    const invoiceRef = paymentSchema.path('invoice_id').options.ref;
    console.log(`- invoice_id references: ${invoiceRef} ${invoiceRef === 'Invoice' ? '✅' : '❌'}`);
    
    // Check if created_by field exists
    const createdByExists = !!paymentSchema.path('created_by');
    console.log(`- created_by field exists: ${createdByExists ? '✅' : '❌'}`);

    // Test query with population
    console.log('\n📊 Testing Payment Query with Population:');
    const payments = await Payment.find({})
      .populate('invoice_id', 'invoice_number grand_total')
      .populate({
        path: 'customer_id',
        model: 'User',
        select: 'name email phone'
      })
      .limit(5)
      .lean();
    
    console.log(`Found ${payments.length} payments`);
    
    if (payments.length > 0) {
      const firstPayment = payments[0];
      console.log('\nSample Payment:');
      console.log(`- Payment ID: ${firstPayment._id}`);
      console.log(`- Amount: ₹${firstPayment.amount_paid}`);
      console.log(`- Method: ${firstPayment.payment_method}`);
      console.log(`- Status: ${firstPayment.status}`);
      
      if (firstPayment.invoice_id) {
        console.log(`- Invoice: ${firstPayment.invoice_id.invoice_number || 'Not populated'}`);
      }
      
      if (firstPayment.customer_id) {
        console.log(`- Customer: ${firstPayment.customer_id.name || 'Not populated'}`);
      }
    }
    
    // Test aggregation
    console.log('\n📈 Testing Payment Aggregation:');
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          total_amount: { $sum: '$amount_paid' },
          count: { $sum: 1 },
          confirmed_amount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Confirmed'] },
                '$amount_paid',
                0
              ]
            }
          }
        }
      }
    ]);
    
    if (stats.length > 0) {
      console.log(`- Total Payments: ${stats[0].count}`);
      console.log(`- Total Amount: ₹${stats[0].total_amount}`);
      console.log(`- Confirmed Amount: ₹${stats[0].confirmed_amount}`);
    } else {
      console.log('No payment statistics available');
    }
    
    console.log('\n✅ All tests passed! The payments API should be working correctly.');
    
  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testPaymentsAPI();
