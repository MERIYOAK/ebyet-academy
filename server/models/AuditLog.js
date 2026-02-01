const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Action type
  action: {
    type: String,
    required: true,
    enum: ['course_deleted', 'course_created', 'course_updated', 'course_deactivated', 'course_reactivated', 'course_archived', 'course_access_granted', 'course_access_revoked']
  },
  
  // Entity information
  entityType: {
    type: String,
    required: true,
    enum: ['course', 'bundle', 'user', 'payment']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityTitle: {
    type: String,
    required: true
  },
  
  // User who performed the action
  performedBy: {
    type: String,
    required: true // Admin email
  },
  performedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional details
  details: {
    type: mongoose.Schema.Types.Mixed, // Can store any additional data
    default: {}
  },
  
  // Deletion summary (for course deletions)
  deletionSummary: {
    videosDeleted: { type: Number, default: 0 },
    materialsDeleted: { type: Number, default: 0 },
    certificatesDeleted: { type: Number, default: 0 },
    versionsDeleted: { type: Number, default: 0 },
    progressRecordsDeleted: { type: Number, default: 0 },
    usersAffected: { type: Number, default: 0 },
    bundlesAffected: { type: Number, default: 0 },
    s3FilesDeleted: { type: Number, default: 0 }
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // IP address (if available)
  ipAddress: {
    type: String
  },
  
  // User agent (if available)
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(actionData) {
  const {
    action,
    entityType,
    entityId,
    entityTitle,
    performedBy,
    performedById,
    details = {},
    deletionSummary = {},
    ipAddress,
    userAgent
  } = actionData;
  
  const logEntry = new this({
    action,
    entityType,
    entityId,
    entityTitle,
    performedBy,
    performedById,
    details,
    deletionSummary,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
  
  return await logEntry.save();
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

