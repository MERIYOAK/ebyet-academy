/**
 * Debug script to analyze video collection
 * Run this to understand why video count is so high
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing';

async function analyzeVideos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔍 Connected to MongoDB');

    const Video = require('./models/Video');

    // Get total count
    const totalCount = await Video.countDocuments();
    console.log(`\n📊 Total videos in database: ${totalCount}`);

    // Analyze video distribution
    const analysis = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          videosWithS3Key: { $sum: { $cond: [{ $ne: ['$s3Key', null] }, 1, 0] } },
          videosWithLocalPath: { $sum: { $cond: [{ $ne: ['$localPath', null] }, 1, 0] } },
          videosWithUrl: { $sum: { $cond: [{ $ne: ['$url', null] }, 1, 0] } },
          videosWithDuration: { $sum: { $cond: [{ $ne: ['$duration', null] }, 1, 0] } },
          videosWithFileSize: { $sum: { $cond: [{ $ne: ['$fileSize', null] }, 1, 0] } },
          avgDuration: { $avg: '$duration' },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    console.log('\n📈 Video Analysis:');
    console.log(analysis[0]);

    // Check for potential duplicates (same title or s3Key)
    const duplicates = await Video.aggregate([
      {
        $group: {
          _id: '$title',
          count: { $sum: 1 },
          docs: { $push: { _id: '$_id', s3Key: '$s3Key', createdAt: '$createdAt' } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    if (duplicates.length > 0) {
      console.log('\n🔄 Potential Duplicate Titles:');
      duplicates.forEach(dup => {
        console.log(`"${dup._id}": ${dup.count} copies`);
      });
    }

    // Check videos by course
    const videosByCourse = await Video.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    console.log('\n📚 Videos by Course (Top 10):');
    for (const course of videosByCourse) {
      const courseName = course._id ? `Course ${course._id}` : 'No Course';
      console.log(`${courseName}: ${course.count} videos (avg: ${Math.round(course.avgDuration || 0)}s)`);
    }

    // Check recent videos (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentVideos = await Video.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    console.log(`\n🆕 Videos created in last 30 days: ${recentVideos}`);

    // Check for videos without course
    const orphanedVideos = await Video.countDocuments({
      $or: [
        { course: null },
        { course: { $exists: false } }
      ]
    });
    console.log(`\n👻 Videos without course: ${orphanedVideos}`);

    // Sample some video records to see structure
    const sampleVideos = await Video.find()
      .limit(5)
      .select('title s3Key course duration fileSize createdAt')
      .lean();

    console.log('\n🔍 Sample video records:');
    sampleVideos.forEach((video, index) => {
      console.log(`${index + 1}. ${video.title}`);
      console.log(`   Course: ${video.course || 'None'}`);
      console.log(`   S3Key: ${video.s3Key || 'None'}`);
      console.log(`   Duration: ${video.duration || 'None'}`);
      console.log(`   Size: ${video.fileSize || 'None'}`);
      console.log(`   Created: ${video.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error analyzing videos:', error);
  } finally {
    await mongoose.disconnect();
  }
}

analyzeVideos();
