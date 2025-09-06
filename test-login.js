async function testLogin() {
  try {
    console.log('🔐 Testing login API...');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@sohagtea.com',
        password: 'admin123',
        role: 'Admin'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('👤 User data:', data.user);
      console.log('🎫 Token received:', data.token ? 'Yes' : 'No');
    } else {
      console.error('❌ Login failed:');
      console.error('Status:', response.status);
      console.error('Error:', data);
    }
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Error:', error.message);
  }
}

testLogin();
