/**
 * Script to fix products with missing fields in the database
 * Adds default values for manufacturingCost and totalStock
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Product Schema
const ProductSchema = new mongoose.Schema({
  name: String,
  manufacturingCost: Number,
  totalStock: Number,
  hsn_code: String,
  gst_rate: Number,
}, {
  timestamps: true,
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function fixProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products in database\n`);

    if (products.length === 0) {
      console.log('ℹ️  No products found. The database is empty.\n');
      return;
    }

    let fixed = 0;
    
    console.log('🔧 Checking and fixing products...\n');
    console.log('═══════════════════════════════════════');

    for (const product of products) {
      let needsUpdate = false;
      const updates = {};

      console.log(`\n📦 ${product.name}:`);

      // Check manufacturingCost
      if (product.manufacturingCost === undefined || product.manufacturingCost === null) {
        updates.manufacturingCost = 100; // Default ₹100
        console.log(`   ⚠️  Missing manufacturingCost → Setting to ₹100`);
        needsUpdate = true;
      } else {
        console.log(`   ✓ manufacturingCost: ₹${product.manufacturingCost}`);
      }

      // Check totalStock
      if (product.totalStock === undefined || product.totalStock === null) {
        updates.totalStock = 100; // Default 100 units
        console.log(`   ⚠️  Missing totalStock → Setting to 100 units`);
        needsUpdate = true;
      } else {
        console.log(`   ✓ totalStock: ${product.totalStock} units`);
      }

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        console.log(`   ✅ Updated!`);
        fixed++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`\n✅ Process complete!`);
    console.log(`   Total products: ${products.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Already correct: ${products.length - fixed}`);
    console.log('═══════════════════════════════════════\n');

    // Show updated products
    if (fixed > 0) {
      console.log('\n📋 Updated Products:\n');
      const updatedProducts = await Product.find({}).sort({ createdAt: -1 });
      updatedProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}:`);
        console.log(`   Manufacturing Cost: ₹${product.manufacturingCost}`);
        console.log(`   Total Stock: ${product.totalStock} units`);
        console.log(`   HSN Code: ${product.hsn_code}`);
        console.log(`   GST Rate: ${product.gst_rate}%\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
fixProducts();
