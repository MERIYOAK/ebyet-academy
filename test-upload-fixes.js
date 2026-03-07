// Test script to validate upload fixes

async function testPresignedUrlEndpoint() {
  try {
    console.log('🧪 Testing presigned URL endpoint...');
    
    // Test data
    const testData = {
      courseId: 'test-course-123',
      fileName: 'test-video.mp4',
      fileSize: 1024000, // 1MB
      mimeType: 'video/mp4',
      version: 1
    };
    
    // Mock admin token (you'll need to replace this with a real token)
    const mockToken = 'test-token';
    
    const response = await fetch('http://localhost:5000/api/videos/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Presigned URL endpoint working!');
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      // Check if expiresIn is 7200 (2 hours)
      if (data.data?.expiresIn === 7200) {
        console.log('✅ Expiry time correctly set to 2 hours');
      } else {
        console.log(`❌ Expiry time is ${data.data?.expiresIn}, expected 7200`);
      }
    } else {
      const errorData = await response.json();
      console.log('❌ Presigned URL endpoint failed:');
      console.log('Error:', errorData);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testBackendHealth() {
  try {
    console.log('🧪 Testing backend health...');
    
    const response = await fetch('http://localhost:5000/api/health');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy!');
      console.log('Health data:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Backend health check failed');
    }
  } catch (error) {
    console.error('❌ Backend health test failed:', error.message);
  }
}

async function testFrontendHealth() {
  try {
    console.log('🧪 Testing frontend health...');
    
    const response = await fetch('http://localhost:5173');
    
    if (response.ok) {
      console.log('✅ Frontend is running!');
      console.log(`Status: ${response.status}`);
    } else {
      console.log('❌ Frontend health check failed');
    }
  } catch (error) {
    console.error('❌ Frontend health test failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting upload system tests...\n');
  
  await testBackendHealth();
  await testFrontendHealth();
  await testPresignedUrlEndpoint();
  
  console.log('\n✨ Tests completed!');
  console.log('\n📝 Summary of fixes implemented:');
  console.log('1. ✅ Increased presigned URL expiry from 1 hour to 2 hours');
  console.log('2. ✅ Added retry logic with exponential backoff');
  console.log('3. ✅ Added URL refresh mechanism for expired URLs');
  console.log('4. ✅ Improved error handling for upload failures');
  console.log('5. ✅ Increased upload timeout from 30 to 45 minutes');
  console.log('\n🔧 To test with real uploads:');
  console.log('- Navigate to http://localhost:5173/admin/upload');
  console.log('- Try uploading multiple videos (2-3 videos)');
  console.log('- Monitor browser console for retry messages');
  console.log('- Check that all videos upload successfully');
}

runTests();
