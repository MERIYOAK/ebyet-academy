const mongoose = require('mongoose');
require('dotenv').config();

// Import the Course model
const Course = require('../models/Course');

// Category mapping from old to new values
const categoryMapping = {
  'youtube mastering': 'youtube',
  'video editing': 'video',
  'camera': 'camera'
};

async function migrateCourseCategories() {
  try {
    console.log('🚀 Starting course category migration...');
    
    // Use environment variable or default to local MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all courses
    const courses = await Course.find({});
    console.log(`📚 Found ${courses.length} courses to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const course of courses) {
      const oldCategory = course.category;
      
      if (categoryMapping[oldCategory]) {
        const newCategory = categoryMapping[oldCategory];
        console.log(`🔄 Migrating course "${course.title}" from "${oldCategory}" to "${newCategory}"`);
        
        course.category = newCategory;
        await course.save();
        updatedCount++;
      } else if (['youtube', 'camera', 'photo', 'video', 'computer', 'english', 'other'].includes(oldCategory)) {
        console.log(`⏭️  Course "${course.title}" already has new category "${oldCategory}", skipping`);
        skippedCount++;
      } else {
        console.log(`⚠️  Course "${course.title}" has unknown category "${oldCategory}", setting to "other"`);
        course.category = 'other';
        await course.save();
        updatedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Updated: ${updatedCount} courses`);
    console.log(`⏭️  Skipped: ${skippedCount} courses`);
    console.log(`📚 Total processed: ${courses.length} courses`);

    // Verify migration
    const verification = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n🔍 Category distribution after migration:');
    verification.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} courses`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
migrateCourseCategories();
