import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');

// Import models
import Course from './models/Course.js';
import Video from './models/Video.js';
import CourseVersion from './models/CourseVersion.js';

const testCourseVideos = async () => {
  const courseId = '68a33d9193f48da9eb075cf7';
  
  console.log('🧪 Testing Course Videos...\n');
  console.log(`📋 Course ID: ${courseId}`);
  
  try {
    // Check if course exists
    console.log('\n🔍 Step 1: Check if course exists');
    const course = await Course.findById(courseId);
    
    if (!course) {
      console.log('❌ Course not found');
      return;
    }
    
    console.log('✅ Course found:');
    console.log(`   Title: ${course.title}`);
    console.log(`   Current Version: ${course.currentVersion}`);
    console.log(`   Videos in course: ${course.videos?.length || 0}`);
    
    // Check course versions
    console.log('\n🔍 Step 2: Check course versions');
    const courseVersions = await CourseVersion.find({ courseId });
    console.log(`   Found ${courseVersions.length} course versions`);
    
    courseVersions.forEach(version => {
      console.log(`   Version ${version.versionNumber}: ${version.videos?.length || 0} videos`);
    });
    
    // Check videos directly
    console.log('\n🔍 Step 3: Check videos directly');
    const videos = await Video.find({ courseId });
    console.log(`   Found ${videos.length} videos for course`);
    
    if (videos.length > 0) {
      videos.forEach(video => {
        console.log(`   - ${video.title} (Version: ${video.courseVersion}, Free Preview: ${video.isFreePreview})`);
      });
    }
    
    // Check videos by version
    console.log('\n🔍 Step 4: Check videos by version 1');
    const videosVersion1 = await Video.find({ 
      courseId: courseId,
      courseVersion: 1 
    });
    console.log(`   Found ${videosVersion1.length} videos for version 1`);
    
    if (videosVersion1.length > 0) {
      videosVersion1.forEach(video => {
        console.log(`   - ${video.title} (Free Preview: ${video.isFreePreview})`);
      });
    }
    
    // Test the static method
    console.log('\n🔍 Step 5: Test Video.getByCourseVersion static method');
    const videosByStatic = await Video.getByCourseVersion(courseId, 1);
    console.log(`   Static method found ${videosByStatic.length} videos`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

// Run the test
testCourseVideos();
