// Fix user roles - convert to lowercase
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack';

async function fixUserRoles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      role: String,
    }));

    console.log('=== FIXING USER ROLES ===\n');
    
    // Find all users with capitalized roles
    const usersToFix = await User.find({ 
      role: { $in: ['Admin', 'Salesman'] } 
    });

    console.log(`Found ${usersToFix.length} users with incorrect role capitalization\n`);

    for (const user of usersToFix) {
      const oldRole = user.role;
      const newRole = oldRole.toLowerCase();
      
      user.role = newRole;
      await user.save();
      
      console.log(`✅ Updated: ${user.name} (${user.email})`);
      console.log(`   ${oldRole} → ${newRole}\n`);
    }

    console.log('🎉 All roles fixed!\n');
    console.log('Now log out and log back in to get a fresh token.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixUserRoles();
