/**
 * Migration script to fix existing customers with null or empty email values
 * This script removes the email field entirely from customers that have null or empty emails
 * to work correctly with MongoDB's sparse unique index
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixNullEmails() {
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

    // Find all customers with null or empty email
    const customersWithNullEmail = await customers.find({
      $or: [
        { email: null },
        { email: '' }
      ]
    }).toArray();

    console.log(`Found ${customersWithNullEmail.length} customers with null or empty email`);

    if (customersWithNullEmail.length === 0) {
      console.log('No customers to fix. Database is clean!');
      return;
    }

    console.log('Fixing customers one by one...');
    
    // Remove the email field from these customers ONE BY ONE to avoid duplicate key errors
    let successCount = 0;
    let errorCount = 0;
    
    for (const customer of customersWithNullEmail) {
      try {
        await customers.updateOne(
          { _id: customer._id },
          { $unset: { email: '' } }
        );
        successCount++;
        console.log(`  ✓ Fixed customer: ${customer.name} (${customer._id})`);
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Failed to fix customer ${customer._id}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully updated ${successCount} customers`);
    if (errorCount > 0) {
      console.log(`⚠️  Failed to update ${errorCount} customers`);
    }
    console.log('Email field has been removed from customers with null or empty emails');
    console.log('These customers can now be updated without duplicate key errors');

  } catch (error) {
    console.error('Error fixing null emails:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

fixNullEmails();
