// scripts/check-users.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    console.log('🔍 Checking LeafTrack User Accounts');
    console.log('=====================================\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    console.log(`📊 Total Users: ${users.length}\n`);
    
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name} (${user.role})`);
      console.log(`   📧 Email: ${user.email}`);
      if (user.phone) console.log(`   📱 Phone: ${user.phone}`);
      console.log(`   🕐 Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log('');
    });

    // Check specifically for salesmen
    const salesmen = users.filter(u => u.role === 'Salesman');
    
    if (salesmen.length === 0) {
      console.log('❌ No Salesman accounts found in the database');
      console.log('💡 You need to create salesman accounts through the Admin panel');
      console.log('   Go to: Admin Dashboard > Salesmen > Add New Salesman');
    } else {
      console.log(`👥 Salesman Accounts (${salesmen.length}):`);
      console.log('========================');
      salesmen.forEach((salesman, i) => {
        console.log(`${i + 1}. ${salesman.name}`);
        console.log(`   📧 Login Email: ${salesman.email}`);
        console.log(`   🔐 Password: [Encrypted in database]`);
        console.log('   💡 Default password is usually "password123" or "123456"');
        console.log('');
      });
    }

    console.log('\n🔑 Current Admin Account:');
    const admin = users.find(u => u.role === 'Admin');
    if (admin) {
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: admin123 (from production setup)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

checkUsers();