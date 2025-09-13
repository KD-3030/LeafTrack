// Test direct database connection to check assignments
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return mongoose.connections[0].db;
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn.connection.db;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const testAssignments = async () => {
  try {
    await connectDB();
    
    // Get assignments directly from database
    const assignmentsCollection = mongoose.connection.db.collection('assignments');
    const assignments = await assignmentsCollection.find({}).limit(2).toArray();
    
    console.log('Sample assignments from database:');
    console.log(JSON.stringify(assignments, null, 2));
    
    // Get products for reference
    const productsCollection = mongoose.connection.db.collection('products');
    const products = await productsCollection.find({}).limit(2).toArray();
    
    console.log('\nSample products from database:');
    console.log(JSON.stringify(products, null, 2));
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

testAssignments();