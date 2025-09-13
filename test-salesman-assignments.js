// Test script to check assignment API response
const testAssignmentAPI = async () => {
  try {
    // First login to get a token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'salesman@test.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login failed:', await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('Login successful, token:', token ? 'present' : 'missing');

    // Now test the assignments API
    const assignmentsResponse = await fetch('http://localhost:3001/api/assignments', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!assignmentsResponse.ok) {
      console.log('Assignments API failed:', await assignmentsResponse.text());
      return;
    }

    const assignmentsData = await assignmentsResponse.json();
    console.log('Assignment API Response:');
    console.log(JSON.stringify(assignmentsData, null, 2));

  } catch (error) {
    console.error('Test failed:', error);
  }
};

testAssignmentAPI();