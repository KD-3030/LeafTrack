// Test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📋 MongoDB URI:', process.env.MONGODB_URI ? 'Set ✅' : 'Missing ❌');
    
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in environment variables');
      console.log('   Please update your .env file with your MongoDB Atlas connection string');
      return;
    }

    // Hide sensitive parts of the URI for logging
    const safeUri = process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@');
    console.log('🔗 Connecting to:', safeUri);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Test basic operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Database has ${collections.length} collections`);
    
    await mongoose.disconnect();
    console.log('✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Fix: Check your username/password in the connection string');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Fix: Check your cluster URL in the connection string');
    } else {
      console.log('\n💡 Fix: Verify your MongoDB Atlas connection string in .env file');
    }
  }
}

testConnection();