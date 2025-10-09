// Test login credentials
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';

async function testLogin() {
  const testEmail = process.argv[2];
  const testPassword = process.argv[3];

  if (!testEmail || !testPassword) {
    console.log('Usage: node test-login-credentials.js <email> <password>');
    console.log('\nExample: node test-login-credentials.js john.smith@leaftrack.com password123');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
    }));

    // Find user by email
    const user = await User.findOne({ email: testEmail });
    
    if (!user) {
      console.log(`❌ No user found with email: ${testEmail}\n`);
      console.log('Available users:');
      const allUsers = await User.find({}).select('email name role');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.name}) - Role: ${u.role}`);
      });
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('');

    // Test password
    const isMatch = await bcrypt.compare(testPassword, user.password);
    
    if (isMatch) {
      console.log('✅ Password is CORRECT!\n');
      console.log('You can log in with:');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword}`);
      console.log(`   Role: ${user.role} (or salesman/admin in lowercase)`);
    } else {
      console.log('❌ Password is INCORRECT!\n');
      console.log('The password you provided does not match the stored password.');
      console.log('If you forgot the password, you may need to reset it in the database.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testLogin();
