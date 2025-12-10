const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const express = require('express');
const router = express.Router();

// Import archive service
const archiveService = require('../services/archiveService');

// Apply admin authentication to all archive routes
router.use(adminAuthMiddleware);

/**
 * Get archive statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await archiveService.getArchiveStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get archive stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get archive statistics',
      error: error.message
    });
  }
});

/**
 * Manually archive a course
 */
router.post('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason } = req.body;
    
    const result = await archiveService.manualArchiveCourse(courseId, reason);
    
    res.json({
      success: true,
      message: 'Course archived successfully',
      data: result
    });
  } catch (error) {
    console.error('Manual archive course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive course',
      error: error.message
    });
  }
});

/**
 * Restore an archived course
 */
router.post('/restore/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const result = await archiveService.restoreArchivedCourse(courseId);
    
    res.json({
      success: true,
      message: 'Course restored successfully',
      data: result
    });
  } catch (error) {
    console.error('Restore course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore course',
      error: error.message
    });
  }
});

/**
 * Trigger automatic archiving of inactive courses
 */
router.post('/auto-archive', async (req, res) => {
  try {
    const archivedCount = await archiveService.archiveInactiveCourses();
    
    res.json({
      success: true,
      message: `Archived ${archivedCount} inactive courses`,
      data: {
        archivedCount
      }
    });
  } catch (error) {
    console.error('Auto archive error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-archive courses',
      error: error.message
    });
  }
});

/**
 * Trigger cleanup of old archived courses
 */
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = await archiveService.cleanupArchivedCourses();
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old archived courses`,
      data: {
        deletedCount
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup archived courses',
      error: error.message
    });
  }
});

module.exports = router; 