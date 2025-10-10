/**
 * Script to create a test admin user
 * Usage: node scripts/create-admin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: String,
  state: String,
  gstin: String,
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Admin user details
    const adminEmail = 'kinjaldutta005@gmail.com';
    const adminName = 'Kinjal Dutta';
    const adminPassword = 'admin123'; // Change this to a secure password

    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmail });
    
    if (existingUser) {
      console.log('⚠️  User already exists with this email!');
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}\n`);
      console.log('💡 If you forgot the password, you can reset it in the database or use a different email.\n');
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    const user = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin', // Properly capitalized
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 Login Credentials:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${user.role}`);
    console.log('═══════════════════════════════════════\n');
    console.log('⚠️  IMPORTANT: Change this password after first login!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
createAdminUser();
