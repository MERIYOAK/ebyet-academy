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

const updateCourses = async () => {
  try {
    console.log('🔄 Starting course update migration...');
    
    // Get all courses that don't have category or level
    const coursesToUpdate = await Course.find({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' },
        { level: { $exists: false } },
        { level: null },
        { level: '' }
      ]
    });
    
    console.log(`📊 Found ${coursesToUpdate.length} courses to update`);
    
    if (coursesToUpdate.length === 0) {
      console.log('✅ All courses already have category and level fields');
      return;
    }
    
    // Default values for existing courses
    const defaultCategory = 'youtube';
    const defaultLevel = 'beginner';
    
    // Update each course
    for (const course of coursesToUpdate) {
      console.log(`🔄 Updating course: ${course.title}`);
      
      // Update main course
      course.category = defaultCategory;
      course.level = defaultLevel;
      await course.save();
      
      // Update course version if it exists
      const courseVersion = await CourseVersion.findOne({ 
        courseId: course._id, 
        versionNumber: course.currentVersion 
      });
      
      if (courseVersion) {
        courseVersion.category = defaultCategory;
        courseVersion.level = defaultLevel;
        await courseVersion.save();
        console.log(`   ✅ Updated course version v${courseVersion.versionNumber}`);
      }
      
      console.log(`   ✅ Updated course: ${course.title}`);
    }
    
    console.log('🎉 Course update migration completed successfully!');
    console.log(`📊 Updated ${coursesToUpdate.length} courses with default category: "${defaultCategory}" and level: "${defaultLevel}"`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the migration
updateCourses(); 