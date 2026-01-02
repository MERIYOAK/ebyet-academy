const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const runMigration = async () => {
  try {
    console.log('🔄 Running course migration...');
    
    // Get all courses
    const allCourses = await Course.find({});
    console.log(`📊 Found ${allCourses.length} courses`);
    
    // Update courses that don't have category or level
    let updatedCount = 0;
    
    for (const course of allCourses) {
      let needsUpdate = false;
      
      // Check if course needs category update
      if (!course.category || course.category === '') {
        course.category = 'youtube';
        needsUpdate = true;
      }
      
      // Check if course needs level update
      if (!course.level || course.level === '') {
        course.level = 'beginner';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log(`🔄 Updating: ${course.title}`);
        console.log(`   - Category: ${course.category}`);
        console.log(`   - Level: ${course.level}`);
        
        await course.save();
        
        // Update course version
        const courseVersion = await CourseVersion.findOne({ 
          courseId: course._id, 
          versionNumber: course.currentVersion 
        });
        
        if (courseVersion) {
          courseVersion.category = course.category;
          courseVersion.level = course.level;
          await courseVersion.save();
        }
        
        updatedCount++;
      }
    }
    
    console.log(`✅ Migration completed! Updated ${updatedCount} courses`);
    
    // Show final status
    const finalCourses = await Course.find({});
    console.log('\n📋 Final course status:');
    finalCourses.forEach(course => {
      console.log(`- ${course.title}: ${course.category} (${course.level})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the migration
runMigration(); 