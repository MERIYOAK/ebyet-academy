import fetch from 'node-fetch';

async function testUserRegistration() {
  console.log('🧪 Testing User Registration...\n');

  try {
    console.log('📤 Attempting user registration...');
    
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      })
    });

    console.log(`📥 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ User registration successful!');
      console.log(`   - Token: ${result.token ? 'Received' : 'Not received'}`);
      console.log(`   - User ID: ${result.data?._id || 'Not provided'}`);
    } else {
      const errorText = await response.text();
      console.log('❌ User registration failed');
      console.log(`   - Error: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUserRegistration(); 