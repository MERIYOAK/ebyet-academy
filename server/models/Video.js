const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  s3Key: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseVersion: { type: Number, required: true, default: 1 },
  duration: { type: Number, default: 0 }, // Duration in seconds
  order: { type: Number },
  
  // File metadata
  fileSize: { type: Number },
  mimeType: { type: String },
  originalName: { type: String },
  
  // Video metadata (from ffmpeg analysis)
  width: { type: Number },
  height: { type: Number },
  fps: { type: Number },
  videoCodec: { type: String },
  audioCodec: { type: String },
  bitrate: { type: String },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'processing', 'error', 'archived'], 
    default: 'active' 
  },
  
    // Admin tracking
  uploadedBy: { type: String, default: 'admin' },

  // Video metadata
  description: { type: String },
  tags: [{ type: String }],
  
  // Free preview system
  isFreePreview: { type: Boolean, default: false },
  
  // Processing info
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: { type: String },
  
  // Archive tracking
  archivedAt: { type: Date },
  archiveS3Key: { type: String },
  
}, { timestamps: true });

// Indexes for performance
videoSchema.index({ courseId: 1, courseVersion: 1 });
videoSchema.index({ courseId: 1, order: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ processingStatus: 1 });
videoSchema.index({ archivedAt: 1 });

// Virtual for public URL
videoSchema.virtual('publicUrl').get(function() {
  if (!this.s3Key) return null;
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${this.s3Key}`;
});

// Virtual for checking if video is accessible
videoSchema.virtual('isAccessible').get(function() {
  return this.status === 'active' && this.processingStatus === 'completed';
});

// Virtual for formatted duration display
videoSchema.virtual('formattedDuration').get(function() {
  if (!this.duration || this.duration === 0) return '0:00';
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = Math.floor(this.duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
});

// Ensure virtuals are included in JSON output
videoSchema.set('toJSON', { virtuals: true });
videoSchema.set('toObject', { virtuals: true });

// Static method to get videos for a specific course version
videoSchema.statics.getByCourseVersion = function(courseId, version) {
  return this.find({ 
    courseId, 
    courseVersion: version,
    status: 'active' 
  }).sort({ order: 1 });
};

// Static method to get active videos for a course
videoSchema.statics.getActiveVideos = function(courseId) {
  return this.find({ 
    courseId, 
    status: 'active',
    processingStatus: 'completed'
  }).sort({ order: 1 });
};

// Instance method to get signed URL for streaming
videoSchema.methods.getSignedUrl = function() {
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    signatureVersion: 'v4',
  });
  
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: this.s3Key,
    Expires: 3600, // 1 hour
  });
};

// Instance method to archive video
videoSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archiveS3Key = `archived-videos/${this.s3Key}`;
  return this.save();
};

// Instance method to update processing status
videoSchema.methods.updateProcessingStatus = function(status, error = null) {
  this.processingStatus = status;
  if (error) {
    this.processingError = error;
  }
  return this.save();
};

module.exports = mongoose.model('Video', videoSchema); 