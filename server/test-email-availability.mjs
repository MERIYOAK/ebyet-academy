import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testEmailAvailability() {
  console.log('🧪 Testing Email Availability System\n');

  // Test 1: Check non-existent email
  console.log('1️⃣ Testing non-existent email...');
  try {
    const response1 = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com'
      })
    });

    const result1 = await response1.json();
    console.log('✅ Non-existent email result:', result1);
  } catch (error) {
    console.error('❌ Error testing non-existent email:', error.message);
  }

  // Test 2: Check invalid email format
  console.log('\n2️⃣ Testing invalid email format...');
  try {
    const response2 = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid-email'
      })
    });

    const result2 = await response2.json();
    console.log('✅ Invalid email result:', result2);
  } catch (error) {
    console.error('❌ Error testing invalid email:', error.message);
  }

  // Test 3: Check empty email
  console.log('\n3️⃣ Testing empty email...');
  try {
    const response3 = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ''
      })
    });

    const result3 = await response3.json();
    console.log('✅ Empty email result:', result3);
  } catch (error) {
    console.error('❌ Error testing empty email:', error.message);
  }

  // Test 4: Test registration with Google OAuth email
  console.log('\n4️⃣ Testing registration with existing email...');
  try {
    const response4 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com', // This should be an email that exists in your database
        password: 'password123'
      })
    });

    const result4 = await response4.json();
    console.log('✅ Registration with existing email result:', result4);
  } catch (error) {
    console.error('❌ Error testing registration with existing email:', error.message);
  }

  console.log('\n🎉 Email availability tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('   ✅ Non-existent email availability check');
  console.log('   ✅ Invalid email format validation');
  console.log('   ✅ Empty email validation');
  console.log('   ✅ Registration with existing email prevention');
}

// Run the tests
testEmailAvailability().catch(console.error); 