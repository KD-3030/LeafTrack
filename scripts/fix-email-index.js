/**
 * Migration script to drop and recreate the email index with proper sparse configuration
 * This resolves the issue where multiple customers with null emails cause conflicts
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixEmailIndex() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const customers = db.collection('customers');

    // Step 1: Check existing indexes
    console.log('\n📋 Current indexes:');
    const indexes = await customers.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), 
                  index.unique ? '(unique)' : '', 
                  index.sparse ? '(sparse)' : '');
    });

    // Step 2: Drop the existing email index if it exists
    try {
      console.log('\n🗑️  Dropping existing email_1 index...');
      await customers.dropIndex('email_1');
      console.log('✅ Successfully dropped email_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index email_1 does not exist (this is okay)');
      } else {
        throw error;
      }
    }

    // Step 3: Remove null/empty emails from all customers
    console.log('\n🔧 Removing null/empty email fields from customers...');
    const result = await customers.updateMany(
      {
        $or: [
          { email: null },
          { email: '' }
        ]
      },
      {
        $unset: { email: '' }
      }
    );
    console.log(`✅ Cleaned up ${result.modifiedCount} customers`);

    // Step 4: Create new sparse unique index
    console.log('\n🔨 Creating new sparse unique index on email...');
    await customers.createIndex(
      { email: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'email_1'
      }
    );
    console.log('✅ Successfully created sparse unique index on email field');

    // Step 5: Verify the new index
    console.log('\n📋 Updated indexes:');
    const newIndexes = await customers.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), 
                  index.unique ? '(unique)' : '', 
                  index.sparse ? '(sparse)' : '');
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('Customers can now have no email (undefined) without conflicts');
    console.log('Customers with actual emails must be unique');

  } catch (error) {
    console.error('\n❌ Error fixing email index:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

fixEmailIndex();
