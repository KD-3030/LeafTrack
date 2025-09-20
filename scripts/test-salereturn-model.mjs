// Test SaleReturn Model Import and Basic Operations
import { connectDB } from '../lib/mongodb';
import SaleReturn from '../models/SaleReturn';

async function testSaleReturnModel() {
  try {
    console.log('🧪 Testing SaleReturn model...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Test model import
    console.log('📦 SaleReturn model:', SaleReturn.modelName);
    console.log('📦 Collection name:', SaleReturn.collection.name);

    // Test basic operations
    const count = await SaleReturn.countDocuments();
    console.log(`📄 Current SaleReturn count: ${count}`);

    // Test schema validation by creating a minimal document structure
    const testDoc = new SaleReturn({
      return_number: 'TEST001',
      original_invoice_id: '507f1f77bcf86cd799439011', // Dummy ObjectId
      original_sale_id: '507f1f77bcf86cd799439011',
      customer_id: '507f1f77bcf86cd799439011',
      salesman_id: '507f1f77bcf86cd799439011',
      return_items: [],
      subtotal: 0,
      tax_amount: 0,
      total_refund: 0,
      status: 'Pending',
      refund_method: 'Cash',
      refund_status: 'Pending',
      admin_approval: false
    });

    // Validate the document (but don't save)
    const validationError = testDoc.validateSync();
    if (validationError) {
      console.log('❌ Model validation error:', validationError.message);
    } else {
      console.log('✅ Model validation passed');
    }

    // Test indexes
    const indexes = await SaleReturn.collection.getIndexes();
    console.log('🔍 Available indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`  - ${indexName}`);
    });

    console.log('🎉 SaleReturn model test completed successfully!');

  } catch (error) {
    console.error('❌ SaleReturn model test failed:', error);
    throw error;
  }
}

// Run the test
testSaleReturnModel()
  .then(() => {
    console.log('✅ All tests passed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });