// Script to create default company settings if they don't exist
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';

const defaultCompanySettings = {
  company_name: "LeafTrack Demo Company",
  address: "123 Business Street",
  city: "Business City",
  state: "Business State", 
  pincode: "123456",
  country: "India",
  phone: "9876543210",
  email: "admin@leaftrack.com",
  website: "www.leaftrack.com",
  gstin: "29ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  invoice_prefix: "INV",
  invoice_counter: 1,
  invoice_terms: "Payment due within 30 days",
  financial_year_start: new Date("2025-04-01"),
  default_credit_days: 30,
  currency: "INR"
};

async function ensureCompanySettings() {
  console.log('🏢 Checking Company Settings...\n');
  
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const collection = db.collection('companysettings');
    
    // Check if company settings exist
    const existing = await collection.findOne();
    
    if (existing) {
      console.log('✅ Company settings already exist:');
      console.log('   Company:', existing.company_name);
      console.log('   GSTIN:', existing.gstin);
      console.log('   Email:', existing.email);
    } else {
      console.log('⚠️  No company settings found. Creating default settings...');
      
      const result = await collection.insertOne({
        ...defaultCompanySettings,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Default company settings created successfully!');
      console.log('   ID:', result.insertedId);
      console.log('   Company:', defaultCompanySettings.company_name);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the function
ensureCompanySettings();