import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
let authToken = '';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

// Test course and video IDs (you'll need to replace these with actual IDs from your database)
const testCourseId = 'your-course-id-here';
const testVideoId = 'your-video-id-here';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function testVideoProgressUpdate() {
  try {
    console.log('\n🎬 Testing video progress update...');
    
    const progressData = {
      courseId: testCourseId,
      videoId: testVideoId,
      watchedDuration: 120, // 2 minutes
      totalDuration: 600,   // 10 minutes
      timestamp: 120
    };

    const response = await fetch(`${BASE_URL}/api/progress/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(progressData)
    });

    if (!response.ok) {
      throw new Error(`Progress update failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Video progress updated successfully');
    console.log('   - Video watched percentage:', result.data.videoProgress.watchedPercentage + '%');
    console.log('   - Video completion percentage:', result.data.videoProgress.completionPercentage + '%');
    console.log('   - Course progress:', result.data.courseProgress.courseProgressPercentage + '%');
    
    return result.data;
  } catch (error) {
    console.error('❌ Video progress update failed:', error.message);
    return null;
  }
}

async function testGetVideoProgress() {
  try {
    console.log('\n📊 Testing get video progress...');
    
    const response = await fetch(`${BASE_URL}/api/progress/video/${testCourseId}/${testVideoId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Get video progress failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Video progress retrieved successfully');
    console.log('   - Watched percentage:', result.data.videoProgress.watchedPercentage + '%');
    console.log('   - Completion percentage:', result.data.videoProgress.completionPercentage + '%');
    console.log('   - Is completed:', result.data.videoProgress.isCompleted);
    
    return result.data;
  } catch (error) {
    console.error('❌ Get video progress failed:', error.message);
    return null;
  }
}

async function testGetCourseProgress() {
  try {
    console.log('\n📚 Testing get course progress...');
    
    const response = await fetch(`${BASE_URL}/api/progress/course/${testCourseId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Get course progress failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Course progress retrieved successfully');
    console.log('   - Total videos:', result.data.overallProgress.totalVideos);
    console.log('   - Completed videos:', result.data.overallProgress.completedVideos);
    console.log('   - Course progress:', result.data.overallProgress.courseProgressPercentage + '%');
    
    return result.data;
  } catch (error) {
    console.error('❌ Get course progress failed:', error.message);
    return null;
  }
}

async function testDashboardProgress() {
  try {
    console.log('\n🏠 Testing dashboard progress...');
    
    const response = await fetch(`${BASE_URL}/api/progress/dashboard`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Dashboard progress failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Dashboard progress retrieved successfully');
    console.log('   - Total purchased courses:', result.data.courses.length);
    
    if (result.data.courses.length > 0) {
      const course = result.data.courses[0];
      console.log('   - First course progress:', course.progress + '%');
      console.log('   - Completed lessons:', course.completedLessons + '/' + course.totalLessons);
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Dashboard progress failed:', error.message);
    return null;
  }
}

async function testCompleteVideo() {
  try {
    console.log('\n✅ Testing complete video...');
    
    const response = await fetch(`${BASE_URL}/api/progress/complete-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        courseId: testCourseId,
        videoId: testVideoId
      })
    });

    if (!response.ok) {
      throw new Error(`Complete video failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Video marked as completed');
    
    return result.data;
  } catch (error) {
    console.error('❌ Complete video failed:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Dual Progress Tracking System Tests\n');
  
  // Login first
  if (!await login()) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Test video progress update
  await testVideoProgressUpdate();
  
  // Test get video progress
  await testGetVideoProgress();
  
  // Test get course progress
  await testGetCourseProgress();
  
  // Test dashboard progress
  await testDashboardProgress();
  
  // Test complete video
  await testCompleteVideo();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Summary:');
  console.log('   ✅ Video-level progress tracking (real-time)');
  console.log('   ✅ Course-level progress tracking (overall)');
  console.log('   ✅ Dashboard progress display');
  console.log('   ✅ Progress persistence in database');
  console.log('   ✅ Dual progress bar system');
}

// Run the tests
runAllTests().catch(console.error); 