// scripts/migrate-data.js
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Configure dotenv
config();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import your models using dynamic imports
async function importModels() {
  const User = (await import('../models/User.js')).default;
  const Product = (await import('../models/Product.js')).default;
  const Assignment = (await import('../models/Assignment.js')).default;
  const Location = (await import('../models/Location.js')).default;
  const Sale = (await import('../models/Sale.js')).default;
  
  return { User, Product, Assignment, Location, Sale };
}

async function migrateFromLocal() {
  try {
    console.log('🚀 Starting data migration...');
    
    // Import models
    const { User, Product, Assignment, Location, Sale } = await importModels();
    
    // Connect to local MongoDB first
    const localUri = 'mongodb://localhost:27017/leaftrack';
    const localConn = await mongoose.createConnection(localUri);
    console.log('📡 Connected to local MongoDB');
    
    // Get all data from local
    const LocalUser = localConn.model('User', User.schema);
    const LocalProduct = localConn.model('Product', Product.schema);
    const LocalAssignment = localConn.model('Assignment', Assignment.schema);
    const LocalLocation = localConn.model('Location', Location.schema);
    const LocalSale = localConn.model('Sale', Sale.schema);
    
    const users = await LocalUser.find({});
    const products = await LocalProduct.find({});
    const assignments = await LocalAssignment.find({});
    const locations = await LocalLocation.find({});
    const sales = await LocalSale.find({});
    
    console.log(`📊 Found: ${users.length} users, ${products.length} products, ${assignments.length} assignments, ${locations.length} locations, ${sales.length} sales`);
    
    await localConn.close();
    
    // Connect to Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('☁️ Connected to MongoDB Atlas');
    
    // Migrate data
    if (users.length > 0) {
      await User.insertMany(users);
      console.log(`✅ Migrated ${users.length} users`);
    }
    
    if (products.length > 0) {
      await Product.insertMany(products);
      console.log(`✅ Migrated ${products.length} products`);
    }
    
    if (assignments.length > 0) {
      await Assignment.insertMany(assignments);
      console.log(`✅ Migrated ${assignments.length} assignments`);
    }
    
    if (locations.length > 0) {
      await Location.insertMany(locations);
      console.log(`✅ Migrated ${locations.length} locations`);
    }
    
    if (sales.length > 0) {
      await Sale.insertMany(sales);
      console.log(`✅ Migrated ${sales.length} sales`);
    }
    
    await mongoose.disconnect();
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Check if local MongoDB exists and run migration
async function checkAndMigrate() {
  try {
    console.log('🔍 Checking for local MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/leaftrack');
    await mongoose.disconnect();
    console.log('📍 Local database found, starting migration...');
    await migrateFromLocal();
  } catch (error) {
    console.log('ℹ️ No local database found or connection failed, skipping migration');
    console.log('💡 Make sure your local MongoDB is running if you want to migrate data');
  }
}

checkAndMigrate();