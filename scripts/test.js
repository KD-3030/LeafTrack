// scripts/test-connection.js
const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log('📍 Connection URI:', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database operations
    const db = mongoose.connection.db;
    const admin = db.admin();
    const info = await admin.serverStatus();
    console.log('🎯 Connected to MongoDB version:', info.version);
    console.log('🏠 Database name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('📊 Collections found:', collections.length);
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected successfully');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.message.includes('authentication failed')) {
      console.log('💡 Check your username and password in MongoDB Atlas');
    }
    if (error.message.includes('network')) {
      console.log('💡 Check your IP whitelist in MongoDB Atlas Network Access');
    }
    process.exit(1);
  }
}

testConnection();