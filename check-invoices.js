const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
    
    // Get all invoices sorted by creation date
    const invoices = await Invoice.find({})
      .sort({ createdAt: -1 })
      .select('invoice_number invoice_date createdAt');
    
    console.log(`\nTotal invoices in database: ${invoices.length}\n`);
    console.log('Latest 10 invoices:');
    console.log('-------------------');
    invoices.slice(0, 10).forEach(inv => {
      console.log(`${inv.invoice_number} | Date: ${inv.invoice_date ? inv.invoice_date.toISOString().split('T')[0] : 'N/A'} | Created: ${inv.createdAt.toISOString().split('T')[0]}`);
    });
    
    // Extract sequence numbers to find the highest
    const sequenceNumbers = invoices.map(inv => {
      const match = inv.invoice_number.match(/(\d{4})$/);
      return match ? parseInt(match[1]) : 0;
    });
    
    const maxSequence = Math.max(...sequenceNumbers, 0);
    console.log(`\nHighest sequence number found: ${maxSequence}`);
    console.log(`Next invoice should start from: ${(maxSequence + 1).toString().padStart(4, '0')}`);
    
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoices();
