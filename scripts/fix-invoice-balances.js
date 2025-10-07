/**
 * Migration Script: Recalculate All Invoice Balances
 * 
 * This script fixes the payment-invoice mismatch by recalculating
 * paid_amount and balance_due for ALL invoices based on their
 * actual payment records.
 * 
 * Run this once to fix historical data.
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

async function recalculateAllInvoiceBalances() {
  console.log('🔧 Starting invoice balance recalculation...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const invoicesCollection = db.collection('invoices');
    const paymentsCollection = db.collection('payments');
    
    // Get all non-cancelled invoices
    const invoices = await invoicesCollection.find({
      status: { $ne: 'Cancelled' }
    }).toArray();
    
    console.log(`📊 Found ${invoices.length} invoices to process\n`);
    
    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;
    
    for (const invoice of invoices) {
      try {
        // Get all confirmed/pending payments for this invoice
        const payments = await paymentsCollection.find({
          invoice_id: invoice._id,
          status: { $in: ['Confirmed', 'Pending'] }
        }).toArray();
        
        // Calculate total paid from all payments
        const totalPaid = payments.reduce((sum, payment) => {
          return sum + (payment.amount_paid || 0);
        }, 0);
        
        // Calculate balance due
        const balanceDue = invoice.grand_total - totalPaid;
        
        // Determine payment status
        let paymentStatus = 'Pending';
        if (balanceDue <= 0) {
          paymentStatus = 'Paid';
        } else if (totalPaid > 0) {
          paymentStatus = 'Partial';
        }
        
        // Check if update is needed
        const needsUpdate = 
          invoice.paid_amount !== totalPaid ||
          invoice.balance_due !== Math.max(0, balanceDue) ||
          invoice.payment_status !== paymentStatus;
        
        if (needsUpdate) {
          // Update the invoice
          await invoicesCollection.updateOne(
            { _id: invoice._id },
            {
              $set: {
                paid_amount: totalPaid,
                balance_due: Math.max(0, balanceDue),
                payment_status: paymentStatus,
                updated_at: new Date()
              }
            }
          );
          
          updatedCount++;
          
          console.log(`✅ Updated Invoice ${invoice.invoice_number}:`);
          console.log(`   - Payments: ${payments.length}`);
          console.log(`   - Old: paid=${invoice.paid_amount}, due=${invoice.balance_due}, status=${invoice.payment_status}`);
          console.log(`   - New: paid=${totalPaid}, due=${Math.max(0, balanceDue)}, status=${paymentStatus}\n`);
        } else {
          unchangedCount++;
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing invoice ${invoice.invoice_number}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total Invoices Processed: ${invoices.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`➖ Unchanged: ${unchangedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');
    
    if (updatedCount > 0) {
      console.log('✨ Invoice balances have been recalculated successfully!');
      console.log('🎯 Outstanding balances should now be accurate.\n');
    } else {
      console.log('ℹ️  All invoices were already up to date.\n');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  recalculateAllInvoiceBalances()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { recalculateAllInvoiceBalances };
