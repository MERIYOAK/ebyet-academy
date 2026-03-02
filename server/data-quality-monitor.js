/**
 * Data Quality Monitor Script
 * Checks for orphaned documents and data quality issues
 * Can be run periodically to ensure data integrity
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing';

async function checkDataQuality() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔍 Connected to MongoDB - Running Data Quality Check...\n');

    const Video = require('./models/Video');
    const Course = require('./models/Course');
    const User = require('./models/User');
    const Bundle = require('./models/Bundle');
    const Review = require('./models/Review');
    const Announcement = require('./models/Announcement');

    const issues = [];

    // Check for orphaned videos
    const orphanedVideos = await Video.countDocuments({
      $or: [
        { course: null },
        { course: { $exists: false } }
      ]
    });

    if (orphanedVideos > 0) {
      issues.push({
        type: 'orphaned_videos',
        count: orphanedVideos,
        severity: 'high',
        message: `${orphanedVideos} videos without course assignment`
      });
    }

    // Check for videos without S3 keys
    const videosWithoutS3 = await Video.countDocuments({
      $or: [
        { s3Key: null },
        { s3Key: { $exists: false } },
        { s3Key: '' }
      ]
    });

    if (videosWithoutS3 > 0) {
      issues.push({
        type: 'videos_without_s3',
        count: videosWithoutS3,
        severity: 'high',
        message: `${videosWithoutS3} videos without S3 keys`
      });
    }

    // Check for duplicate videos by S3 key
    const duplicateVideos = await Video.aggregate([
      { $group: { _id: '$s3Key', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $group: { _id: null, totalDuplicates: { $sum: '$count' }, duplicateGroups: { $sum: 1 } } }
    ]);

    if (duplicateVideos.length > 0 && duplicateVideos[0].totalDuplicates > 0) {
      issues.push({
        type: 'duplicate_videos',
        count: duplicateVideos[0].duplicateGroups,
        severity: 'medium',
        message: `${duplicateVideos[0].duplicateGroups} duplicate video groups found`
      });
    }

    // Check for courses without titles
    const coursesWithoutTitles = await Course.countDocuments({
      $or: [
        { title: null },
        { title: { $exists: false } },
        { title: '' }
      ]
    });

    if (coursesWithoutTitles > 0) {
      issues.push({
        type: 'courses_without_titles',
        count: coursesWithoutTitles,
        severity: 'high',
        message: `${coursesWithoutTitles} courses without titles`
      });
    }

    // Check for users without emails
    const usersWithoutEmails = await User.countDocuments({
      $or: [
        { email: null },
        { email: { $exists: false } },
        { email: '' }
      ]
    });

    if (usersWithoutEmails > 0) {
      issues.push({
        type: 'users_without_emails',
        count: usersWithoutEmails,
        severity: 'high',
        message: `${usersWithoutEmails} users without emails`
      });
    }

    // Check for invalid reviews
    const invalidReviews = await Review.countDocuments({
      $or: [
        { content: null },
        { content: { $exists: false } },
        { content: '' },
        { rating: null },
        { rating: { $exists: false } },
        { rating: { $lt: 1 } },
        { rating: { $gt: 5 } }
      ]
    });

    if (invalidReviews > 0) {
      issues.push({
        type: 'invalid_reviews',
        count: invalidReviews,
        severity: 'medium',
        message: `${invalidReviews} reviews with invalid data`
      });
    }

    // Check for invalid announcements
    const invalidAnnouncements = await Announcement.countDocuments({
      $or: [
        { title: null },
        { title: { $exists: false } },
        { title: '' },
        { content: null },
        { content: { $exists: false } },
        { content: '' }
      ]
    });

    if (invalidAnnouncements > 0) {
      issues.push({
        type: 'invalid_announcements',
        count: invalidAnnouncements,
        severity: 'medium',
        message: `${invalidAnnouncements} announcements with invalid data`
      });
    }

    // Get overall statistics
    const [totalVideos, totalCourses, totalUsers] = await Promise.all([
      Video.countDocuments(),
      Course.countDocuments(),
      User.countDocuments()
    ]);

    console.log('📊 Data Quality Report');
    console.log('=====================');
    console.log(`Total Videos: ${totalVideos}`);
    console.log(`Total Courses: ${totalCourses}`);
    console.log(`Total Users: ${totalUsers}`);
    console.log('');

    if (issues.length === 0) {
      console.log('✅ No data quality issues found!');
      console.log('🎉 All data is clean and properly structured.');
    } else {
      console.log('⚠️ Data Quality Issues Found:');
      console.log('============================');
      
      issues.forEach((issue, index) => {
        const icon = issue.severity === 'high' ? '🔴' : '🟡';
        console.log(`${icon} ${index + 1}. ${issue.message}`);
        console.log(`   Type: ${issue.type}`);
        console.log(`   Count: ${issue.count}`);
        console.log('');
      });

      const highSeverityIssues = issues.filter(i => i.severity === 'high');
      if (highSeverityIssues.length > 0) {
        console.log('🚨 Action Required:');
        console.log(`${highSeverityIssues.length} high-severity issues need immediate attention.`);
        console.log('Run the cleanup script to resolve these issues.');
      }
    }

    // Summary for monitoring
    const summary = {
      timestamp: new Date().toISOString(),
      totalRecords: {
        videos: totalVideos,
        courses: totalCourses,
        users: totalUsers
      },
      issues: issues.map(i => ({
        type: i.type,
        count: i.count,
        severity: i.severity
      })),
      healthScore: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.filter(i => i.severity === 'high').length * 20) - (issues.filter(i => i.severity === 'medium').length * 10))
    };

    console.log('\n📈 Health Score:', summary.healthScore + '/100');
    console.log('🕐 Checked at:', summary.timestamp);

    return summary;

  } catch (error) {
    console.error('❌ Error during data quality check:', error);
    return null;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkDataQuality();
}

module.exports = checkDataQuality;
