import fetch from 'node-fetch';

async function testVideoPerformance() {
  console.log('🔍 Testing Video Loading Performance...\n');

  try {
    const courseId = '689bb063b8d2219cd7e4e2d3';
    const userId = '689cad6851cca53fb047a103';
    
    console.log(`📋 Testing video performance for:`);
    console.log(`   - Course ID: ${courseId}`);
    console.log(`   - User ID: ${userId}`);

    // Step 1: Create a JWT token
    console.log('\n1️⃣ Creating JWT token...');
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { userId: userId },
      'your_jwt_secret',
      { expiresIn: '1h' }
    );
    console.log('✅ JWT token created');

    // Step 2: Test course progress with video URLs
    console.log('\n2️⃣ Testing course progress with video URLs...');
    const startTime = Date.now();
    
    const courseProgressResponse = await fetch(`http://localhost:5000/api/progress/course/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (courseProgressResponse.ok) {
      const courseProgressData = await courseProgressResponse.json();
      console.log('✅ Course progress with video URLs retrieved:');
      console.log(`   - Response time: ${responseTime}ms`);
      console.log(`   - Course: "${courseProgressData.data.course.title}"`);
      console.log(`   - Total videos: ${courseProgressData.data.overallProgress.totalVideos}`);
      console.log(`   - Videos with URLs: ${courseProgressData.data.videos.filter(v => v.videoUrl).length}`);
      
      if (courseProgressData.data.videos.length > 0) {
        const firstVideo = courseProgressData.data.videos[0];
        console.log(`\n📹 First video details:`);
        console.log(`   - Title: "${firstVideo.title}"`);
        console.log(`   - Has URL: ${!!firstVideo.videoUrl}`);
        console.log(`   - URL length: ${firstVideo.videoUrl ? firstVideo.videoUrl.length : 0} characters`);
        console.log(`   - Progress: ${firstVideo.progress.completionPercentage}%`);
      }

      // Check cache headers
      const cacheControl = courseProgressResponse.headers.get('cache-control');
      const etag = courseProgressResponse.headers.get('etag');
      console.log(`\n📋 Response headers:`);
      console.log(`   - Cache-Control: ${cacheControl}`);
      console.log(`   - ETag: ${etag}`);
    } else {
      console.log('❌ Failed to get course progress:', courseProgressResponse.status);
      const errorText = await courseProgressResponse.text();
      console.log('   Error details:', errorText);
    }

    // Step 3: Test second request (should be faster due to caching)
    console.log('\n3️⃣ Testing second request (caching)...');
    const startTime2 = Date.now();
    
    const courseProgressResponse2 = await fetch(`http://localhost:5000/api/progress/course/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'If-None-Match': courseProgressResponse.headers.get('etag') || ''
      }
    });

    const endTime2 = Date.now();
    const responseTime2 = endTime2 - startTime2;

    console.log(`✅ Second request completed:`);
    console.log(`   - Response time: ${responseTime2}ms`);
    console.log(`   - Performance improvement: ${responseTime - responseTime2}ms faster`);
    console.log(`   - Status: ${courseProgressResponse2.status}`);

    console.log('\n🎉 Video performance test completed!');

  } catch (error) {
    console.error('❌ Error in video performance test:', error);
  }
}

testVideoPerformance(); 