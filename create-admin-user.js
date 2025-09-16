const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import MongoDB connection
const { MongoClient } = require('mongodb');

async function createAdminUser() {
  try {
    console.log('👑 Creating New Admin User');
    console.log('==========================\n');

    // Connect to MongoDB directly
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    
    // Get admin details from user input or use defaults
    const adminEmail = process.argv[2] || 'admin@leaftrack.com';
    const adminName = process.argv[3] || 'Administrator';
    const adminPassword = process.argv[4] || 'admin123'; // Simple password for easy login
    
    // Check if admin already exists
    const existingAdmin = await db.collection('users').findOne({ 
      email: adminEmail 
    });
    
    if (existingAdmin) {
      console.log(`⚠️  Admin user with email ${adminEmail} already exists!`);
      console.log('   - You can still login with existing credentials');
      console.log('   - Or delete the existing user first');
      await client.close();
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Create new admin user
    const newAdmin = {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(newAdmin);
    
    if (result.insertedId) {
      console.log('🎉 SUCCESS! New admin user created');
      console.log('==================================');
      console.log('👤 Name:', adminName);
      console.log('📧 Email:', adminEmail);
      console.log('🔐 Password:', adminPassword);
      console.log('🌐 Login URL: http://localhost:3001/login');
      console.log('📱 Admin Dashboard: http://localhost:3001/admin/dashboard');
      console.log('');
      console.log('⚠️  IMPORTANT: Save these credentials securely!');
      console.log('💡 You can now login and manage users, products, and more');
    } else {
      console.log('❌ Failed to create admin user');
    }

    await client.close();
  } catch (error) {
    console.error('🔥 Error creating admin user:', error.message);
    if (error.message.includes('MONGODB_URI')) {
      console.log('\n💡 Make sure your .env.local file has MONGODB_URI set correctly');
    }
  }
}

createAdminUser();