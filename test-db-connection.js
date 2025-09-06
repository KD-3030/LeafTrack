const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testing MongoDB Atlas connection...');
    console.log('URI:', process.env.MONGODB_URI?.replace(/:[^:@]*@/, ':****@'));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas connection successful!');
    
    // Test if we can list collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('Connection closed.');
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();
