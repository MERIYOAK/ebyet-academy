/**
 * Simple Course Check Script
 * Uses existing server connection to check course structure
 * 
 * Usage: node check-course.js [COURSE_ID]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';

async function checkCourse() {
  try {
    console.log('🔍 Checking course with existing connection...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    
    // Use same connection as server
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing');
    console.log('✅ Connected to database');
    
    // Use existing Course model
    const Course = require('./server/models/Course');
    
    // Find course
    console.log('🔍 Finding course...');
    const course = await Course.findById(COURSE_ID).populate('videos');
    
    if (!course) {
      console.log('❌ Course not found');
      process.exit(1);
    }
    
    console.log('✅ Course found!');
    console.log('\n📋 Course Information:');
    console.log('===================');
    
    // Basic info
    console.log(`Title:`, course.title);
    console.log(`Description:`, course.description?.substring(0, 100) + '...');
    console.log(`Price:`, course.price);
    console.log(`Category:`, course.category);
    console.log(`Level:`, course.level);
    console.log(`Status:`, course.status);
    console.log(`Version:`, course.version);
    console.log(`Current Version:`, course.currentVersion);
    
    // Media
    console.log(`\n🎥 Media:`);
    console.log(`Thumbnail URL:`, course.thumbnailURL);
    console.log(`Video Count:`, course.videos?.length || 0);
    
    // Videos
    if (course.videos && course.videos.length > 0) {
      console.log(`\n🎬 First Video Details:`);
      const video = course.videos[0];
      console.log(`   Title:`, video.title);
      console.log(`   S3 Key:`, video.s3Key);
      console.log(`   Duration:`, video.duration);
      console.log(`   Order:`, video.order);
    }
    
    // Enrollments
    console.log(`\n👥 Enrollments:`);
    console.log(`Total Enrollments:`, course.totalEnrollments);
    console.log(`Enrolled Students:`, course.enrolledStudents?.length || 0);
    
    // All fields
    console.log(`\n🔧 All Fields:`, Object.keys(course.toObject()));
    
    console.log('\n✅ Course check completed!');
    console.log('\n💡 Ready for migration!');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

if (require.main === module) {
  console.log('🔍 Course Check Tool');
  console.log('====================');
  checkCourse();
}

module.exports = { checkCourse };
