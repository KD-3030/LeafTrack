// scripts/generate-auth-token.js
require('dotenv').config({ path: '.env.local' });

async function generateToken() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'kinjaldutta005@gmail.com',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      console.log('✅ Authentication successful!');
      console.log('Token:', data.token);
      console.log('\n📋 Copy this token to use in API tests:');
      console.log(`"${data.token}"`);
      return data.token;
    } else {
      console.error('❌ Authentication failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    return null;
  }
}

generateToken();