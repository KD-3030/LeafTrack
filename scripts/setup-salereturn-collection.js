// Database Setup Script - Ensures SaleReturn collection exists and is properly configured
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

// Import the SaleReturn model to register it
require('../models/SaleReturn');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';

async function setupSaleReturnCollection() {
  try {
    // Connect using mongoose to register the model
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB via Mongoose');

    // Get the SaleReturn model
    const SaleReturn = mongoose.model('SaleReturn');
    console.log('SaleReturn model loaded:', SaleReturn.modelName);

    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const saleReturnCollection = collections.find(col => col.name === 'salereturns');

    if (saleReturnCollection) {
      console.log('✅ SaleReturn collection already exists');
    } else {
      console.log('⚠️ SaleReturn collection does not exist, creating...');
      
      // Create the collection by saving a dummy document and then removing it
      const dummyReturn = new SaleReturn({
        return_number: 'DUMMY000001',
        original_invoice_id: new mongoose.Types.ObjectId(),
        original_sale_id: new mongoose.Types.ObjectId(),
        customer_id: new mongoose.Types.ObjectId(),
        salesman_id: new mongoose.Types.ObjectId(),
        return_date: new Date(),
        return_items: [],
        subtotal: 0,
        tax_amount: 0,
        total_refund: 0,
        status: 'Pending',
        refund_method: 'Cash',
        refund_status: 'Pending',
        admin_approval: false
      });

      await dummyReturn.save();
      console.log('✅ SaleReturn collection created with dummy document');

      // Remove the dummy document
      await SaleReturn.findByIdAndDelete(dummyReturn._id);
      console.log('✅ Dummy document removed');
    }

    // Verify indexes are created
    const indexes = await SaleReturn.collection.getIndexes();
    console.log('📊 SaleReturn collection indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`  - ${indexName}:`, indexes[indexName]);
    });

    // Test collection stats
    const stats = await SaleReturn.collection.stats();
    console.log('📈 SaleReturn collection stats:');
    console.log(`  - Document count: ${stats.count || 0}`);
    console.log(`  - Size: ${stats.size || 0} bytes`);
    console.log(`  - Storage size: ${stats.storageSize || 0} bytes`);

    console.log('🎉 SaleReturn collection setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up SaleReturn collection:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup if this script is called directly
if (require.main === module) {
  setupSaleReturnCollection()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupSaleReturnCollection };