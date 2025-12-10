import fetch from 'node-fetch';

const testVideoEndpoint = async () => {
  const courseId = '68a33d9193f48da9eb075cf7';
  const version = '1';
  
  console.log('🧪 Testing Video Endpoint...\n');
  console.log(`📋 Course ID: ${courseId}`);
  console.log(`📋 Version: ${version}`);
  
  try {
    // Test 1: Public access (no auth)
    console.log('\n🔍 Test 1: Public access (no authentication)');
    const publicResponse = await fetch(`http://localhost:5000/api/videos/course/${courseId}/version/${version}`);
    
    console.log(`   Status: ${publicResponse.status}`);
    console.log(`   OK: ${publicResponse.ok}`);
    
    if (publicResponse.ok) {
      const publicData = await publicResponse.json();
      console.log(`   ✅ Success! Found ${publicData.data?.videos?.length || 0} videos`);
      console.log(`   📊 Response:`, JSON.stringify(publicData, null, 2));
    } else {
      const errorText = await publicResponse.text();
      console.log(`   ❌ Error: ${errorText}`);
    }
    
    // Test 2: Check if course exists
    console.log('\n🔍 Test 2: Check if course exists');
    const courseResponse = await fetch(`http://localhost:5000/api/courses/${courseId}`);
    
    console.log(`   Status: ${courseResponse.status}`);
    console.log(`   OK: ${courseResponse.ok}`);
    
    if (courseResponse.ok) {
      const courseData = await courseResponse.json();
      console.log(`   ✅ Course found: ${courseData.data?.course?.title || courseData.title}`);
    } else {
      const errorText = await courseResponse.text();
      console.log(`   ❌ Course not found: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testVideoEndpoint();
