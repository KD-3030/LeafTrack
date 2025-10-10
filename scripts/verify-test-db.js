/**
 * Script to verify data in the test database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Schemas
const ProductSchema = new mongoose.Schema({
  name: String,
  manufacturingCost: Number,
  totalStock: Number,
  hsn_code: String,
  gst_rate: Number,
}, { timestamps: true });

const RawMaterialSchema = new mongoose.Schema({
  name: String,
  description: String,
  unit: String,
  base_cost_per_unit: Number,
  current_stock: Number,
  min_stock_level: Number,
  supplier: String,
  is_active: Boolean,
}, { timestamps: true });

const BOMSchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.ObjectId,
  product_name: String,
  version: Number,
  materials: Array,
  total_manufacturing_cost: Number,
  overhead_percentage: Number,
  final_cost: Number,
  status: String,
  is_current: Boolean,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
}, { timestamps: true });

const CustomerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
}, { timestamps: true });

async function verifyDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 Database: ${MONGODB_URI.split('/')[3].split('?')[0]}\n`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Product = mongoose.model('Product', ProductSchema);
    const RawMaterial = mongoose.model('RawMaterial', RawMaterialSchema);
    const BOM = mongoose.model('BOM', BOMSchema);
    const User = mongoose.model('User', UserSchema);
    const Customer = mongoose.model('Customer', CustomerSchema);

    console.log('═══════════════════════════════════════');
    console.log('📊 DATABASE STATISTICS');
    console.log('═══════════════════════════════════════\n');

    // Count documents
    const productCount = await Product.countDocuments();
    const rawMaterialCount = await RawMaterial.countDocuments();
    const bomCount = await BOM.countDocuments();
    const userCount = await User.countDocuments();
    const customerCount = await Customer.countDocuments();

    console.log(`📦 Products: ${productCount}`);
    console.log(`🧪 Raw Materials: ${rawMaterialCount}`);
    console.log(`📋 BOMs: ${bomCount}`);
    console.log(`👤 Users: ${userCount}`);
    console.log(`🏢 Customers: ${customerCount}\n`);

    // Products
    if (productCount > 0) {
      console.log('═══════════════════════════════════════');
      console.log('📦 PRODUCTS');
      console.log('═══════════════════════════════════════\n');
      
      const products = await Product.find({}).limit(20);
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Cost: ₹${product.manufacturingCost || 'N/A'}`);
        console.log(`   Stock: ${product.totalStock || 'N/A'} units`);
        console.log(`   HSN: ${product.hsn_code} | GST: ${product.gst_rate}%\n`);
      });
    }

    // Raw Materials
    if (rawMaterialCount > 0) {
      console.log('═══════════════════════════════════════');
      console.log('🧪 RAW MATERIALS');
      console.log('═══════════════════════════════════════\n');
      
      const rawMaterials = await RawMaterial.find({}).limit(20);
      rawMaterials.forEach((rm, index) => {
        console.log(`${index + 1}. ${rm.name}`);
        console.log(`   Cost: ₹${rm.base_cost_per_unit}/${rm.unit}`);
        console.log(`   Stock: ${rm.current_stock || 0} ${rm.unit}`);
        console.log(`   Status: ${rm.is_active ? 'Active' : 'Inactive'}\n`);
      });
    }

    // BOMs
    if (bomCount > 0) {
      console.log('═══════════════════════════════════════');
      console.log('📋 BILLS OF MATERIALS (BOMs)');
      console.log('═══════════════════════════════════════\n');
      
      const boms = await BOM.find({}).limit(20);
      boms.forEach((bom, index) => {
        console.log(`${index + 1}. ${bom.product_name} (Version ${bom.version})`);
        console.log(`   Materials: ${bom.materials?.length || 0} items`);
        console.log(`   Material Cost: ₹${bom.total_manufacturing_cost || 0}`);
        console.log(`   Final Cost: ₹${bom.final_cost || 0}`);
        console.log(`   Status: ${bom.status} ${bom.is_current ? '(Current)' : ''}\n`);
      });
    }

    // Users
    if (userCount > 0) {
      console.log('═══════════════════════════════════════');
      console.log('👤 USERS');
      console.log('═══════════════════════════════════════\n');
      
      const users = await User.find({}).limit(10);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   Role: ${user.role}\n`);
      });
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ DATABASE VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run verification
verifyDatabase();
