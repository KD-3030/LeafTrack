// scripts/setup-sohagtea-atlas.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

console.log('🚀 Starting SohagTea Atlas Setup...');

// Check if we have the MongoDB URI
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.log('💡 Make sure your .env file contains MONGODB_URI');
  process.exit(1);
}

// Simple schemas (no imports needed)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Salesman'], required: true },
  phone: String,
  address: String,
  state: String,
  gstin: String,
  customer_type: { type: String, enum: ['Retailer', 'Distributor', 'Wholesaler'] },
  credit_limit: { type: Number, default: 0 }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock_quantity: { type: Number, required: true, min: 0 },
  hsn_code: String,
  gst_rate: { type: Number, default: 5 },
  cost_price: Number
}, { timestamps: true });

const assignmentSchema = new mongoose.Schema({
  salesman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { timestamps: true });

const locationSchema = new mongoose.Schema({
  salesman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: Number,
  address: String,
  timestamp: { type: Date, default: Date.now }
}, { 
  timestamps: true,
  expires: 604800 // 7 days
});

const saleSchema = new mongoose.Schema({
  assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
  salesman_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity_sold: { type: Number, required: true, min: 1 },
  unit_price: Number,
  total_amount: Number,
  sale_date: { type: Date, default: Date.now },
  payment_status: { type: String, enum: ['Pending', 'Paid', 'Partial'], default: 'Pending' }
}, { timestamps: true });

async function setupSohagTeaAtlas() {
  let connection = null;
  
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    console.log('📍 URI starts with:', process.env.MONGODB_URI.substring(0, 25) + '...');
    
    // Connect to Atlas with simplified options
    connection = await mongoose.createConnection(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    
    // Ensure connection is established
    await connection.asPromise();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Create models
    const User = connection.model('User', userSchema);
    const Product = connection.model('Product', productSchema);
    const Assignment = connection.model('Assignment', assignmentSchema);
    const Location = connection.model('Location', locationSchema);
    const Sale = connection.model('Sale', saleSchema);
    
    console.log('📊 Models created successfully');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Assignment.deleteMany({});
    await Location.deleteMany({});
    await Sale.deleteMany({});
    console.log('✅ Data cleared');
    
    // Create admin user
    console.log('👑 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'SohagTea Admin',
      email: 'admin@sohagtea.com',
      password: adminPassword,
      role: 'Admin',
      phone: '+91 9876543210',
      address: 'Head Office, Kolkata, West Bengal',
      state: 'West Bengal',
      gstin: '19ABCDE1234F1Z5'
    });
    console.log(`✅ Admin created: ${admin.name} (${admin.email})`);
    
    // Create salesmen
    console.log('👥 Creating salesmen...');
    const salesmanPassword = await bcrypt.hash('salesman123', 10);
    const salesmen = await User.insertMany([
      {
        name: 'John Smith',
        email: 'john.smith@sohagtea.com',
        password: salesmanPassword,
        role: 'Salesman',
        phone: '+91 9876543211',
        address: 'Park Street Area, Kolkata',
        state: 'West Bengal'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@sohagtea.com',
        password: salesmanPassword,
        role: 'Salesman',
        phone: '+91 9876543212',
        address: 'Salt Lake, Kolkata',
        state: 'West Bengal'
      },
      {
        name: 'Mike Wilson',
        email: 'mike.wilson@sohagtea.com',
        password: salesmanPassword,
        role: 'Salesman',
        phone: '+91 9876543213',
        address: 'Howrah, West Bengal',
        state: 'West Bengal'
      }
    ]);
    console.log(`✅ Created ${salesmen.length} salesmen`);
    
    // Create tea products
    console.log('🍃 Creating tea products...');
    const products = await Product.insertMany([
      {
        name: 'Assam Gold Tea',
        price: 250,
        cost_price: 200,
        stock_quantity: 1000,
        hsn_code: '0902',
        gst_rate: 5
      },
      {
        name: 'Darjeeling Premium',
        price: 400,
        cost_price: 320,
        stock_quantity: 800,
        hsn_code: '0902',
        gst_rate: 5
      },
      {
        name: 'Earl Grey Special',
        price: 350,
        cost_price: 280,
        stock_quantity: 600,
        hsn_code: '0902',
        gst_rate: 5
      },
      {
        name: 'Green Tea Classic',
        price: 300,
        cost_price: 240,
        stock_quantity: 1200,
        hsn_code: '0902',
        gst_rate: 5
      },
      {
        name: 'Masala Chai Mix',
        price: 180,
        cost_price: 150,
        stock_quantity: 1500,
        hsn_code: '0902',
        gst_rate: 5
      },
      {
        name: 'Himalayan White Tea',
        price: 600,
        cost_price: 480,
        stock_quantity: 200,
        hsn_code: '0902',
        gst_rate: 5
      }
    ]);
    console.log(`✅ Created ${products.length} tea products`);
    
    // Create sample assignments
    console.log('📋 Creating sample assignments...');
    const assignments = await Assignment.insertMany([
      {
        salesman_id: salesmen[0]._id,
        product_id: products[0]._id,
        quantity: 50
      },
      {
        salesman_id: salesmen[0]._id,
        product_id: products[1]._id,
        quantity: 30
      },
      {
        salesman_id: salesmen[1]._id,
        product_id: products[2]._id,
        quantity: 40
      },
      {
        salesman_id: salesmen[2]._id,
        product_id: products[3]._id,
        quantity: 60
      }
    ]);
    console.log(`✅ Created ${assignments.length} sample assignments`);
    
    // Success summary
    console.log('\n🎉 SohagTea Atlas Database Setup Complete!');
    console.log('=' .repeat(50));
    console.log('📊 Database Summary:');
    console.log(`   👑 Admin Users: 1`);
    console.log(`   👥 Salesmen: ${salesmen.length}`);
    console.log(`   🍃 Tea Products: ${products.length}`);
    console.log(`   📋 Assignments: ${assignments.length}`);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Admin: admin@sohagtea.com / admin123');
    console.log('   Salesman: john.smith@sohagtea.com / salesman123');
    console.log('');
    console.log('🌐 Access your application at: http://localhost:3000');
    console.log('');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('💡 Check your MongoDB Atlas credentials');
      console.log('   - Username: kinjaldutta005_db_admin');
      console.log('   - Password: Check your .env.local file');
    }
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('💡 Check your MongoDB Atlas network access');
      console.log('   - Go to Network Access in Atlas dashboard');
      console.log('   - Add IP Address: 0.0.0.0/0 (Allow access from anywhere)');
    }
    
    if (error.code === 11000) {
      console.log('💡 Duplicate data exists - the database might already be set up');
    }
    
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.close();
      console.log('🔌 Connection closed');
    }
  }
}

// Run the setup
setupSohagTeaAtlas();