#!/usr/bin/env node
// scripts/prepare-production.mjs
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🏭 LeafTrack Production Database Setup');
console.log('=====================================\n');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Simple schemas for production setup
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: String,
  state: String,
  gstin: String
}, { timestamps: true });

const companySettingsSchema = new mongoose.Schema({
  company_name: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  phone: String,
  email: String,
  gstin: String,
  logo_url: String,
  currency: { type: String, default: 'INR' },
  timezone: { type: String, default: 'Asia/Kolkata' }
}, { timestamps: true });

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function createBackup() {
  try {
    console.log('📦 Creating backup of current data...\n');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const backup = {};
    
    for (const col of collections) {
      const data = await db.collection(col.name).find({}).toArray();
      backup[col.name] = data;
      console.log(`  ✅ Backed up ${col.name}: ${data.length} documents`);
    }
    
    // Save backup to file
    const backupFile = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
    const backupPath = join(__dirname, '..', backupFile);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Backup saved to: ${backupFile}\n`);
    
    return backup;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

async function cleanTestData() {
  try {
    console.log('🧹 Cleaning test/demo data...\n');
    
    const db = mongoose.connection.db;
    
    // Clear all test data
    const collectionsToClean = [
      'users',
      'products', 
      'assignments',
      'locations',
      'sales',
      'invoices',
      'payments',
      'customers'
    ];
    
    for (const collectionName of collectionsToClean) {
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`  🗑️  Cleared ${collectionName}: ${result.deletedCount} documents`);
    }
    
    console.log('\n✅ All test data cleaned successfully!\n');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

async function setupProductionData() {
  try {
    console.log('🏢 Setting up production data...\n');
    
    // Get company details
    console.log('📋 Please provide your company information:\n');
    
    const companyName = await askQuestion('Company Name: ');
    const companyAddress = await askQuestion('Company Address: ');
    const companyCity = await askQuestion('City: ');
    const companyState = await askQuestion('State: ');
    const companyPincode = await askQuestion('Pincode: ');
    const companyPhone = await askQuestion('Phone: ');
    const companyEmail = await askQuestion('Email: ');
    const companyGstin = await askQuestion('GSTIN (optional): ');
    
    console.log('\n👤 Admin User Setup:\n');
    
    const adminName = await askQuestion('Admin Full Name: ');
    const adminEmail = await askQuestion('Admin Email: ');
    const adminPhone = await askQuestion('Admin Phone: ');
    
    let adminPassword;
    do {
      adminPassword = await askQuestion('Admin Password (min 6 characters): ');
      if (adminPassword.length < 6) {
        console.log('⚠️  Password must be at least 6 characters long!\n');
      }
    } while (adminPassword.length < 6);
    
    // Create models
    const User = mongoose.model('User', userSchema);
    const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);
    
    // Create company settings
    await CompanySettings.create({
      company_name: companyName,
      address: companyAddress,
      city: companyCity,
      state: companyState,
      pincode: companyPincode,
      phone: companyPhone,
      email: companyEmail,
      gstin: companyGstin || null,
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    });
    
    console.log('  ✅ Company settings created');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      phone: adminPhone,
      address: companyAddress,
      state: companyState,
      gstin: companyGstin || null
    });
    
    console.log('  ✅ Admin user created');
    
    console.log('\n🎉 Production setup completed successfully!\n');
    console.log('📊 Production Database Summary:');
    console.log(`   🏢 Company: ${companyName}`);
    console.log(`   👑 Admin: ${adminName} (${adminEmail})`);
    console.log('   📦 Products: 0 (ready for your catalog)');
    console.log('   👥 Salesmen: 0 (ready to add your team)');
    console.log('   📍 Locations: 0 (will be tracked automatically)');
    console.log('   💰 Sales: 0 (ready for business)');
    
    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: Admin`);
    
  } catch (error) {
    console.error('❌ Production setup failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    // Show current state
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📊 Current Database State:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      if (count > 0) {
        console.log(`   ${col.name}: ${count} documents`);
      }
    }
    
    console.log('\n⚠️  WARNING: This will delete ALL existing data and create a clean production database.\n');
    
    const confirm = await askQuestion('Are you sure you want to continue? (type "yes" to confirm): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
    
    console.log('\n🚀 Starting production database setup...\n');
    
    // Step 1: Create backup
    await createBackup();
    
    // Step 2: Clean test data
    await cleanTestData();
    
    // Step 3: Setup production data
    await setupProductionData();
    
    console.log('\n🎯 Your LeafTrack database is now production-ready!');
    console.log('🌐 You can now start your application and begin using it for real business.');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

main();