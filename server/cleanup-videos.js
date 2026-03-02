/**
 * Script to clean up duplicate and orphaned videos
 * This will remove duplicates and orphaned videos to get accurate counts
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing';

async function cleanupVideos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    const Video = require('./models/Video');

    console.log('\n🧹 Starting video cleanup...\n');

    // Step 1: Get statistics before cleanup
    const beforeStats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          videosWithCourse: { $sum: { $cond: [{ $ne: ['$course', null] }, 1, 0] } },
          orphanedVideos: { $sum: { $cond: [{ $eq: ['$course', null] }, 1, 0] } }
        }
      }
    ]);

    console.log('📊 Before cleanup:');
    console.log(`   Total videos: ${beforeStats[0]?.totalVideos || 0}`);
    console.log(`   Videos with course: ${beforeStats[0]?.videosWithCourse || 0}`);
    console.log(`   Orphaned videos: ${beforeStats[0]?.orphanedVideos || 0}`);

    // Step 2: Find and remove orphaned videos (videos without course)
    console.log('\n🗑️ Removing orphaned videos...');
    const orphanedResult = await Video.deleteMany({
      $or: [
        { course: null },
        { course: { $exists: false } }
      ]
    });
    console.log(`   Deleted ${orphanedResult.deletedCount} orphaned videos`);

    // Step 3: Remove duplicates by s3Key (keep the first one)
    console.log('\n🔄 Removing duplicate videos by S3 key...');
    
    // Find duplicates
    const duplicates = await Video.aggregate([
      {
        $group: {
          _id: '$s3Key',
          count: { $sum: 1 },
          docs: { $push: { _id: '$_id', createdAt: '$createdAt' } }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    let totalDuplicatesDeleted = 0;

    for (const duplicate of duplicates) {
      // Sort by creation date and keep the oldest one
      duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Keep the first (oldest) video, delete the rest
      const toDelete = duplicate.docs.slice(1);
      const idsToDelete = toDelete.map(doc => doc._id);
      
      if (idsToDelete.length > 0) {
        const deleteResult = await Video.deleteMany({ _id: { $in: idsToDelete } });
        totalDuplicatesDeleted += deleteResult.deletedCount;
        console.log(`   Deleted ${deleteResult.deletedCount} duplicates for S3 key: ${duplicate._id}`);
      }
    }

    console.log(`   Total duplicates deleted: ${totalDuplicatesDeleted}`);

    // Step 4: Get statistics after cleanup
    const afterStats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          videosWithCourse: { $sum: { $cond: [{ $ne: ['$course', null] }, 1, 0] } },
          orphanedVideos: { $sum: { $cond: [{ $eq: ['$course', null] }, 1, 0] } }
        }
      }
    ]);

    console.log('\n📊 After cleanup:');
    console.log(`   Total videos: ${afterStats[0]?.totalVideos || 0}`);
    console.log(`   Videos with course: ${afterStats[0]?.videosWithCourse || 0}`);
    console.log(`   Orphaned videos: ${afterStats[0]?.orphanedVideos || 0}`);

    console.log('\n✅ Cleanup completed!');
    console.log(`📈 Total videos removed: ${orphanedResult.deletedCount + totalDuplicatesDeleted}`);
    console.log(`🎯 Final video count: ${afterStats[0]?.totalVideos || 0}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Ask for confirmation before running
console.log('⚠️  WARNING: This will permanently delete duplicate and orphaned videos!');
console.log('📋 This action cannot be undone. Make sure you have a backup!');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Do you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    cleanupVideos();
  } else {
    console.log('❌ Cleanup cancelled.');
  }
  rl.close();
});
