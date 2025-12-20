const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixInvoiceTotals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const invoicesCollection = mongoose.connection.db.collection('invoices');
    
    // Get all invoices
    const invoices = await invoicesCollection.find({}).toArray();
    console.log(`Found ${invoices.length} invoices to check`);

    let fixedCount = 0;

    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) {
        console.log(`Skipping invoice ${invoice.invoice_number} - no items`);
        continue;
      }

      // Calculate correct subtotal and GST from items
      let calculatedSubtotal = 0;
      let calculatedGst = 0;

      invoice.items.forEach(item => {
        // Calculate taxable amount
        const itemTaxable = item.taxable_amount || (item.quantity * item.unit_price) || 0;
        calculatedSubtotal += itemTaxable;

        // Calculate GST - prefer stored values, then calculate
        if (item.cgst_amount !== undefined && item.sgst_amount !== undefined && 
            (item.cgst_amount > 0 || item.sgst_amount > 0)) {
          calculatedGst += item.cgst_amount + item.sgst_amount;
        } else if (item.tax_amount !== undefined && item.tax_amount > 0) {
          calculatedGst += item.tax_amount;
        } else {
          // Calculate from taxable and rate (default 5% GST)
          const rate = item.gst_rate || 5;
          calculatedGst += (itemTaxable * rate) / 100;
        }
      });

      // Verify grand total matches subtotal + GST (within tolerance)
      const expectedGrandTotal = calculatedSubtotal + calculatedGst;
      const grandTotalDiff = Math.abs((invoice.grand_total || 0) - expectedGrandTotal);
      
      // If grand_total is way off, recalculate GST from difference
      if (grandTotalDiff > 1 && invoice.grand_total > calculatedSubtotal) {
        calculatedGst = invoice.grand_total - calculatedSubtotal;
      }

      // Check if values are different (with small tolerance for floating point)
      const subtotalDiff = Math.abs((invoice.subtotal || 0) - calculatedSubtotal);
      const gstDiff = Math.abs((invoice.total_tax || 0) - calculatedGst);

      if (subtotalDiff > 0.01 || gstDiff > 0.01) {
        console.log(`\nFixing invoice ${invoice.invoice_number}:`);
        console.log(`  Old subtotal: ${invoice.subtotal?.toFixed(2)}, Calculated: ${calculatedSubtotal.toFixed(2)}`);
        console.log(`  Old total_tax: ${invoice.total_tax?.toFixed(2)}, Calculated: ${calculatedGst.toFixed(2)}`);
        console.log(`  Grand total: ${invoice.grand_total?.toFixed(2)}`);

        // Update the invoice
        await invoicesCollection.updateOne(
          { _id: invoice._id },
          {
            $set: {
              subtotal: calculatedSubtotal,
              taxable_amount: calculatedSubtotal,
              total_tax: calculatedGst,
              total_cgst: calculatedGst / 2,
              total_sgst: calculatedGst / 2,
            }
          }
        );
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} invoices`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixInvoiceTotals();
