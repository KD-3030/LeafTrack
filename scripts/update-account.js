const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function updateAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await mongoose.connection.db.collection('companysettings').updateOne(
      {},
      { $set: { account_number: '4427008700000338' } }
    );
    
    console.log('Updated:', result.modifiedCount, 'document(s)');
    
    // Verify the update
    const settings = await mongoose.connection.db.collection('companysettings').findOne({});
    console.log('New account_number:', settings.account_number);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAccount();
