const mongoose = require('mongoose');
const Course = require('./models/Course');
const CourseVersion = require('./models/CourseVersion');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  // Removed deprecated options: useNewUrlParser and useUnifiedTopology
  // These are no longer needed in MongoDB Driver 4.0+
});

async function checkThumbnailURLs() {
  try {
    console.log('🔍 Checking thumbnail URLs in database...\n');

    // Check main courses
    console.log('📚 MAIN COURSES:');
    console.log('================');
    const courses = await Course.find({}).select('title thumbnailURL status createdAt');
    
    if (courses.length === 0) {
      console.log('❌ No courses found in database');
    } else {
      courses.forEach((course, index) => {
        console.log(`${index + 1}. "${course.title}"`);
        console.log(`   - ID: ${course._id}`);
        console.log(`   - Status: ${course.status}`);
        console.log(`   - Created: ${course.createdAt}`);
        console.log(`   - Thumbnail URL: ${course.thumbnailURL || 'NULL'}`);
        
        if (course.thumbnailURL) {
          if (course.thumbnailURL.includes('s3.amazonaws.com')) {
            console.log(`   ✅ Public S3 URL detected`);
          } else if (course.thumbnailURL.includes('persi-academy')) {
            console.log(`   🔧 S3 key detected (needs public URL generation)`);
          } else {
            console.log(`   ❓ Unknown URL format`);
          }
        }
        console.log('');
      });
    }

    // Check course versions
    console.log('📋 COURSE VERSIONS:');
    console.log('===================');
    const courseVersions = await CourseVersion.find({}).select('courseId versionNumber title thumbnailURL status createdAt');
    
    if (courseVersions.length === 0) {
      console.log('❌ No course versions found in database');
    } else {
      courseVersions.forEach((version, index) => {
        console.log(`${index + 1}. Version ${version.versionNumber} of course ${version.courseId}`);
        console.log(`   - Title: "${version.title}"`);
        console.log(`   - Status: ${version.status}`);
        console.log(`   - Created: ${version.createdAt}`);
        console.log(`   - Thumbnail URL: ${version.thumbnailURL || 'NULL'}`);
        
        if (version.thumbnailURL) {
          if (version.thumbnailURL.includes('s3.amazonaws.com')) {
            console.log(`   ✅ Public S3 URL detected`);
          } else if (version.thumbnailURL.includes('persi-academy')) {
            console.log(`   🔧 S3 key detected (needs public URL generation)`);
          } else {
            console.log(`   ❓ Unknown URL format`);
          }
        }
        console.log('');
      });
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`Total courses: ${courses.length}`);
    console.log(`Total course versions: ${courseVersions.length}`);
    
    const coursesWithThumbnails = courses.filter(c => c.thumbnailURL);
    const versionsWithThumbnails = courseVersions.filter(v => v.thumbnailURL);
    
    console.log(`Courses with thumbnails: ${coursesWithThumbnails.length}/${courses.length}`);
    console.log(`Versions with thumbnails: ${versionsWithThumbnails.length}/${courseVersions.length}`);
    
    const publicThumbnails = coursesWithThumbnails.filter(c => c.thumbnailURL.includes('s3.amazonaws.com')).length;
    const publicVersionThumbnails = versionsWithThumbnails.filter(v => v.thumbnailURL.includes('s3.amazonaws.com')).length;
    
    console.log(`Courses with public S3 URLs: ${publicThumbnails}/${coursesWithThumbnails.length}`);
    console.log(`Versions with public S3 URLs: ${publicVersionThumbnails}/${versionsWithThumbnails.length}`);

  } catch (error) {
    console.error('❌ Error checking thumbnail URLs:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the check
checkThumbnailURLs(); 