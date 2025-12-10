const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const updateSpecificCourses = async () => {
  try {
    console.log('🔄 Starting manual course update...');
    
    // Get all courses
    const allCourses = await Course.find({});
    
    console.log(`📊 Found ${allCourses.length} total courses`);
    
    // Display all courses
    console.log('\n📋 Available courses:');
    allCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title}`);
      console.log(`   - Current category: ${course.category || 'NOT SET'}`);
      console.log(`   - Current level: ${course.level || 'NOT SET'}`);
      console.log(`   - ID: ${course._id}`);
      console.log('');
    });
    
    // Manual updates - you can customize these based on your courses
    const courseUpdates = [
      // Example updates - replace with your actual course IDs and desired values
      // {
      //   courseId: 'your-course-id-here',
      //   category: 'youtube',
      //   level: 'beginner'
      // },
      // {
      //   courseId: 'another-course-id',
      //   category: 'video',
      //   level: 'intermediate'
      // }
    ];
    
    if (courseUpdates.length === 0) {
      console.log('⚠️  No manual updates configured. Please edit this script to add course updates.');
      console.log('📝 Example format:');
      console.log('   { courseId: "course-id", category: "youtube", level: "beginner" }');
      return;
    }
    
    // Apply updates
    for (const update of courseUpdates) {
      const course = await Course.findById(update.courseId);
      if (!course) {
        console.log(`❌ Course with ID ${update.courseId} not found`);
        continue;
      }
      
      console.log(`🔄 Updating course: ${course.title}`);
      console.log(`   - Category: ${course.category} → ${update.category}`);
      console.log(`   - Level: ${course.level} → ${update.level}`);
      
      // Update main course
      course.category = update.category;
      course.level = update.level;
      await course.save();
      
      // Update course version
      const courseVersion = await CourseVersion.findOne({ 
        courseId: course._id, 
        versionNumber: course.currentVersion 
      });
      
      if (courseVersion) {
        courseVersion.category = update.category;
        courseVersion.level = update.level;
        await courseVersion.save();
        console.log(`   ✅ Updated course version v${courseVersion.versionNumber}`);
      }
      
      console.log(`   ✅ Successfully updated: ${course.title}`);
    }
    
    console.log('\n🎉 Manual course update completed!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the update
updateSpecificCourses(); 