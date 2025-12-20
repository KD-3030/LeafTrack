const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixInvoiceItems() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const invoicesCollection = mongoose.connection.db.collection('invoices');
    
    // Get all invoices
    const invoices = await invoicesCollection.find({}).toArray();
    console.log(`Found ${invoices.length} invoices to check`);

    let fixedInvoices = 0;
    let fixedItems = 0;

    for (const invoice of invoices) {
      if (!invoice.items || invoice.items.length === 0) {
        continue;
      }

      let invoiceNeedsUpdate = false;
      let calculatedSubtotal = 0;
      let calculatedTotalGst = 0;
      
      const updatedItems = invoice.items.map(item => {
        // Calculate correct values from taxable amount and gst rate
        const itemTaxable = item.taxable_amount || (item.quantity * item.unit_price) || 0;
        const gstRate = item.gst_rate || 5;
        const correctGst = (itemTaxable * gstRate) / 100;
        const correctCgst = correctGst / 2;
        const correctSgst = correctGst / 2;
        const correctTotal = itemTaxable + correctGst;
        
        calculatedSubtotal += itemTaxable;
        calculatedTotalGst += correctGst;
        
        // Check if cgst/sgst are wrong (with small tolerance)
        const cgstDiff = Math.abs((item.cgst_amount || 0) - correctCgst);
        const sgstDiff = Math.abs((item.sgst_amount || 0) - correctSgst);
        
        if (cgstDiff > 0.01 || sgstDiff > 0.01) {
          invoiceNeedsUpdate = true;
          fixedItems++;
          console.log(`  Item "${item.product_name}": cgst ${item.cgst_amount?.toFixed(2)} → ${correctCgst.toFixed(2)}, sgst ${item.sgst_amount?.toFixed(2)} → ${correctSgst.toFixed(2)}`);
          
          return {
            ...item,
            cgst_amount: correctCgst,
            sgst_amount: correctSgst,
            total_amount: correctTotal
          };
        }
        
        return item;
      });

      if (invoiceNeedsUpdate) {
        console.log(`\nFixing invoice ${invoice.invoice_number}:`);
        
        // Update the invoice with corrected items and totals
        await invoicesCollection.updateOne(
          { _id: invoice._id },
          {
            $set: {
              items: updatedItems,
              subtotal: calculatedSubtotal,
              taxable_amount: calculatedSubtotal,
              total_tax: calculatedTotalGst,
              total_cgst: calculatedTotalGst / 2,
              total_sgst: calculatedTotalGst / 2,
            }
          }
        );
        fixedInvoices++;
      }
    }

    console.log(`\n✅ Fixed ${fixedItems} items across ${fixedInvoices} invoices`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixInvoiceItems();
