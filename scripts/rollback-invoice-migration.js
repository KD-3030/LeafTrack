const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function rollbackAndFixInvoices() {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in .env.local');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    // Define Invoice schema
    const InvoiceSchema = new mongoose.Schema({}, { strict: false });
    const Invoice = mongoose.model('Invoice', InvoiceSchema);

    // Get all invoices sorted by creation date
    const invoices = await Invoice.find({}).sort({ createdAt: 1 });
    console.log(`\n📊 Found ${invoices.length} invoices in database`);

    if (invoices.length === 0) {
      console.log('No invoices found.');
      await mongoose.disconnect();
      return;
    }

    // Show current invoice numbers
    console.log('\n📋 Current invoice numbers (showing all):');
    invoices.forEach((inv, index) => {
      console.log(`  ${index + 1}. ${inv.invoice_number} (Date: ${inv.invoice_date ? inv.invoice_date.toISOString().split('T')[0] : 'N/A'})`);
    });

    // Extract the last 4 digits from each invoice to understand the sequence
    console.log('\n🔍 Analyzing invoice sequence numbers...');
    const sequences = [];
    invoices.forEach(inv => {
      const match = inv.invoice_number.match(/(\d{4})$/);
      if (match) {
        const seq = parseInt(match[1]);
        sequences.push({ id: inv._id, originalNumber: inv.invoice_number, sequence: seq, date: inv.invoice_date || inv.createdAt });
        console.log(`  - ${inv.invoice_number} → Last 4 digits: ${match[1]}`);
      }
    });

    const maxSequence = Math.max(...sequences.map(s => s.sequence));
    console.log(`\n🔢 Highest sequence number: ${maxSequence}`);
    console.log(`   Next invoice will be: ${(maxSequence + 1).toString().padStart(4, '0')}`);

    // Now update only the date part, keeping the last 4 digits
    console.log('\n🔄 Updating invoices: Changing ONLY the date part, keeping last 4 digits...\n');
    
    let updatedCount = 0;
    for (const seqData of sequences) {
      const invoice = invoices.find(inv => inv._id.equals(seqData.id));
      const invoiceDate = invoice.invoice_date || invoice.createdAt;
      const dateStr = invoiceDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      
      // Keep the original sequence number (last 4 digits)
      const newInvoiceNumber = `INV-${dateStr}-${seqData.sequence.toString().padStart(4, '0')}`;

      await Invoice.updateOne(
        { _id: seqData.id },
        { $set: { invoice_number: newInvoiceNumber } }
      );

      console.log(`  ✓ ${seqData.originalNumber} → ${newInvoiceNumber} (kept sequence: ${seqData.sequence})`);
      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} invoices`);
    console.log(`   Next invoice sequence will start from: ${(maxSequence + 1).toString().padStart(4, '0')}`);

    // Show final result
    const updatedInvoices = await Invoice.find({}).sort({ createdAt: 1 });
    console.log('\n📋 Final invoice numbers:');
    updatedInvoices.forEach((inv, index) => {
      console.log(`  ${index + 1}. ${inv.invoice_number}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Rollback and fix completed successfully!');
    console.log('   Database disconnected.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the rollback and fix
rollbackAndFixInvoices();
