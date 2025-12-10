const mongoose = require('mongoose');
require('dotenv').config();

// Import the CourseVersion model
const CourseVersion = require('../models/CourseVersion');

// Category mapping from old to new values
const categoryMapping = {
  'youtube mastering': 'youtube',
  'video editing': 'video',
  'camera': 'camera'
};

async function migrateCourseVersionCategories() {
  try {
    console.log('🚀 Starting course version category migration...');
    
    // Use environment variable or default to local MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all course versions
    const courseVersions = await CourseVersion.find({});
    console.log(`📚 Found ${courseVersions.length} course versions to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const courseVersion of courseVersions) {
      const oldCategory = courseVersion.category;
      
      if (categoryMapping[oldCategory]) {
        const newCategory = categoryMapping[oldCategory];
        console.log(`🔄 Migrating course version "${courseVersion.title}" (v${courseVersion.versionNumber}) from "${oldCategory}" to "${newCategory}"`);
        
        courseVersion.category = newCategory;
        await courseVersion.save();
        updatedCount++;
      } else if (['youtube', 'camera', 'photo', 'video', 'computer', 'english', 'other'].includes(oldCategory)) {
        console.log(`⏭️  Course version "${courseVersion.title}" (v${courseVersion.versionNumber}) already has new category "${oldCategory}", skipping`);
        skippedCount++;
      } else {
        console.log(`⚠️  Course version "${courseVersion.title}" (v${courseVersion.versionNumber}) has unknown category "${oldCategory}", setting to "other"`);
        courseVersion.category = 'other';
        await courseVersion.save();
        updatedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Updated: ${updatedCount} course versions`);
    console.log(`⏭️  Skipped: ${skippedCount} course versions`);
    console.log(`📚 Total processed: ${courseVersions.length} course versions`);

    // Verify migration
    const verification = await CourseVersion.aggregate([
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
      console.log(`   ${cat._id}: ${cat.count} course versions`);
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
migrateCourseVersionCategories();
