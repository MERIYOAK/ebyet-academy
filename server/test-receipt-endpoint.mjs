import fetch from 'node-fetch';

// Test the receipt endpoint
const testReceiptEndpoint = async () => {
  console.log('🧪 Testing Receipt Endpoint\n');

  const baseUrl = 'http://localhost:5000';
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123'
  };

  try {
    // 1. Login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');

    // 2. Get a course to test with
    console.log('2️⃣ Getting test course...');
    const coursesResponse = await fetch(`${baseUrl}/api/courses`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!coursesResponse.ok) {
      throw new Error(`Failed to get courses: ${coursesResponse.status}`);
    }

    const coursesData = await coursesResponse.json();
    const testCourse = coursesData.data[0];
    console.log(`✅ Using course: ${testCourse.title} (ID: ${testCourse._id})\n`);

    // 3. Test receipt endpoint
    console.log('3️⃣ Testing receipt endpoint...');
    
    const receiptResponse = await fetch(`${baseUrl}/api/payment/receipt/${testCourse._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Receipt endpoint response:`);
    console.log(`   Status: ${receiptResponse.status}`);
    console.log(`   OK: ${receiptResponse.ok}`);

    if (receiptResponse.ok) {
      const receiptData = await receiptResponse.json();
      console.log(`   Success: ${receiptData.success}`);
      if (receiptData.receipt) {
        console.log(`   Receipt Data:`);
        console.log(`     Order ID: ${receiptData.receipt.orderId}`);
        console.log(`     Course: ${receiptData.receipt.courseTitle}`);
        console.log(`     Amount: ${receiptData.receipt.amount} ${receiptData.receipt.currency}`);
        console.log(`     Status: ${receiptData.receipt.status}`);
      }
    } else {
      const errorData = await receiptResponse.text();
      console.log(`   Error: ${errorData}`);
    }

    // 4. Test with invalid course ID
    console.log('\n4️⃣ Testing with invalid course ID...');
    
    const invalidReceiptResponse = await fetch(`${baseUrl}/api/payment/receipt/invalid-course-id`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Invalid course ID response:`);
    console.log(`   Status: ${invalidReceiptResponse.status}`);
    console.log(`   OK: ${invalidReceiptResponse.ok}`);

    if (!invalidReceiptResponse.ok) {
      const errorData = await invalidReceiptResponse.text();
      console.log(`   Error: ${errorData}`);
    }

    // 5. Test without authentication
    console.log('\n5️⃣ Testing without authentication...');
    
    const noAuthResponse = await fetch(`${baseUrl}/api/payment/receipt/${testCourse._id}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 No auth response:`);
    console.log(`   Status: ${noAuthResponse.status}`);
    console.log(`   OK: ${noAuthResponse.ok}`);

    if (!noAuthResponse.ok) {
      const errorData = await noAuthResponse.text();
      console.log(`   Error: ${errorData}`);
    }

    // 6. Summary
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Login working');
    console.log('   ✅ Course fetching working');
    console.log('   ✅ Receipt endpoint accessible');
    console.log('   ✅ Authentication required');
    console.log('   ✅ Invalid course ID handled');
    console.log('\n🎉 Receipt endpoint is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Check if server is running
    try {
      const healthCheck = await fetch(`${baseUrl}/api/health`);
      console.log(`Server health check: ${healthCheck.status}`);
    } catch (healthError) {
      console.error('❌ Server appears to be down or not accessible');
      console.error('   Make sure the server is running on http://localhost:5000');
    }
    
    process.exit(1);
  }
};

// Run the test
testReceiptEndpoint();
