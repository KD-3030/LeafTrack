// List salesman accounts
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function listSalesmen() {
  try {
    await mongoose.connect(MONGODB_URI);

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      role: String,
    }));

    const salesmen = await User.find({ role: 'salesman' }).select('name email');
    
    console.log('\n=== SALESMAN ACCOUNTS ===\n');
    salesmen.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name}`);
      console.log(`   Email: ${s.email}`);
      console.log('');
    });

    console.log('Note: You may need to know the password for these accounts.');
    console.log('If you don\'t know the password, you can test with a known account.\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

listSalesmen();
