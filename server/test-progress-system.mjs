import fetch from 'node-fetch';

async function testProgressSystem() {
  console.log('🔍 Testing Progress Tracking System...\n');

  try {
    const courseId = '689bb195b8d2219cd7e4e39a';
    const videoId = '689bb195b8d2219cd7e4e39b'; // You'll need to replace with actual video ID
    const userId = '689cad6851cca53fb047a103';
    
    console.log(`📋 Testing progress system for:`);
    console.log(`   - Course ID: ${courseId}`);
    console.log(`   - Video ID: ${videoId}`);
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
      console.log(`   - Completed courses: ${dashboardData.data.completedCourses}`);
      console.log(`   - Average progress: ${dashboardData.data.totalProgress}%`);
      
      if (dashboardData.data.courses.length > 0) {
        const firstCourse = dashboardData.data.courses[0];
        console.log(`   - First course: "${firstCourse.title}"`);
        console.log(`   - Course progress: ${firstCourse.progress}%`);
        console.log(`   - Is completed: ${firstCourse.isCompleted}`);
      }
    } else {
      console.log('❌ Failed to get dashboard progress:', dashboardResponse.status);
    }

    // Step 3: Test course progress
    console.log('\n3️⃣ Testing course progress...');
    const courseProgressResponse = await fetch(`http://localhost:5000/api/progress/course/${courseId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (courseProgressResponse.ok) {
      const courseProgressData = await courseProgressResponse.json();
      console.log('✅ Course progress retrieved:');
      console.log(`   - Course: "${courseProgressData.data.course.title}"`);
      console.log(`   - Total videos: ${courseProgressData.data.overallProgress.totalVideos}`);
      console.log(`   - Completed videos: ${courseProgressData.data.overallProgress.completedVideos}`);
      console.log(`   - Total progress: ${courseProgressData.data.overallProgress.totalProgress}%`);
      
      if (courseProgressData.data.videos.length > 0) {
        const firstVideo = courseProgressData.data.videos[0];
        console.log(`   - First video: "${firstVideo.title}"`);
        console.log(`   - Video progress: ${firstVideo.progress.completionPercentage}%`);
        console.log(`   - Is completed: ${firstVideo.progress.isCompleted}`);
      }
    } else {
      console.log('❌ Failed to get course progress:', courseProgressResponse.status);
    }

    // Step 4: Test progress update
    console.log('\n4️⃣ Testing progress update...');
    const updateResponse = await fetch('http://localhost:5000/api/progress/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: courseId,
        videoId: videoId,
        watchedDuration: 120, // 2 minutes
        totalDuration: 600,   // 10 minutes
        timestamp: 120
      })
    });

    if (updateResponse.ok) {
      const updateData = await updateResponse.json();
      console.log('✅ Progress updated successfully:');
      console.log(`   - Video completion: ${updateData.data.videoProgress.completionPercentage}%`);
      console.log(`   - Course progress: ${updateData.data.courseProgress.totalProgress}%`);
      console.log(`   - Is completed: ${updateData.data.videoProgress.isCompleted}`);
    } else {
      console.log('❌ Failed to update progress:', updateResponse.status);
      const errorText = await updateResponse.text();
      console.log('   Error details:', errorText);
    }

    // Step 5: Test resume position
    console.log('\n5️⃣ Testing resume position...');
    const resumeResponse = await fetch(`http://localhost:5000/api/progress/resume/${courseId}/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (resumeResponse.ok) {
      const resumeData = await resumeResponse.json();
      console.log('✅ Resume position retrieved:');
      console.log(`   - Resume position: ${resumeData.data.resumePosition}s`);
      console.log(`   - Is completed: ${resumeData.data.isCompleted}`);
      console.log(`   - Completion percentage: ${resumeData.data.completionPercentage}%`);
    } else {
      console.log('❌ Failed to get resume position:', resumeResponse.status);
    }

    // Step 6: Test video completion
    console.log('\n6️⃣ Testing video completion...');
    const completeResponse = await fetch('http://localhost:5000/api/progress/complete-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId: courseId,
        videoId: videoId
      })
    });

    if (completeResponse.ok) {
      const completeData = await completeResponse.json();
      console.log('✅ Video marked as completed:');
      console.log(`   - Is completed: ${completeData.data.videoProgress.isCompleted}`);
      console.log(`   - Completion percentage: ${completeData.data.videoProgress.completionPercentage}%`);
      console.log(`   - Course progress: ${completeData.data.courseProgress.totalProgress}%`);
    } else {
      console.log('❌ Failed to complete video:', completeResponse.status);
    }

    // Step 7: Test next video
    console.log('\n7️⃣ Testing next video...');
    const nextVideoResponse = await fetch(`http://localhost:5000/api/progress/next-video/${courseId}/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (nextVideoResponse.ok) {
      const nextVideoData = await nextVideoResponse.json();
      if (nextVideoData.data.nextVideo) {
        console.log('✅ Next video found:');
        console.log(`   - Next video: "${nextVideoData.data.nextVideo.title}"`);
        console.log(`   - Duration: ${nextVideoData.data.nextVideo.duration}s`);
        console.log(`   - Order: ${nextVideoData.data.nextVideo.order}`);
      } else {
        console.log('✅ No next video (course completed)');
      }
    } else {
      console.log('❌ Failed to get next video:', nextVideoResponse.status);
    }

    console.log('\n🎉 Progress tracking system test completed successfully!');

  } catch (error) {
    console.error('❌ Error in progress system test:', error);
  }
}

testProgressSystem(); 