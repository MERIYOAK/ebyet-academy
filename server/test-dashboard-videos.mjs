import fetch from 'node-fetch';

async function testDashboardVideos() {
  console.log('🔍 Testing Dashboard Video Data...\n');

  try {
    const userId = '689cad6851cca53fb047a103';
    
    console.log(`📋 Testing dashboard for user: ${userId}`);

    // Step 1: Create a JWT token
    console.log('\n1️⃣ Creating JWT token...');
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: userId },
      'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('✅ JWT token created');

    // Step 2: Test dashboard progress
    console.log('\n2️⃣ Testing dashboard progress...');
    const dashboardResponse = await fetch('http://localhost:5000/api/progress/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ Dashboard progress retrieved:');
      console.log(`   - Total courses: ${dashboardData.data.totalCourses}`);
      
      if (dashboardData.data.courses.length > 0) {
        const firstCourse = dashboardData.data.courses[0];
        console.log(`\n📋 First course details:`);
        console.log(`   - Title: "${firstCourse.title}"`);
        console.log(`   - ID: ${firstCourse._id}`);
        console.log(`   - Videos array length: ${firstCourse.videos ? firstCourse.videos.length : 0}`);
        console.log(`   - Videos array:`, firstCourse.videos);
        
        if (firstCourse.videos && firstCourse.videos.length > 0) {
          const firstVideo = firstCourse.videos[0];
          console.log(`\n📹 First video details:`);
          console.log(`   - Video object:`, firstVideo);
          console.log(`   - Video ID: ${firstVideo._id || firstVideo.id}`);
          console.log(`   - Video title: ${firstVideo.title}`);
          console.log(`   - Video duration: ${firstVideo.duration}`);
          
          // Test the watch link construction
          const watchLink = `/course/${firstCourse._id}/watch/${firstVideo._id || firstVideo.id}`;
          console.log(`\n🔗 Watch link: ${watchLink}`);
        } else {
          console.log('❌ No videos found in the course');
        }
      }
    } else {
      console.log('❌ Failed to get dashboard progress:', dashboardResponse.status);
      const errorText = await dashboardResponse.text();
      console.log('   Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Error in dashboard video test:', error);
  }
}

testDashboardVideos(); 