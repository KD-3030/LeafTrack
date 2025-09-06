import { connectDB } from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import Sale from '@/models/Sale';
import Customer from '@/models/Customer';

async function testModels() {
  console.log('Testing database models...');
  
  try {
    await connectDB();
    console.log('✅ Database connected');
    
    // Test Payment model
    const paymentCount = await Payment.countDocuments();
    console.log(`✅ Payment model works: ${paymentCount} payments found`);
    
    // Test Invoice model
    const invoiceCount = await Invoice.countDocuments();
    console.log(`✅ Invoice model works: ${invoiceCount} invoices found`);
    
    // Test Sale model
    const saleCount = await Sale.countDocuments();
    console.log(`✅ Sale model works: ${saleCount} sales found`);
    
    // Test Customer model
    const customerCount = await Customer.countDocuments();
    console.log(`✅ Customer model works: ${customerCount} customers found`);
    
    // Test a simple find query
    const payments = await Payment.find().limit(1);
    console.log(`✅ Payment.find() works: ${payments.length > 0 ? 'Found payments' : 'No payments found'}`);
    
    console.log('✅ All models are working correctly!');
    
  } catch (error) {
    console.error('❌ Model test failed:', error);
    throw error;
  }
}

export default testModels;
