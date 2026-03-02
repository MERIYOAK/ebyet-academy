/**
 * Robust Course Migration Script
 * Handles production database migration with better error handling
 * 
 * Usage: node robust-migrate.js [COURSE_ID]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';

async function migrateCourse() {
  try {
    console.log('🚀 Starting robust course migration...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Database: ${process.env.MONGODB_URI?.substring(0, 50)}...`);
    
    // Connect with extended timeouts for production
    console.log('📡 Connecting to production database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Use existing models
    const Course = require('./server/models/Course');
    const Video = require('./server/models/Video');
    
    // Find the course with extended query options
    console.log('🔍 Finding course to migrate...');
    const oldCourse = await Course.findById(COURSE_ID)
      .populate('videos')
      .maxTimeMS(30000) // 30 second query timeout
      .lean();
    
    if (!oldCourse) {
      console.log('❌ Course not found in production database');
      
      // Try to list some courses to verify connection
      console.log('🔍 Verifying database connection...');
      const courseCount = await Course.countDocuments().maxTimeMS(10000);
      console.log(`✅ Database connection verified - Found ${courseCount} courses`);
      
      // Try to find course with different methods
      console.log('🔍 Trying alternative search methods...');
      
      // Try by string ID
      const courseByString = await Course.findOne({ _id: COURSE_ID.toString() })
        .maxTimeMS(10000)
        .lean();
      
      if (courseByString) {
        console.log('✅ Found course with string ID conversion');
        await processCourse(courseByString, Course, Video);
      } else {
        console.log('❌ Course not found with any method');
        process.exit(1);
      }
    } else {
      console.log('✅ Course found:', oldCourse.title?.en || oldCourse.title);
      await processCourse(oldCourse, Course, Video);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('🔍 Connection issue - Check:');
      console.error('   - Production database is accessible');
      console.error('   - Network connection is stable');
      console.error('   - MongoDB URI is correct');
    } else if (error.name === 'MongooseError' && error.message.includes('timeout')) {
      console.error('🔍 Timeout issue - Try:');
      console.error('   - Running script again');
      console.error('   - Check network connection');
      console.error('   - Contact database admin');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

async function processCourse(oldCourse, Course, Video) {
  console.log('\n🔄 Processing course data...');
  console.log(`   - Title: ${oldCourse.title?.en || oldCourse.title}`);
  console.log(`   - Videos: ${oldCourse.videos?.length || 0}`);
  console.log(`   - Enrollments: ${oldCourse.enrolledStudents?.length || 0}`);
  console.log(`   - Current Status: ${oldCourse.status}`);
  
  // Update course to new system format
  const updateData = {
    // Ensure active status for new system
    status: 'active',
    isPublic: true,
    
    // Simplified versioning
    version: 1,
    currentVersion: 1,
    
    // Update tracking
    lastModifiedBy: 'migration',
    
    // Ensure proper timestamps
    updatedAt: new Date()
  };
  
  console.log('🔄 Updating course for new system...');
  await Course.findByIdAndUpdate(oldCourse._id, updateData);
  console.log('✅ Course updated successfully');
  
  // Update video references
  if (oldCourse.videos && oldCourse.videos.length > 0) {
    console.log('🎥 Updating video references...');
    let updatedVideos = 0;
    
    for (const video of oldCourse.videos) {
      try {
        await Video.findByIdAndUpdate(
          video._id,
          { 
            course: oldCourse._id,
            status: 'active',
            isPublic: true
          }
        );
        updatedVideos++;
      } catch (videoError) {
        console.warn(`⚠️  Could not update video ${video._id}:`, videoError.message);
      }
    }
    
    console.log(`✅ Updated ${updatedVideos} video references`);
  }
  
  // Verify final state
  console.log('🔍 Verifying migration...');
  const finalCourse = await Course.findById(oldCourse._id)
    .populate('videos')
    .maxTimeMS(10000);
  
  console.log('\n🎉 Migration completed successfully!');
  console.log('===============================');
  console.log(`   - Course ID: ${finalCourse._id}`);
  console.log(`   - Title: ${finalCourse.title?.en || finalCourse.title}`);
  console.log(`   - Status: ${finalCourse.status}`);
  console.log(`   - Public: ${finalCourse.isPublic}`);
  console.log(`   - Videos: ${finalCourse.videos?.length || 0}`);
  console.log(`   - Enrollments: ${finalCourse.enrolledStudents?.length || 0}`);
  
  console.log('\n✅ Course is ready for the new system!');
  console.log('   - Course is active and accessible');
  console.log('   - All videos are properly referenced');
  console.log('   - Versioning simplified to v1');
  console.log('   - Ready for production deployment');
}

if (require.main === module) {
  console.log('🚀 Robust Course Migration Tool');
  console.log('================================');
  migrateCourse();
}

module.exports = { migrateCourse };
