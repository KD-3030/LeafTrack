import bcrypt from 'bcryptjs';
// import { Model } from 'mongoose'; // Removed unused import
import connectDB from './mongodb';
import User from '../models/User';
import Product from '../models/Product';
import Assignment from '../models/Assignment';
// import { User as UserType } from '../types'; // Removed to avoid type conflicts
// import { Product as ProductType } from '../types';
// import { Assignment as AssignmentType } from '../types';

// Use the models directly without type casting
const UserModel = User;
const ProductModel = Product;
const AssignmentModel = Assignment;

export async function seedDatabase() {
  try {
    await connectDB();
    
    // Clear existing data - using .exec() to ensure proper execution
    await UserModel.deleteMany({}).exec();
    await ProductModel.deleteMany({}).exec();
    await AssignmentModel.deleteMany({}).exec();
    
    console.log('Cleared existing data...');
    
    // Create Admin User with secure password
    const crypto = await import('crypto');
    
    // Generate secure password
    function generateSecurePassword(length = 16) {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += charset.charAt(crypto.randomInt(charset.length));
      }
      return password;
    }
    
    const adminPlainPassword = generateSecurePassword(16);
    const adminPassword = await bcrypt.hash(adminPlainPassword, 12);
    
    await UserModel.create({
      name: 'Admin User',
      email: 'admin@leaftrack.com',
      password: adminPassword,
      role: 'Admin'
    });
    
    console.log('✅ Admin user created');
    console.log(`🔐 Admin password: ${adminPlainPassword}`);
    console.log('⚠️  IMPORTANT: Save this password securely!');
    
    // Create Salesman Users with secure password
    const salesmanPlainPassword = generateSecurePassword(16);
    const salesmanPassword = await bcrypt.hash(salesmanPlainPassword, 12);
    
    const salesman1 = await UserModel.create({
      name: 'John Smith',
      email: 'john.smith@leaftrack.com',
      password: salesmanPassword,
      role: 'Salesman'
    });
    
    const salesman2 = await UserModel.create({
      name: 'Sarah Johnson',
      email: 'sarah.johnson@leaftrack.com',
      password: salesmanPassword,
      role: 'Salesman'
    });
    
    const salesman3 = await UserModel.create({
      name: 'Mike Wilson',
      email: 'mike.wilson@leaftrack.com',
      password: salesmanPassword,
      role: 'Salesman'
    });
    
    console.log('✅ Created users');
    console.log(`🔐 Salesman password (for all): ${salesmanPlainPassword}`);
    console.log('⚠️  IMPORTANT: Save this password securely!');
    
    // Create Tea Products using create instead of insertMany
    const products = [];
    
    const productsData = [
      {
        name: 'Earl Grey Premium',
        manufacturingCost: 18.99,
        totalStock: 150,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'Ceylon Black Tea',
        manufacturingCost: 14.50,
        totalStock: 200,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'Green Tea Sencha',
        manufacturingCost: 16.00,
        totalStock: 180,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'Chamomile Herbal',
        manufacturingCost: 12.75,
        totalStock: 120,
        hsn_code: '1211',
        gst_rate: 12
      },
      {
        name: 'Oolong Dragon Well',
        manufacturingCost: 24.00,
        totalStock: 90,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'Jasmine Green Tea',
        manufacturingCost: 21.50,
        totalStock: 110,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'English Breakfast',
        manufacturingCost: 15.99,
        totalStock: 250,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'Darjeeling Supreme',
        manufacturingCost: 26.00,
        totalStock: 75,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'White Peony Tea',
        manufacturingCost: 34.00,
        totalStock: 60,
        hsn_code: '0902',
        gst_rate: 12
      },
      {
        name: 'Peppermint Herbal',
        manufacturingCost: 11.99,
        totalStock: 140,
        hsn_code: '1211',
        gst_rate: 12
      }
    ];
    
    // Create products one by one to avoid TypeScript issues
    for (const productData of productsData) {
      const product = new ProductModel(productData);
      await product.save();
      products.push(product);
    }
    
    console.log('Created products...');
    
    // Create Assignments with dynamic pricing
    const assignmentsData = [
      // John Smith assignments
      { salesman_id: salesman1._id, productId: products[0]._id, quantity: 25, sellingPricePerUnit: 28.99 },
      { salesman_id: salesman1._id, productId: products[1]._id, quantity: 30, sellingPricePerUnit: 22.50 },
      { salesman_id: salesman1._id, productId: products[2]._id, quantity: 20, sellingPricePerUnit: 25.00 },
      
      // Sarah Johnson assignments
      { salesman_id: salesman2._id, productId: products[3]._id, quantity: 35, sellingPricePerUnit: 19.75 },
      { salesman_id: salesman2._id, productId: products[4]._id, quantity: 15, sellingPricePerUnit: 38.00 },
      { salesman_id: salesman2._id, productId: products[5]._id, quantity: 25, sellingPricePerUnit: 34.50 },
      
      // Mike Wilson assignments
      { salesman_id: salesman3._id, productId: products[6]._id, quantity: 40, sellingPricePerUnit: 24.99 },
      { salesman_id: salesman3._id, productId: products[7]._id, quantity: 20, sellingPricePerUnit: 42.00 },
      { salesman_id: salesman3._id, productId: products[8]._id, quantity: 10, sellingPricePerUnit: 54.00 },
      { salesman_id: salesman3._id, productId: products[9]._id, quantity: 30, sellingPricePerUnit: 17.99 }
    ];
    
    // Create assignments one by one to avoid TypeScript issues
    for (const assignmentData of assignmentsData) {
      const assignment = new AssignmentModel(assignmentData);
      await assignment.save();
    }
    
    console.log('Created assignments...');
    
    return {
      success: true,
      message: 'Database seeded successfully!',
      credentials: {
        admin: {
          email: 'admin@leaftrack.com',
          password: 'admin123',
          role: 'Admin'
        },
        salesmen: [
          {
            name: 'John Smith',
            email: 'john.smith@leaftrack.com',
            password: 'sales123',
            role: 'Salesman'
          },
          {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@leaftrack.com',
            password: 'sales123',
            role: 'Salesman'
          },
          {
            name: 'Mike Wilson',
            email: 'mike.wilson@leaftrack.com',
            password: 'sales123',
            role: 'Salesman'
          }
        ]
      }
    };
    
  } catch (error) {
    console.error('Seeding error:', error);
    return {
      success: false,
      message: 'Database seeding failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
