/**
 * Course Inspection Script
 * Inspects a course from your old versioned system to understand its structure
 * 
 * Usage: node inspect-old-course.js [OLD_COURSE_ID] [OLD_DB_CONNECTION]
 */

const mongoose = require('mongoose');

const OLD_COURSE_ID = process.argv[2] || 'YOUR_OLD_COURSE_ID_HERE';
const OLD_DB_CONNECTION = process.argv[3] || 'mongodb://localhost:27017/ibyet-investing';

async function inspectCourse() {
  let connection;
  
  try {
    console.log('🔍 Inspecting old course structure...');
    console.log(`   - Course ID: ${OLD_COURSE_ID}`);
    console.log(`   - Database: ${OLD_DB_CONNECTION}`);
    
    // Connect to old database
    console.log('📡 Connecting to database...');
    connection = await mongoose.createConnection(OLD_DB_CONNECTION);
    
    console.log('✅ Connected to database successfully');
    
    // Create flexible schema to handle any structure
    const courseSchema = new mongoose.Schema({}, { strict: false });
    const videoSchema = new mongoose.Schema({}, { strict: false });
    const OldCourse = connection.model('Course', courseSchema);
    const OldVideo = connection.model('Video', videoSchema);
    
    // Find course
    console.log('🔍 Finding course...');
    const course = await OldCourse.findById(OLD_COURSE_ID).populate('videos');
    
    if (!course) {
      throw new Error(`Course with ID ${OLD_COURSE_ID} not found`);
    }
    
    console.log('\n📋 Course Structure Analysis:');
    console.log('============================');
    
    // Basic info
    console.log('\n📝 Basic Information:');
    console.log(`   Title:`, course.title);
    console.log(`   Description:`, course.description?.substring(0, 100) + '...');
    console.log(`   Price:`, course.price);
    console.log(`   Category:`, course.category);
    console.log(`   Level:`, course.level);
    console.log(`   Status:`, course.status);
    
    // Versioning info
    console.log('\n🔄 Versioning Information:');
    console.log(`   Version:`, course.version);
    console.log(`   Current Version:`, course.currentVersion);
    console.log(`   Created At:`, course.createdAt);
    console.log(`   Updated At:`, course.updatedAt);
    
    // Media
    console.log('\n🎥 Media Information:');
    console.log(`   Thumbnail URL:`, course.thumbnailURL || course.thumbnail);
    console.log(`   Thumbnail S3 Key:`, course.thumbnailS3Key);
    console.log(`   Video Count:`, course.videos?.length || 0);
    
    // Videos
    if (course.videos && course.videos.length > 0) {
      console.log('\n🎬 Video Details:');
      course.videos.forEach((video, index) => {
        console.log(`   Video ${index + 1}:`);
        console.log(`     Title:`, video.title);
        console.log(`     S3 Key:`, video.s3Key || video.videoUrl);
        console.log(`     Duration:`, video.duration);
        console.log(`     Order:`, video.order || video.sequence);
        console.log(`     File Size:`, video.fileSize);
      });
    }
    
    // Enrollments
    console.log('\n👥 Enrollment Information:');
    console.log(`   Total Enrollments:`, course.totalEnrollments);
    console.log(`   Enrolled Students Count:`, course.enrolledStudents?.length || 0);
    console.log(`   Students Count:`, course.students?.length || 0);
    
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      console.log('\n   Sample Enrollment:');
      const sample = course.enrolledStudents[0];
      console.log(`     User ID:`, sample.userId || sample.studentId);
      console.log(`     Enrolled At:`, sample.enrolledAt || sample.createdAt);
      console.log(`     Status:`, sample.status);
      console.log(`     Progress:`, sample.progress);
    }
    
    // All fields
    console.log('\n🔧 All Course Fields:');
    console.log('   Available fields:', Object.keys(course.toObject()));
    
    // Tags and metadata
    console.log('\n🏷️  Tags and Metadata:');
    console.log(`   Tags:`, course.tags);
    console.log(`   Featured:`, course.featured);
    console.log(`   Is Public:`, course.isPublic);
    console.log(`   Created By:`, course.createdBy);
    
    // WhatsApp info
    console.log('\n💬 WhatsApp Information:');
    console.log(`   WhatsApp Group Link:`, course.whatsappGroupLink);
    console.log(`   Has WhatsApp Group:`, course.hasWhatsappGroup);
    
    console.log('\n✅ Course inspection completed!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Review the structure above');
    console.log('   2. Run: node migrate-course.js [OLD_COURSE_ID]');
    console.log('   3. Test the migrated course in the new system');
    
  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) await connection.close();
    process.exit(0);
  }
}

if (require.main === module) {
  console.log('🔍 Old Course Inspection Tool');
  console.log('==============================');
  
  if (OLD_COURSE_ID === 'YOUR_OLD_COURSE_ID_HERE') {
    console.log('❌ Please provide the old course ID as first argument');
    console.log('Usage: node inspect-old-course.js [OLD_COURSE_ID] [OLD_DB_CONNECTION]');
    process.exit(1);
  }
  
  inspectCourse();
}

module.exports = { inspectCourse };
