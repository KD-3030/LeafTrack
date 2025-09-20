// SaleReturn Collection Verification Script
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function verifySaleReturnCollection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    // Check specifically for salereturns collection
    const saleReturnCollection = collections.find(col => col.name === 'salereturns');
    if (saleReturnCollection) {
      console.log('✅ SaleReturn collection (salereturns) found!');

      // Get collection stats
      try {
        const db = mongoose.connection.db;
        const stats = await db.collection('salereturns').stats();
        console.log('📊 Collection stats:');
        console.log(`  - Document count: ${stats.count || 0}`);
        console.log(`  - Size: ${stats.size || 0} bytes`);
        console.log(`  - Storage size: ${stats.storageSize || 0} bytes`);
      } catch (error) {
        console.log('📊 Collection exists but no stats available (likely empty)');
      }

      // Check indexes
      try {
        const indexes = await mongoose.connection.db.collection('salereturns').indexes();
        console.log('🔍 Collection indexes:');
        indexes.forEach(index => {
          console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (error) {
        console.log('🔍 Could not retrieve indexes');
      }

      // Test document count
      try {
        const count = await mongoose.connection.db.collection('salereturns').countDocuments();
        console.log(`📄 Total documents: ${count}`);
      } catch (error) {
        console.log('📄 Could not count documents');
      }

    } else {
      console.log('❌ SaleReturn collection not found');
    }

    console.log('🎉 Verification completed successfully!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the verification
verifySaleReturnCollection()
  .then(() => {
    console.log('✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });