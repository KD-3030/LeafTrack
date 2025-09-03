// Quick debug script to check users in database
const { MongoClient } = require('mongodb');

async function checkUsers() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/leaftrack');
  
  try {
    await client.connect();
    const db = client.db('leaftrack');
    
    console.log('=== USERS IN DATABASE ===');
    const users = await db.collection('users').find({}).toArray();
    users.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role} - ID: ${user._id}`);
    });
    
    console.log('\n=== LOCATIONS IN DATABASE ===');
    const locations = await db.collection('locations').find({}).toArray();
    console.log(`Total locations: ${locations.length}`);
    
    // Group by salesman
    const locationsBySalesman = {};
    for (const location of locations) {
      const salesmanId = location.salesman_id.toString();
      if (!locationsBySalesman[salesmanId]) {
        locationsBySalesman[salesmanId] = [];
      }
      locationsBySalesman[salesmanId].push(location);
    }
    
    for (const salesmanId in locationsBySalesman) {
      const user = users.find(u => u._id.toString() === salesmanId);
      const userName = user ? user.name : 'Unknown';
      console.log(`${userName}: ${locationsBySalesman[salesmanId].length} locations`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
