// Check user role in database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection string - update if different
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';

async function checkUserRole() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      role: String,
    }));

    const users = await User.find({}).select('name email role');
    
    console.log('=== ALL USERS IN DATABASE ===\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      
      if (user.role !== 'salesman' && user.role !== 'admin') {
        console.log(`   ⚠️  WARNING: Role is "${user.role}" - should be "salesman" or "admin"`);
      }
      console.log('');
    });

    console.log('\n💡 TIP: If your user role is not "salesman", you need to update it in the database.');
    console.log('   Only users with role="salesman" can create orders.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserRole();
