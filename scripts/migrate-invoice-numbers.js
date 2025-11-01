const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

async function migrateInvoices() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Define Invoice schema
    const InvoiceSchema = new mongoose.Schema({}, { strict: false });
    const Invoice = mongoose.model('Invoice', InvoiceSchema);

    // Get all invoices
    const invoices = await Invoice.find({}).sort({ createdAt: 1 });
    console.log(`\n📊 Found ${invoices.length} invoices in database`);

    if (invoices.length === 0) {
      console.log('No invoices to migrate.');
      await mongoose.disconnect();
      return;
    }

    // Show current invoice numbers
    console.log('\n📋 Current invoice numbers (first 10):');
    invoices.slice(0, 10).forEach(inv => {
      console.log(`  - ${inv.invoice_number} (Date: ${inv.invoice_date ? inv.invoice_date.toISOString().split('T')[0] : 'N/A'})`);
    });

    // Find the highest sequence number
    let maxSequence = 0;
    invoices.forEach(inv => {
      const match = inv.invoice_number.match(/(\d{4})$/);
      if (match) {
        const seq = parseInt(match[1]);
        if (seq > maxSequence) {
          maxSequence = seq;
        }
      }
    });

    console.log(`\n🔢 Highest sequence number found: ${maxSequence}`);
    console.log(`   Next invoice will start from: ${(maxSequence + 1).toString().padStart(4, '0')}`);

    // Ask user if they want to update invoice numbers
    console.log('\n🔄 Starting migration to new format: INV-YYYYMMDD-XXXX');
    console.log('   This will update all existing invoices...\n');

    let updatedCount = 0;
    let sequence = 1; // Start sequence from 1

    for (const invoice of invoices) {
      const invoiceDate = invoice.invoice_date || invoice.createdAt;
      const dateStr = invoiceDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      const newInvoiceNumber = `INV-${dateStr}-${sequence.toString().padStart(4, '0')}`;

      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { invoice_number: newInvoiceNumber } }
      );

      updatedCount++;
      sequence++;

      if (updatedCount <= 10) {
        console.log(`  ✓ ${invoice.invoice_number} → ${newInvoiceNumber}`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} invoices`);
    console.log(`   Next invoice sequence will be: ${sequence.toString().padStart(4, '0')}`);

    // Show updated invoice numbers
    const updatedInvoices = await Invoice.find({}).sort({ createdAt: 1 }).limit(10);
    console.log('\n📋 Updated invoice numbers (first 10):');
    updatedInvoices.forEach(inv => {
      console.log(`  - ${inv.invoice_number}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Migration completed successfully!');
    console.log('   Database disconnected.');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run migration
migrateInvoices();
