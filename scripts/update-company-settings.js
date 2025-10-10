// Script to update company settings to Sohagtea Trading Company
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.log('💡 Make sure your .env.local file contains MONGODB_URI');
  process.exit(1);
}

async function updateCompanySettings() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('companysettings');
    
    // Update or insert company settings
    const result = await collection.updateOne(
      {}, // Match any document (there should only be one)
      {
        $set: {
          company_name: 'Sohagtea Trading Company',
          address: 'Tea Estate Road, Bagdogra',
          city: 'Siliguri',
          state: 'West Bengal',
          pincode: '734421',
          phone: '+91 98765 43210',
          email: 'info@sohagtea.com',
          gstin: '19ABCDE1234F1Z5',
          pan: 'ABCDE1234F',
          updatedAt: new Date(),
        }
      },
      { upsert: true } // Create if doesn't exist
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ Company settings updated successfully!');
    } else if (result.upsertedCount > 0) {
      console.log('✅ Company settings created successfully!');
    }
    
    // Display the updated settings
    const settings = await collection.findOne({});
    console.log('\n📋 Current Company Settings:');
    console.log('─────────────────────────────────────');
    console.log(`Company Name: ${settings.company_name}`);
    console.log(`Address: ${settings.address}`);
    console.log(`City: ${settings.city}`);
    console.log(`State: ${settings.state}`);
    console.log(`Pincode: ${settings.pincode}`);
    console.log(`Phone: ${settings.phone}`);
    console.log(`Email: ${settings.email}`);
    console.log(`GSTIN: ${settings.gstin}`);
    console.log(`PAN: ${settings.pan}`);
    console.log('─────────────────────────────────────\n');
    
  } catch (error) {
    console.error('❌ Error updating company settings:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Database connection closed');
  }
}

updateCompanySettings();
