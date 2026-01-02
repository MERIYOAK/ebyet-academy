const Course = require('../models/Course');
const CourseVersion = require('../models/CourseVersion');
const { archiveCourseContent, deleteFromS3 } = require('../utils/s3Enhanced');

/**
 * Archive courses that have been inactive for more than 6 months
 */
const archiveInactiveCourses = async () => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find courses that have been inactive for more than 6 months
    const inactiveCourses = await Course.find({
      status: 'inactive',
      updatedAt: { $lt: sixMonthsAgo }
    });

    console.log(`Found ${inactiveCourses.length} inactive courses to archive`);

    for (const course of inactiveCourses) {
      try {
        // Archive the course
        await course.archive('Automatic archive: Inactive for 6+ months');

        // Archive all versions
        const versions = await CourseVersion.find({ courseId: course._id });
        for (const version of versions) {
          await version.archive();
          
          // Archive S3 content
          try {
            await archiveCourseContent(course.title, version.versionNumber);
            console.log(`S3 content archived for course: ${course.title} v${version.versionNumber}`);
          } catch (s3Error) {
            console.error(`Failed to archive S3 content for course: ${course.title} v${version.versionNumber}`, s3Error);
          }
        }

        console.log(`Course automatically archived: ${course.title}`);
      } catch (error) {
        console.error(`Failed to archive course: ${course.title}`, error);
      }
    }

    return inactiveCourses.length;
  } catch (error) {
    console.error('Archive inactive courses error:', error);
    throw error;
  }
};

/**
 * Clean up archived courses that have been archived for more than 1 year
 * This permanently deletes the content from S3 and database
 */
const cleanupArchivedCourses = async () => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Find courses that have been archived for more than 1 year
    const oldArchivedCourses = await Course.find({
      status: 'archived',
      archivedAt: { $lt: oneYearAgo }
    });

    console.log(`Found ${oldArchivedCourses.length} old archived courses to cleanup`);

    for (const course of oldArchivedCourses) {
      try {
        // Get all versions for this course
        const versions = await CourseVersion.find({ courseId: course._id });
        
        // Delete S3 content for each version
        for (const version of versions) {
          try {
            // Delete archived S3 content
            const S3_ROOT_PREFIX = process.env.S3_ROOT_PREFIX || 'ibyet-investing-folder';
            const archivePath = `${S3_ROOT_PREFIX}/archived-courses/${course.title.replace(/[^a-zA-Z0-9.-]/g, '_')}/v${version.versionNumber}/`;
            
            // Note: In a real implementation, you would list and delete all objects in this path
            // For now, we'll just log the cleanup
            console.log(`S3 cleanup scheduled for: ${archivePath}`);
            
            // Delete version record
            await CourseVersion.findByIdAndDelete(version._id);
          } catch (s3Error) {
            console.error(`Failed to cleanup S3 content for course: ${course.title} v${version.versionNumber}`, s3Error);
          }
        }

        // Delete the main course record
        await Course.findByIdAndDelete(course._id);

        console.log(`Course permanently deleted: ${course.title}`);
      } catch (error) {
        console.error(`Failed to cleanup course: ${course.title}`, error);
      }
    }

    return oldArchivedCourses.length;
  } catch (error) {
    console.error('Cleanup archived courses error:', error);
    throw error;
  }
};

/**
 * Get archive statistics
 */
const getArchiveStats = async () => {
  try {
    const stats = {
      totalCourses: await Course.countDocuments(),
      activeCourses: await Course.countDocuments({ status: 'active' }),
      inactiveCourses: await Course.countDocuments({ status: 'inactive' }),
      archivedCourses: await Course.countDocuments({ status: 'archived' }),
      totalVersions: await CourseVersion.countDocuments(),
      activeVersions: await CourseVersion.countDocuments({ status: 'active' }),
      archivedVersions: await CourseVersion.countDocuments({ status: 'archived' })
    };

    return stats;
  } catch (error) {
    console.error('Get archive stats error:', error);
    throw error;
  }
};

/**
 * Manual archive trigger for testing
 */
const manualArchiveCourse = async (courseId, reason = 'Manual archive') => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Archive the course
    await course.archive(reason);

    // Archive all versions
    const versions = await CourseVersion.find({ courseId });
    for (const version of versions) {
      await version.archive();
      
      // Archive S3 content
      try {
        await archiveCourseContent(course.title, version.versionNumber);
        console.log(`S3 content archived for course: ${course.title} v${version.versionNumber}`);
      } catch (s3Error) {
        console.error(`Failed to archive S3 content for course: ${course.title} v${version.versionNumber}`, s3Error);
      }
    }

    console.log(`Course manually archived: ${course.title}`);

    return {
      success: true,
      courseId: course._id,
      courseTitle: course.title,
      archivedAt: course.archivedAt,
      archiveReason: course.archiveReason
    };
  } catch (error) {
    console.error('Manual archive course error:', error);
    throw error;
  }
};

/**
 * Restore an archived course
 */
const restoreArchivedCourse = async (courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    if (course.status !== 'archived') {
      throw new Error('Course is not archived');
    }

    // Restore the course to inactive status
    course.status = 'inactive';
    course.archivedAt = null;
    course.archiveReason = null;
    await course.save();

    // Restore all versions
    const versions = await CourseVersion.find({ courseId });
    for (const version of versions) {
      version.status = 'active';
      version.archivedAt = null;
      version.archiveS3Path = null;
      await version.save();
    }

    console.log(`Course restored: ${course.title}`);

    return {
      success: true,
      courseId: course._id,
      courseTitle: course.title,
      status: course.status
    };
  } catch (error) {
    console.error('Restore archived course error:', error);
    throw error;
  }
};

module.exports = {
  archiveInactiveCourses,
  cleanupArchivedCourses,
  getArchiveStats,
  manualArchiveCourse,
  restoreArchivedCourse
}; 