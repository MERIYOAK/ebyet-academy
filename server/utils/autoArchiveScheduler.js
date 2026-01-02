/**
 * Auto-archive scheduler for deactivated courses
 * Automatically archives courses that have been deactivated for 6 months
 */

const mongoose = require('mongoose');
const Course = require('../models/Course');

/**
 * Check and archive courses that have been deactivated for 6+ months
 */
async function archiveDeactivatedCourses() {
  try {
    // Check if MongoDB is connected before running queries
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️  [autoArchive] MongoDB not connected, skipping archive check');
      return;
    }
    
    console.log('🔄 [autoArchive] Checking for courses to archive...');
    
    // Find courses that are inactive and were deactivated 6+ months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const coursesToArchive = await Course.find({
      status: 'inactive',
      deactivatedAt: { $exists: true, $lte: sixMonthsAgo }
    });
    
    if (coursesToArchive.length === 0) {
      console.log('✅ [autoArchive] No courses to archive');
      return;
    }
    
    console.log(`📦 [autoArchive] Found ${coursesToArchive.length} course(s) to archive`);
    
    let archivedCount = 0;
    for (const course of coursesToArchive) {
      try {
        await course.archive('Auto-archived after 6 months of deactivation');
        archivedCount++;
        console.log(`✅ [autoArchive] Archived course: ${course.title} (${course._id})`);
      } catch (error) {
        console.error(`❌ [autoArchive] Failed to archive course ${course._id}:`, error.message);
      }
    }
    
    console.log(`✅ [autoArchive] Successfully archived ${archivedCount} of ${coursesToArchive.length} course(s)`);
    
  } catch (error) {
    console.error('❌ [autoArchive] Error in archive check:', error);
  }
}

/**
 * Start the auto-archive scheduler
 * Runs daily at 2 AM
 */
function startAutoArchiveScheduler() {
  console.log('🚀 [autoArchive] Starting auto-archive scheduler...');
  
  // Run immediately on startup
  archiveDeactivatedCourses();
  
  // Then run daily at 2 AM
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  
  const msUntil2AM = tomorrow.getTime() - now.getTime();
  
  // Schedule first run at 2 AM tomorrow
  setTimeout(() => {
    archiveDeactivatedCourses();
    
    // Then run every 24 hours
    setInterval(archiveDeactivatedCourses, 24 * 60 * 60 * 1000);
  }, msUntil2AM);
  
  console.log(`⏰ [autoArchive] Next archive check scheduled for: ${tomorrow.toLocaleString()}`);
}

module.exports = {
  archiveDeactivatedCourses,
  startAutoArchiveScheduler
};

