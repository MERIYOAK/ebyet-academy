/**
 * Script to get all thumbnail S3 keys from the database
 * Run with: node server/scripts/getThumbnailS3Keys.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');

async function getThumbnailS3Keys() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all courses
    const courses = await Course.find({});
    console.log(`📚 Found ${courses.length} courses\n`);

    // Get all course versions
    const courseVersions = await CourseVersion.find({});
    console.log(`📚 Found ${courseVersions.length} course versions\n`);

    console.log('='.repeat(80));
    console.log('COURSE THUMBNAILS:');
    console.log('='.repeat(80));
    
    for (const course of courses) {
      if (course.thumbnailS3Key || course.thumbnailURL) {
        console.log(`\n📸 Course: "${course.title}"`);
        console.log(`   - Course ID: ${course._id}`);
        if (course.thumbnailS3Key) {
          console.log(`   - S3 Key: ${course.thumbnailS3Key}`);
        }
        if (course.thumbnailURL) {
          console.log(`   - URL: ${course.thumbnailURL}`);
          // Extract S3 key from URL if available
          const s3KeyFromUrl = course.thumbnailURL.split('.amazonaws.com/')[1];
          if (s3KeyFromUrl) {
            console.log(`   - S3 Key (from URL): ${s3KeyFromUrl}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('COURSE VERSION THUMBNAILS:');
    console.log('='.repeat(80));
    
    for (const version of courseVersions) {
      if (version.thumbnailS3Key || version.thumbnailURL) {
        const course = await Course.findById(version.courseId);
        console.log(`\n📸 Course: "${course?.title || 'Unknown'}" v${version.versionNumber}`);
        console.log(`   - Version ID: ${version._id}`);
        if (version.thumbnailS3Key) {
          console.log(`   - S3 Key: ${version.thumbnailS3Key}`);
        }
        if (version.thumbnailURL) {
          console.log(`   - URL: ${version.thumbnailURL}`);
          // Extract S3 key from URL if available
          const s3KeyFromUrl = version.thumbnailURL.split('.amazonaws.com/')[1];
          if (s3KeyFromUrl) {
            console.log(`   - S3 Key (from URL): ${s3KeyFromUrl}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Done!');
    console.log('='.repeat(80));
    console.log('\n💡 To test if a thumbnail is accessible, try:');
    console.log('   https://ibyet-investing.s3.YOUR_REGION.amazonaws.com/{S3_KEY_FROM_ABOVE}');
    console.log('\n💡 Replace YOUR_REGION with your AWS region from .env file\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getThumbnailS3Keys();

