import fetch from 'node-fetch';

async function testUserLogin() {
  console.log('🧪 Testing User Login...\n');

  try {
    console.log('📤 Attempting user login...');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'webhooktest@example.com',
        password: 'password123'
      })
    });

    console.log(`📥 Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ User login successful!');
      console.log(`   - Token: ${result.token ? 'Received' : 'Not received'}`);
      console.log(`   - User ID: ${result.data?._id || 'Not provided'}`);
      return result.token;
    } else {
      const errorText = await response.text();
      console.log('❌ User login failed');
      console.log(`   - Error: ${errorText}`);
      
      // Try registration if login fails
      console.log('\n📤 Attempting user registration...');
      const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'webhooktest@example.com',
          password: 'password123'
        })
      });

      if (registerResponse.ok) {
        const registerResult = await registerResponse.json();
        console.log('✅ User registration successful!');
        console.log(`   - Full response:`, JSON.stringify(registerResult, null, 2));
        console.log(`   - Token: ${registerResult.token ? 'Received' : 'Not received'}`);
        console.log(`   - User ID: ${registerResult.data?._id || 'Not provided'}`);
        return registerResult.token;
      } else {
        const registerError = await registerResponse.text();
        console.log('❌ User registration also failed');
        console.log(`   - Error: ${registerError}`);
        return null;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

testUserLogin(); 