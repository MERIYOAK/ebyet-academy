const mongoose = require('mongoose');
const Course = require('./models/Course');
const CourseVersion = require('./models/CourseVersion');
const { getThumbnailPublicUrl } = require('./utils/s3Enhanced');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  // Removed deprecated options: useNewUrlParser and useUnifiedTopology
  // These are no longer needed in MongoDB Driver 4.0+
});

async function fixThumbnailURLs() {
  try {
    console.log('🔧 Fixing thumbnail URLs in database...\n');

    // Fix main courses
    console.log('📚 FIXING MAIN COURSES:');
    console.log('=======================');
    const courses = await Course.find({ thumbnailURL: { $exists: true, $ne: null } });
    
    let coursesFixed = 0;
    for (const course of courses) {
      console.log(`\n🔍 Processing course: "${course.title}"`);
      console.log(`   - Current thumbnailURL: ${course.thumbnailURL}`);
      
      // Check if it's already a public S3 URL
      if (course.thumbnailURL.includes('s3.amazonaws.com')) {
        console.log(`   ✅ Already a public S3 URL - no fix needed`);
        continue;
      }
      
      // Try to generate public URL
      try {
        const publicUrl = getThumbnailPublicUrl(course.thumbnailURL);
        console.log(`   📝 Generated public URL: ${publicUrl}`);
        
        if (publicUrl && publicUrl !== course.thumbnailURL) {
          course.thumbnailURL = publicUrl;
          await course.save();
          console.log(`   ✅ Fixed thumbnail URL`);
          coursesFixed++;
        } else {
          console.log(`   ⚠️  Could not generate valid public URL`);
        }
      } catch (error) {
        console.log(`   ❌ Error generating public URL: ${error.message}`);
      }
    }

    // Fix course versions
    console.log('\n📋 FIXING COURSE VERSIONS:');
    console.log('==========================');
    const courseVersions = await CourseVersion.find({ thumbnailURL: { $exists: true, $ne: null } });
    
    let versionsFixed = 0;
    for (const version of courseVersions) {
      console.log(`\n🔍 Processing version ${version.versionNumber} of course ${version.courseId}`);
      console.log(`   - Current thumbnailURL: ${version.thumbnailURL}`);
      
      // Check if it's already a public S3 URL
      if (version.thumbnailURL.includes('s3.amazonaws.com')) {
        console.log(`   ✅ Already a public S3 URL - no fix needed`);
        continue;
      }
      
      // Try to generate public URL
      try {
        const publicUrl = getThumbnailPublicUrl(version.thumbnailURL);
        console.log(`   📝 Generated public URL: ${publicUrl}`);
        
        if (publicUrl && publicUrl !== version.thumbnailURL) {
          version.thumbnailURL = publicUrl;
          await version.save();
          console.log(`   ✅ Fixed thumbnail URL`);
          versionsFixed++;
        } else {
          console.log(`   ⚠️  Could not generate valid public URL`);
        }
      } catch (error) {
        console.log(`   ❌ Error generating public URL: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 FIX SUMMARY:');
    console.log('===============');
    console.log(`Courses processed: ${courses.length}`);
    console.log(`Courses fixed: ${coursesFixed}`);
    console.log(`Versions processed: ${courseVersions.length}`);
    console.log(`Versions fixed: ${versionsFixed}`);
    console.log(`Total fixes: ${coursesFixed + versionsFixed}`);

    if (coursesFixed + versionsFixed > 0) {
      console.log('\n✅ Thumbnail URL fixes completed successfully!');
    } else {
      console.log('\nℹ️  No thumbnail URLs needed fixing - all are already in correct format.');
    }

  } catch (error) {
    console.error('❌ Error fixing thumbnail URLs:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
fixThumbnailURLs(); 