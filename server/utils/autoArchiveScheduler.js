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
      return;
    }
    
    
    // Find courses that are inactive and were deactivated 6+ months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const coursesToArchive = await Course.find({
      status: 'inactive',
      deactivatedAt: { $exists: true, $lte: sixMonthsAgo }
    });
    
    if (coursesToArchive.length === 0) {
      return;
    }
    
    
    let archivedCount = 0;
    for (const course of coursesToArchive) {
      try {
        await course.archive('Auto-archived after 6 months of deactivation');
        archivedCount++;
      } catch (error) {
        console.error(`âŒ [autoArchive] Failed to archive course ${course._id}:`, error.message);
      }
    }
    
    
  } catch (error) {
    console.error('âŒ [autoArchive] Error in archive check:', error);
  }
}

/**
 * Start the auto-archive scheduler
 * Runs daily at 2 AM
 */
function startAutoArchiveScheduler() {
  
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
  
}

module.exports = {
  archiveDeactivatedCourses,
  startAutoArchiveScheduler
};
