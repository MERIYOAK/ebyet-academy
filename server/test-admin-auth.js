const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAdminAuth() {
  console.log('🔍 Testing Admin Authentication...\n');

  try {
    // Step 1: Test admin login
    console.log('1️⃣ Testing admin login...');
    const loginResponse = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@persi.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      console.log('❌ Admin login failed:', errorData);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Admin login successful!');
    console.log('Token received:', loginData.token ? 'Yes' : 'No');

    // Step 2: Test course creation with admin token
    console.log('\n2️⃣ Testing course creation with admin token...');
    const courseResponse = await fetch('http://localhost:5000/api/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        title: 'Test Course',
        description: 'This is a test course',
        price: 99.99,
        category: 'Test',
        tags: 'test,demo'
      })
    });

    console.log('Course creation status:', courseResponse.status);
    
    if (courseResponse.ok) {
      const courseData = await courseResponse.json();
      console.log('✅ Course creation successful!');
      console.log('Course ID:', courseData.data?._id || 'Not returned');
    } else {
      const errorData = await courseResponse.json();
      console.log('❌ Course creation failed:', errorData);
    }

    // Step 3: Test without admin token
    console.log('\n3️⃣ Testing course creation without admin token...');
    const noTokenResponse = await fetch('http://localhost:5000/api/courses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Course Without Token',
        description: 'This should fail',
        price: 99.99
      })
    });

    console.log('No token status:', noTokenResponse.status);
    if (noTokenResponse.status === 401) {
      console.log('✅ Correctly rejected without token');
    } else {
      console.log('❌ Should have been rejected without token');
    }

  } catch (error) {
    console.error('❌ Error testing admin auth:', error.message);
    console.log('\nMake sure:');
    console.log('1. The server is running on port 5000');
    console.log('2. MongoDB is connected');
    console.log('3. .env file is properly configured');
  }
}

testAdminAuth(); 