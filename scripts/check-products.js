/**
 * Script to check products in the database
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

async function checkProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all products
    const products = await Product.find({}).sort({ createdAt: -1 });
    console.log(`📦 Found ${products.length} products in database\n`);

    if (products.length === 0) {
      console.log('ℹ️  No products found. The database is empty.\n');
      console.log('💡 To create products, use the Products page in the admin panel.\n');
      return;
    }

    console.log('═══════════════════════════════════════');
    products.forEach((product, index) => {
      console.log(`\n📦 Product ${index + 1}:`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Name: ${product.name}`);
      console.log(`   Manufacturing Cost: ₹${product.manufacturingCost}`);
      console.log(`   Total Stock: ${product.totalStock} units`);
      console.log(`   HSN Code: ${product.hsn_code}`);
      console.log(`   GST Rate: ${product.gst_rate}%`);
      console.log(`   Created: ${product.createdAt}`);
    });
    console.log('\n═══════════════════════════════════════');

    console.log(`\n✅ All ${products.length} products listed successfully!\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
checkProducts();
