import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import connectDB from './mongodb';
import User from '../models/User';
import Product from '../models/Product';
import Assignment from '../models/Assignment';
import { User as UserType } from '../types';
import { Product as ProductType } from '../types';
import { Assignment as AssignmentType } from '../types';

const UserModel = User as Model<UserType>;
const ProductModel = Product as Model<ProductType>;
const AssignmentModel = Assignment as Model<AssignmentType>;

export async function seedDatabase() {
  try {
    await connectDB();
    
    // Clear existing data - using .exec() to ensure proper execution
    await UserModel.deleteMany({}).exec();
    await ProductModel.deleteMany({}).exec();
    await AssignmentModel.deleteMany({}).exec();
    
    console.log('Cleared existing data...');
    
    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await UserModel.create({
      name: 'Admin User',
      email: 'admin@leaftrack.com',
      password: adminPassword,
      role: 'Admin'
    });
    
    // Create Salesman Users
    const salesmanPassword = await bcrypt.hash('sales123', 12);
    
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
    
    console.log('Created users...');
    
    // Create Tea Products using create instead of insertMany
    const products = [];
    
    const productsData = [
      {
        name: 'Earl Grey Premium',
        price: 25.99,
        stock_quantity: 150
      },
      {
        name: 'Ceylon Black Tea',
        price: 18.50,
        stock_quantity: 200
      },
      {
        name: 'Green Tea Sencha',
        price: 22.00,
        stock_quantity: 180
      },
      {
        name: 'Chamomile Herbal',
        price: 16.75,
        stock_quantity: 120
      },
      {
        name: 'Oolong Dragon Well',
        price: 32.00,
        stock_quantity: 90
      },
      {
        name: 'Jasmine Green Tea',
        price: 28.50,
        stock_quantity: 110
      },
      {
        name: 'English Breakfast',
        price: 19.99,
        stock_quantity: 250
      },
      {
        name: 'Darjeeling Supreme',
        price: 35.00,
        stock_quantity: 75
      },
      {
        name: 'White Peony Tea',
        price: 45.00,
        stock_quantity: 60
      },
      {
        name: 'Peppermint Herbal',
        price: 14.99,
        stock_quantity: 140
      }
    ];
    
    // Create products one by one to avoid TypeScript issues
    for (const productData of productsData) {
      const product = new ProductModel(productData);
      await product.save();
      products.push(product);
    }
    
    console.log('Created products...');
    
    // Create Assignments
    const assignmentsData = [
      // John Smith assignments
      { salesman_id: salesman1._id, product_id: products[0]._id, quantity: 25 },
      { salesman_id: salesman1._id, product_id: products[1]._id, quantity: 30 },
      { salesman_id: salesman1._id, product_id: products[2]._id, quantity: 20 },
      
      // Sarah Johnson assignments
      { salesman_id: salesman2._id, product_id: products[3]._id, quantity: 35 },
      { salesman_id: salesman2._id, product_id: products[4]._id, quantity: 15 },
      { salesman_id: salesman2._id, product_id: products[5]._id, quantity: 25 },
      
      // Mike Wilson assignments
      { salesman_id: salesman3._id, product_id: products[6]._id, quantity: 40 },
      { salesman_id: salesman3._id, product_id: products[7]._id, quantity: 20 },
      { salesman_id: salesman3._id, product_id: products[8]._id, quantity: 10 },
      { salesman_id: salesman3._id, product_id: products[9]._id, quantity: 30 }
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
