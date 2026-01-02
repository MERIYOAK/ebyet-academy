const mongoose = require('mongoose');

const courseVersionSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  versionNumber: { type: Number, required: true },
  
  // Content for this version - Bilingual support
  title: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v) {
        // Allow string (legacy) or object with en and tg
        if (typeof v === 'string') return true;
        if (typeof v === 'object' && v !== null && v.en && v.tg) return true;
        return false;
      },
      message: 'Title must be a string or object with en and tg properties'
    }
  },
  description: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v) {
        // Allow string (legacy) or object with en and tg
        if (typeof v === 'string') return true;
        if (typeof v === 'object' && v !== null && v.en && v.tg) return true;
        return false;
      },
      message: 'Description must be a string or object with en and tg properties'
    }
  },
  price: { type: Number, required: true },
  thumbnailURL: { type: String },
  thumbnailS3Key: { type: String }, // Store S3 key for generating fresh signed URLs
  category: { 
    type: String, 
    enum: ['crypto', 'investing', 'trading', 'stock-market', 'etf', 'option-trading', 'other'],
    required: true 
  },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true 
  },
  
  // Videos for this version
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  
  // Materials for this version
  materials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }],
  
  // S3 organization
  s3FolderPath: { type: String, required: true }, // e.g., "courses/course-name/v1"
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'archived'], 
    default: 'active' 
  },
  
  // Admin tracking
  createdBy: { type: String, required: true },
  changeLog: { type: String }, // What changed in this version
  
  // Archive info
  archivedAt: { type: Date },
  archiveS3Path: { type: String }, // Where archived content is moved
  archiveReason: { type: String },
  
  // Version metadata
  totalVideos: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // in seconds
  fileSize: { type: Number, default: 0 }, // total size in bytes
  
  // Version settings
  isPublic: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: false },
  
}, { timestamps: true });

// Compound index for course and version
courseVersionSchema.index({ courseId: 1, versionNumber: 1 }, { unique: true });
courseVersionSchema.index({ status: 1 });
courseVersionSchema.index({ archivedAt: 1 });

// Virtual for checking if version is accessible
courseVersionSchema.virtual('isAccessible').get(function() {
  return this.status === 'active' && this.isPublic;
});

// Virtual for getting S3 paths
courseVersionSchema.virtual('s3VideoPath').get(function() {
  return `${this.s3FolderPath}/videos`;
});

courseVersionSchema.virtual('s3ThumbnailPath').get(function() {
  return `${this.s3FolderPath}/thumbnails`;
});

// Static method to get latest active version of a course
courseVersionSchema.statics.getLatestVersion = function(courseId) {
  return this.findOne({ 
    courseId, 
    status: 'active' 
  }).sort({ versionNumber: -1 });
};

// Static method to get all versions of a course
courseVersionSchema.statics.getCourseVersions = function(courseId) {
  return this.find({ courseId }).sort({ versionNumber: -1 });
};

// Static method to get active versions
courseVersionSchema.statics.getActiveVersions = function(courseId) {
  return this.find({ 
    courseId, 
    status: 'active' 
  }).sort({ versionNumber: -1 });
};

// Static method to get archived versions past grace period
courseVersionSchema.statics.getArchivedPastGracePeriod = function() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return this.find({
    status: 'archived',
    archivedAt: { $lt: sixMonthsAgo }
  });
};

// Instance method to archive this version
courseVersionSchema.methods.archive = function(reason = 'Admin request') {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archiveReason = reason;
  this.archiveS3Path = `archived-courses/${this.s3FolderPath}`;
  return this.save();
};

// Instance method to unarchive this version
courseVersionSchema.methods.unarchive = function() {
  this.status = 'active';
  this.archivedAt = null;
  this.archiveReason = null;
  this.archiveS3Path = null;
  return this.save();
};

// Instance method to update version statistics
courseVersionSchema.methods.updateStatistics = async function() {
  const Video = mongoose.model('Video');
  
  // Get videos for this version - exclude deleted videos
  const videos = await Video.find({ 
    courseId: this.courseId.toString(), 
    courseVersion: this.versionNumber,
    status: { $ne: 'deleted' }
  });
  
  console.log(`📊 [updateStatistics] Version ${this.versionNumber}: Found ${videos.length} videos`);
  
  this.totalVideos = videos.length;
  
  // Calculate total duration safely
  this.totalDuration = videos.reduce((total, video) => {
    let durationInSeconds = 0;
    
    if (video.duration) {
      // Handle different duration formats
      if (typeof video.duration === 'number') {
        // Duration is already in seconds
        durationInSeconds = video.duration;
      } else if (typeof video.duration === 'string') {
        // Parse string format like "5:30" or "1:23:45"
        const parts = video.duration.split(':').map(Number);
        if (parts.length === 2) {
          // Format: "minutes:seconds"
          durationInSeconds = (parts[0] * 60) + parts[1];
        } else if (parts.length === 3) {
          // Format: "hours:minutes:seconds"
          durationInSeconds = (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        }
      }
    }
    
    // Ensure we have a valid number
    if (isNaN(durationInSeconds)) {
      durationInSeconds = 0;
    }
    
    return total + durationInSeconds;
  }, 0);
  
  // Calculate total file size safely
  this.fileSize = videos.reduce((total, video) => {
    const fileSize = video.fileSize || 0;
    return total + (isNaN(fileSize) ? 0 : fileSize);
  }, 0);
  
  console.log(`📊 [updateStatistics] Version ${this.versionNumber} stats: ${this.totalVideos} videos, ${this.totalDuration}s duration, ${this.fileSize} bytes`);
  
  return this.save();
};

// Instance method to get S3 folder path
courseVersionSchema.methods.getS3FolderPath = function() {
  return this.s3FolderPath;
};

// Instance method to get archive S3 path
courseVersionSchema.methods.getArchiveS3Path = function() {
  return this.archiveS3Path || `archived-courses/${this.s3FolderPath}`;
};

module.exports = mongoose.model('CourseVersion', courseVersionSchema); 