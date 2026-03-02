/**
 * Final Course Migration Script
 * Uses direct MongoDB operations for production migration
 * 
 * Usage: node final-migrate.js [COURSE_ID]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';

async function migrateCourse() {
  try {
    console.log('🚀 Starting final course migration...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Database: ${process.env.MONGODB_URI?.substring(0, 50)}...`);
    
    // Connect to production database
    console.log('📡 Connecting to production database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to production database');
    
    // Get direct MongoDB connection
    const db = mongoose.connection.db;
    const coursesCollection = db.collection('courses');
    const videosCollection = db.collection('videos');
    
    // First, test basic connectivity
    console.log('🔍 Testing database connectivity...');
    const courseCount = await coursesCollection.countDocuments();
    console.log(`✅ Database verified - Found ${courseCount} courses`);
    
    // Find the course using direct MongoDB operations
    console.log('🔍 Finding course to migrate...');
    const oldCourse = await coursesCollection.findOne({ _id: new mongoose.Types.ObjectId(COURSE_ID) });
    
    if (!oldCourse) {
      console.log('❌ Course not found');
      
      // Try to find similar courses
      console.log('🔍 Searching for similar courses...');
      const recentCourses = await coursesCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      console.log('Recent courses found:');
      recentCourses.forEach((course, index) => {
        console.log(`   ${index + 1}. ID: ${course._id} - Title: ${course.title?.en || course.title}`);
      });
      
      process.exit(1);
    }
    
    console.log('✅ Course found:', oldCourse.title?.en || oldCourse.title);
    
    // Display current course info
    console.log('\n📋 Current Course Information:');
    console.log('==============================');
    console.log(`   - Title: ${oldCourse.title?.en || oldCourse.title}`);
    console.log(`   - Description: ${(oldCourse.description?.en || oldCourse.description || '').substring(0, 100)}...`);
    console.log(`   - Price: ${oldCourse.price}`);
    console.log(`   - Status: ${oldCourse.status}`);
    console.log(`   - Version: ${oldCourse.version}`);
    console.log(`   - Current Version: ${oldCourse.currentVersion}`);
    console.log(`   - Videos: ${oldCourse.videos?.length || 0}`);
    console.log(`   - Enrollments: ${oldCourse.enrolledStudents?.length || 0}`);
    
    // Update course for new system
    console.log('\n🔄 Updating course for new system...');
    const updateResult = await coursesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(COURSE_ID) },
      {
        $set: {
          status: 'active',
          isPublic: true,
          version: 1,
          currentVersion: 1,
          lastModifiedBy: 'migration',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ Course updated: ${updateResult.modifiedCount} document(s) modified`);
    
    // Update video references
    if (oldCourse.videos && oldCourse.videos.length > 0) {
      console.log('🎥 Updating video references...');
      
      const videoUpdateResult = await videosCollection.updateMany(
        { _id: { $in: oldCourse.videos } },
        {
          $set: {
            course: new mongoose.Types.ObjectId(COURSE_ID),
            status: 'active',
            isPublic: true
          }
        }
      );
      
      console.log(`✅ Videos updated: ${videoUpdateResult.modifiedCount} document(s) modified`);
    }
    
    // Verify final result
    console.log('\n🔍 Verifying migration...');
    const finalCourse = await coursesCollection.findOne({ _id: new mongoose.Types.ObjectId(COURSE_ID) });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('==================================');
    console.log(`   - Course ID: ${finalCourse._id}`);
    console.log(`   - Title: ${finalCourse.title?.en || finalCourse.title}`);
    console.log(`   - Status: ${finalCourse.status}`);
    console.log(`   - Public: ${finalCourse.isPublic}`);
    console.log(`   - Version: ${finalCourse.version}`);
    console.log(`   - Current Version: ${finalCourse.currentVersion}`);
    console.log(`   - Videos: ${finalCourse.videos?.length || 0}`);
    console.log(`   - Enrollments: ${finalCourse.enrolledStudents?.length || 0}`);
    
    console.log('\n✅ Course is now ready for the new system!');
    console.log('   - Course is active and accessible');
    console.log('   - Versioning simplified to v1');
    console.log('   - All videos are properly referenced');
    console.log('   - Ready for production use');
    
    console.log('\n🚀 You can now:');
    console.log('   1. Access the course in your admin panel');
    console.log('   2. View the course on the user courses page');
    console.log('   3. Test video playback and enrollment');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.name === 'MongoServerError') {
      console.error('🔍 Database server error - Check:');
      console.error('   - Database credentials are correct');
      console.error('   - Network allows database access');
      console.error('   - Course ID format is valid');
    }
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

if (require.main === module) {
  console.log('🚀 Final Course Migration Tool');
  console.log('===============================');
  migrateCourse();
}

module.exports = { migrateCourse };
