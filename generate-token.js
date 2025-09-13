// Test script to create sample location data
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Use JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not found in environment variables');
  console.log('Please ensure .env.local file exists with JWT_SECRET defined');
  process.exit(1);
}

// Create an admin token
const adminToken = jwt.sign(
  { userId: 'admin', role: 'Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('Admin Token:', adminToken);

// Now you can use this token to make API calls
console.log('\nTo create test data, run this curl command:');
console.log(`curl -X POST http://localhost:3001/api/test-locations -H "Authorization: Bearer ${adminToken}"`);
