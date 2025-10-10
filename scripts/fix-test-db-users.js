/**
 * Script to fix user roles in the test database
 * Converts lowercase roles to proper case: 'admin' -> 'Admin', 'salesman' -> 'Salesman'
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

console.log(`📍 Using database: ${MONGODB_URI.split('/')[3].split('?')[0]}\n`);

// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  address: String,
  state: String,
  gstin: String,
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixUserRoles() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users in database\n`);

    if (users.length === 0) {
      console.log('ℹ️  No users found.\n');
      return;
    }

    let fixed = 0;
    const roleMapping = {
      'admin': 'Admin',
      'salesman': 'Salesman',
      'customer': 'Customer',
    };

    console.log('═══════════════════════════════════════');
    console.log('🔧 FIXING USER ROLES');
    console.log('═══════════════════════════════════════\n');

    for (const user of users) {
      const currentRole = user.role;
      const normalizedRole = roleMapping[currentRole.toLowerCase()] || currentRole;

      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   Current role: "${currentRole}"`);

      if (currentRole !== normalizedRole) {
        user.role = normalizedRole;
        await user.save();
        console.log(`   ✅ Fixed role to: "${normalizedRole}"`);
        fixed++;
      } else {
        console.log(`   ✓ Role is correct`);
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log(`✅ Process complete!`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Already correct: ${users.length - fixed}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
fixUserRoles();
