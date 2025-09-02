// Test script to create sample location data
const jwt = require('jsonwebtoken');

// Replace with your actual JWT secret from .env
const JWT_SECRET = 'your-secret-key'; // You should use the actual secret from your .env file

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
