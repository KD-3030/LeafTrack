// scripts/verify-production.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function verifyProduction() {
  try {
    console.log('🔍 Verifying production database state...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log('🎯 Production Database Status:');
    
    let totalDocs = 0;
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   ${col.name}: ${count} documents`);
      totalDocs += count;
    }
    
    console.log(`\nTotal documents: ${totalDocs}`);
    
    // Check if we have the expected production setup
    const users = await db.collection('users').find({}).toArray();
    const companySettings = await db.collection('companysettings').find({}).toArray();
    
    console.log('\n✅ Production Verification:');
    console.log(`   Users: ${users.length} (should be 1 admin)`);
    console.log(`   Company Settings: ${companySettings.length} (should be 1)`);
    
    if (users.length === 1 && companySettings.length === 1) {
      console.log('\n🎉 Database is production-ready!');
      console.log(`   Admin: ${users[0].name} (${users[0].email})`);
      console.log(`   Company: ${companySettings[0].company_name}`);
    } else {
      console.log('\n⚠️  Production setup may be incomplete');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

verifyProduction();