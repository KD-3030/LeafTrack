// Simple test to verify salesman dashboard data has no NaN values
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return mongoose.connections[0].db;
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn.connection.db;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const testSalesmanData = async () => {
  try {
    await connectDB();
    
    // Get a salesman user
    const usersCollection = mongoose.connection.db.collection('users');
    const salesman = await usersCollection.findOne({ role: 'Salesman' });
    
    if (!salesman) {
      console.log('No salesman found in database');
      return;
    }
    
    console.log('Testing with salesman:', salesman.name);
    
    // Get assignments for this salesman (simulating the API call)
    const assignmentsCollection = mongoose.connection.db.collection('assignments');
    const assignments = await assignmentsCollection.find({ 
      salesman_id: salesman._id 
    }).toArray();
    
    console.log(`Found ${assignments.length} assignments`);
    
    // Get product details for each assignment
    const productsCollection = mongoose.connection.db.collection('products');
    
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const product = await productsCollection.findOne({ 
        _id: assignment.productId 
      });
      
      console.log(`\nAssignment ${i + 1}:`);
      console.log('- Product:', product?.name || 'Unknown');
      console.log('- Assignment Quantity:', assignment.quantity);
      console.log('- Selling Price:', assignment.sellingPricePerUnit);
      console.log('- Product Manufacturing Cost:', product?.manufacturingCost || 'undefined');
      console.log('- Product Total Stock:', product?.totalStock || 'undefined');
      console.log('- Product Price (old):', product?.price || 'undefined');
      
      // Check for potential NaN issues
      if (isNaN(assignment.sellingPricePerUnit)) {
        console.log('❌ ISSUE: sellingPricePerUnit is NaN');
      }
      if (product && isNaN(product.manufacturingCost)) {
        console.log('❌ ISSUE: manufacturingCost is NaN');
      }
      if (product && isNaN(product.totalStock)) {
        console.log('❌ ISSUE: totalStock is NaN');
      }
      
      if (!isNaN(assignment.sellingPricePerUnit) && 
          (!product || !isNaN(product.manufacturingCost)) && 
          (!product || !isNaN(product.totalStock))) {
        console.log('✅ All numeric fields are valid');
      }
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

testSalesmanData();