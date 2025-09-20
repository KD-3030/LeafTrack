// Simple SaleReturn Collection Setup Script
const mongoose = require('mongoose');
require('dotenv').config({ path: './.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';

console.log('🔗 Using MongoDB URI:', MONGODB_URI ? 'Atlas connection configured' : 'No connection string found');

// Define the SaleReturn schema directly in this script
const SaleReturnItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  original_quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  return_quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  return_reason: {
    type: String,
    enum: ['Defective', 'Wrong Product', 'Customer Request', 'Quality Issue', 'Other'],
    required: true,
  },
  condition: {
    type: String,
    enum: ['Good', 'Damaged', 'Expired'],
    required: true,
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0,
  },
  total_refund: {
    type: Number,
    required: true,
    min: 0,
  },
});

const SaleReturnSchema = new mongoose.Schema({
  return_number: {
    type: String,
    required: true,
    unique: true,
  },
  original_invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  original_sale_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: true,
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  salesman_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  return_date: {
    type: Date,
    default: Date.now,
  },
  return_items: [SaleReturnItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  tax_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  total_refund: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Rejected'],
    default: 'Pending',
  },
  refund_method: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Store Credit', 'Exchange'],
    default: 'Cash',
  },
  refund_status: {
    type: String,
    enum: ['Pending', 'Processed', 'Failed'],
    default: 'Pending',
  },
  notes: {
    type: String,
    trim: true,
  },
  admin_approval: {
    type: Boolean,
    default: false,
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approval_date: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Generate unique return number
SaleReturnSchema.pre('save', async function(next) {
  if (this.isNew && !this.return_number) {
    const count = await this.constructor.countDocuments();
    this.return_number = `RET${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes for better query performance
SaleReturnSchema.index({ return_number: 1 });
SaleReturnSchema.index({ original_invoice_id: 1 });
SaleReturnSchema.index({ customer_id: 1 });
SaleReturnSchema.index({ return_date: -1 });
SaleReturnSchema.index({ status: 1 });

async function setupSaleReturnCollection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Register the SaleReturn model
    const SaleReturn = mongoose.model('SaleReturn', SaleReturnSchema);
    console.log('✅ SaleReturn model registered');

    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const saleReturnCollection = collections.find(col => col.name === 'salereturns');

    if (saleReturnCollection) {
      console.log('✅ SaleReturn collection already exists');
    } else {
      console.log('⚠️ SaleReturn collection does not exist, creating...');
      
      // Create the collection by creating indexes
      await SaleReturn.createIndexes();
      console.log('✅ SaleReturn collection created with indexes');
    }

    // Verify indexes are created
    const indexes = await SaleReturn.collection.getIndexes();
    console.log('📊 SaleReturn collection indexes:');
    Object.keys(indexes).forEach(indexName => {
      console.log(`  - ${indexName}`);
    });

    // Test collection stats
    try {
      const stats = await SaleReturn.collection.stats();
      console.log('📈 SaleReturn collection stats:');
      console.log(`  - Document count: ${stats.count || 0}`);
      console.log(`  - Size: ${stats.size || 0} bytes`);
      console.log(`  - Storage size: ${stats.storageSize || 0} bytes`);
    } catch (statError) {
      console.log('📈 Collection exists but no documents yet');
    }

    // Test the model by attempting to find documents
    const count = await SaleReturn.countDocuments();
    console.log(`📄 Current SaleReturn documents: ${count}`);

    console.log('🎉 SaleReturn collection setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up SaleReturn collection:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the setup
setupSaleReturnCollection()
  .then(() => {
    console.log('✅ Setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });