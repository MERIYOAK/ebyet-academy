/**
 * Course Migration Script
 * Migrates a course from versioned system to new system
 * 
 * Usage: node migrate-course.js [OLD_COURSE_ID] [OLD_DB_CONNECTION_STRING] [NEW_DB_CONNECTION_STRING]
 */

const mongoose = require('mongoose');

// Configuration
const OLD_COURSE_ID = process.argv[2] || 'YOUR_OLD_COURSE_ID_HERE';
const OLD_DB_CONNECTION = process.argv[3] || 'mongodb://localhost:27017/ibyet-investing';
const NEW_DB_CONNECTION = process.argv[4] || 'mongodb://localhost:27017/ibyet-investing';

// Course mapping function - converts old versioned course to new format
function mapOldCourseToNew(oldCourse) {
  console.log('🔄 Mapping course data...');
  
  const newCourse = {
    // Basic course info
    title: normalizeBilingualField(oldCourse.title, oldCourse.titleTg),
    description: normalizeBilingualField(oldCourse.description, oldCourse.descriptionTg),
    price: oldCourse.price || 0,
    
    // Status and visibility
    status: 'active',
    isPublic: true,
    featured: oldCourse.featured || false,
    
    // Course metadata
    category: mapCategory(oldCourse.category),
    level: mapLevel(oldCourse.level),
    tags: Array.isArray(oldCourse.tags) ? oldCourse.tags : [],
    
    // Media
    thumbnailURL: oldCourse.thumbnailURL || oldCourse.thumbnail,
    thumbnailS3Key: oldCourse.thumbnailS3Key,
    
    // Version info (simplified for new system)
    version: 1,
    currentVersion: 1,
    
    // Enrollment tracking
    totalEnrollments: oldCourse.totalEnrollments || 0,
    enrolledStudents: migrateEnrollments(oldCourse.enrolledStudents, oldCourse.students),
    
    // Admin tracking
    createdBy: oldCourse.createdBy || 'migration',
    lastModifiedBy: 'migration',
    
    // Settings
    requiresApproval: oldCourse.requiresApproval || false,
    maxEnrollments: oldCourse.maxEnrollments,
    whatsappGroupLink: oldCourse.whatsappGroupLink,
    hasWhatsappGroup: oldCourse.hasWhatsappGroup || false,
  };
  
  console.log('✅ Course data mapped successfully');
  return newCourse;
}

// Normalize bilingual fields (handle both string and object formats)
function normalizeBilingualField(english, tigrinya) {
  if (typeof english === 'object' && english.en && english.tg) {
    return english; // Already in correct format
  }
  
  if (typeof english === 'string' && typeof tigrinya === 'string') {
    return {
      en: english,
      tg: tigrinya
    };
  }
  
  if (typeof english === 'string') {
    return {
      en: english,
      tg: english // Fallback to English for Tigrinya
    };
  }
  
  return {
    en: 'Untitled Course',
    tg: 'Untitled Course'
  };
}

// Map old categories to new enum values
function mapCategory(oldCategory) {
  const categoryMap = {
    'programming': 'other',
    'web-development': 'other',
    'crypto': 'crypto',
    'investing': 'investing',
    'trading': 'trading',
    'stock-market': 'stock-market',
    'etf': 'etf',
    'option-trading': 'option-trading',
    'blockchain': 'crypto',
    'javascript': 'other',
    'python': 'other'
  };
  
  return categoryMap[oldCategory?.toLowerCase()] || 'other';
}

// Map old levels to new enum values
function mapLevel(oldLevel) {
  const levelMap = {
    'beginner': 'beginner',
    'intermediate': 'intermediate',
    'advanced': 'advanced',
    'intro': 'beginner',
    'expert': 'advanced'
  };
  
  return levelMap[oldLevel?.toLowerCase()] || 'beginner';
}

// Migrate enrollments (simplified for new system)
function migrateEnrollments(oldEnrollments, oldStudents) {
  if (!Array.isArray(oldEnrollments) && !Array.isArray(oldStudents)) {
    return [];
  }
  
  const enrollments = oldEnrollments || oldStudents || [];
  
  return enrollments.map(enrollment => ({
    userId: enrollment.userId || enrollment._id || enrollment.studentId,
    enrolledAt: enrollment.enrolledAt || enrollment.createdAt || new Date(),
    versionEnrolled: 1, // All enrollments now use version 1
    status: 'active',
    lastAccessedAt: enrollment.lastAccessedAt || new Date(),
    progress: 0, // Reset progress for new system
    completedVideos: [], // Reset completed videos for new system
    accessGrantedBy: enrollment.accessGrantedBy || 'payment',
    grantedAt: enrollment.grantedAt || new Date()
  }));
}

// Main migration function
async function migrateCourse() {
  let oldConnection, newConnection;
  
  try {
    console.log('🚀 Starting course migration...');
    console.log(`   - Old Course ID: ${OLD_COURSE_ID}`);
    console.log(`   - Old DB: ${OLD_DB_CONNECTION}`);
    console.log(`   - New DB: ${NEW_DB_CONNECTION}`);
    
    // Connect to old database
    console.log('📡 Connecting to old database...');
    oldConnection = await mongoose.createConnection(OLD_DB_CONNECTION);
    const OldCourse = oldConnection.model('Course', new mongoose.Schema({}, { strict: false }));
    const OldVideo = oldConnection.model('Video', new mongoose.Schema({}, { strict: false }));
    
    // Connect to new database
    console.log('📡 Connecting to new database...');
    newConnection = await mongoose.createConnection(NEW_DB_CONNECTION);
    const NewCourse = require('./server/models/Course');
    const NewVideo = require('./server/models/Video');
    
    // Find old course
    console.log('🔍 Finding old course...');
    const oldCourse = await OldCourse.findById(OLD_COURSE_ID).populate('videos');
    
    if (!oldCourse) {
      throw new Error(`Course with ID ${OLD_COURSE_ID} not found in old database`);
    }
    
    console.log('✅ Found old course:', oldCourse.title || oldCourse.title?.en);
    
    // Map course data
    const newCourseData = mapOldCourseToNew(oldCourse);
    
    // Migrate videos first
    console.log('🎥 Migrating videos...');
    const migratedVideos = [];
    
    if (oldCourse.videos && Array.isArray(oldCourse.videos)) {
      for (const oldVideo of oldCourse.videos) {
        const videoData = {
          title: normalizeBilingualField(oldVideo.title, oldVideo.titleTg),
          description: normalizeBilingualField(oldVideo.description, oldVideo.descriptionTg),
          s3Key: oldVideo.s3Key || oldVideo.videoUrl,
          order: oldVideo.order || oldVideo.sequence || migratedVideos.length + 1,
          duration: oldVideo.duration || '0:00',
          fileSize: oldVideo.fileSize || 0,
          course: null, // Will be set after course creation
          isPublic: true,
          status: 'active'
        };
        
        const newVideo = await NewVideo.create(videoData);
        migratedVideos.push(newVideo._id);
        console.log(`   ✅ Migrated video: ${oldVideo.title || oldVideo.title?.en}`);
      }
    }
    
    // Set video references in course
    newCourseData.videos = migratedVideos;
    
    // Create new course
    console.log('📚 Creating new course...');
    const newCourse = await NewCourse.create(newCourseData);
    
    // Update video references
    if (migratedVideos.length > 0) {
      await NewVideo.updateMany(
        { _id: { $in: migratedVideos } },
        { course: newCourse._id }
      );
    }
    
    console.log('✅ Course migration completed successfully!');
    console.log(`   - New Course ID: ${newCourse._id}`);
    console.log(`   - Videos migrated: ${migratedVideos.length}`);
    console.log(`   - Enrollments migrated: ${newCourseData.enrolledStudents.length}`);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    const verification = await NewCourse.findById(newCourse._id).populate('videos');
    console.log(`   - Course title: ${verification.title?.en}`);
    console.log(`   - Video count: ${verification.videos.length}`);
    console.log(`   - Enrollment count: ${verification.enrolledStudents.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connections
    if (oldConnection) await oldConnection.close();
    if (newConnection) await newConnection.close();
    console.log('🔌 Database connections closed');
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  console.log('🎯 Course Migration Tool');
  console.log('========================');
  
  if (OLD_COURSE_ID === 'YOUR_OLD_COURSE_ID_HERE') {
    console.log('❌ Please provide the old course ID as first argument');
    console.log('Usage: node migrate-course.js [OLD_COURSE_ID] [OLD_DB_CONNECTION] [NEW_DB_CONNECTION]');
    process.exit(1);
  }
  
  migrateCourse();
}

module.exports = { migrateCourse, mapOldCourseToNew };
