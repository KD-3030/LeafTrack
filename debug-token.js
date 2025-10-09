// Debug script to check your JWT token and user details
const jwt = require('jsonwebtoken');

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('Usage: node debug-token.js <your_token>');
  console.log('\nTo get your token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Type: localStorage.getItem("leaftrack_token")');
  console.log('4. Copy the token and run: node debug-token.js <token>');
  process.exit(1);
}

console.log('\n=== TOKEN DEBUG INFO ===\n');

try {
  // Decode without verification to see contents
  const decoded = jwt.decode(token);
  
  console.log('Token Contents:');
  console.log('- User ID:', decoded.userId);
  console.log('- Role:', decoded.role);
  console.log('- Name:', decoded.name || '❌ MISSING (This is the problem!)');
  console.log('- Issued At:', new Date(decoded.iat * 1000).toLocaleString());
  console.log('- Expires At:', new Date(decoded.exp * 1000).toLocaleString());
  
  const now = Date.now() / 1000;
  if (decoded.exp < now) {
    console.log('\n⚠️  TOKEN EXPIRED! You need to log in again.');
  } else {
    console.log('\n✅ Token is still valid');
  }
  
  if (!decoded.name) {
    console.log('\n❌ PROBLEM: Token is missing "name" field');
    console.log('   This causes the 403 error when creating orders.');
    console.log('\n🔧 SOLUTION:');
    console.log('   1. Log out of the application');
    console.log('   2. Log back in with your credentials');
    console.log('   3. This will generate a new token with the name field');
  }
  
  if (decoded.role !== 'salesman') {
    console.log('\n❌ PROBLEM: Your role is not "salesman"');
    console.log('   Current role:', decoded.role);
    console.log('   Only users with role="salesman" can create orders');
  }
  
} catch (error) {
  console.error('Error decoding token:', error.message);
  console.log('\nMake sure you copied the complete token string.');
}

console.log('\n');
