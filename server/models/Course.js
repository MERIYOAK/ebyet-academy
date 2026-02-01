const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Bilingual support - can be string (legacy) or object {en, tg}
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
  
  // Versioning
  version: { type: Number, default: 1, required: true },
  currentVersion: { type: Number, default: 1, required: true },
  
  // Status management
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'archived'], 
    default: 'active',
    required: true 
  },
  
  // Content URLs (version-specific)
  thumbnailURL: { type: String },
  thumbnailS3Key: { type: String }, // Store S3 key for generating fresh signed URLs
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
  
  // Enhanced enrollment tracking with version-specific enrollments
  enrolledStudents: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledAt: { type: Date, default: Date.now },
    versionEnrolled: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'cancelled'], 
      default: 'active' 
    },
    lastAccessedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 }, // Percentage completed
    completedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }],
    // Access control fields
    accessGrantedBy: { 
      type: String, 
      enum: ['payment', 'admin'], 
      default: 'payment',
      required: true 
    },
    grantedAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  totalEnrollments: { type: Number, default: 0 },
  
  // Deactivation tracking (for soft removal from public listings)
  deactivatedAt: { type: Date }, // When course was deactivated
  deactivationReason: { type: String }, // Reason for deactivation
  
  // Archive tracking (after 6 months of deactivation)
  archivedAt: { type: Date },
  archiveReason: { type: String },
  archiveGracePeriod: { type: Date }, // When archived content becomes inaccessible (6 months after deactivation)
  
  // SEO and display
  slug: { type: String, unique: true, sparse: true, index: true },
  tags: [{ type: String }],
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
  
  // Admin tracking
  createdBy: { type: String, default: 'admin' }, // admin email
  lastModifiedBy: { type: String, default: 'admin' },
  
  // Course settings
  isPublic: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: false },
  maxEnrollments: { type: Number }, // null for unlimited
  featured: { type: Boolean, default: false }, // Whether this course should be featured on homepage
  
  // WhatsApp group settings
  whatsappGroupLink: { type: String }, // WhatsApp group invite link
  hasWhatsappGroup: { type: Boolean, default: false }, // Whether this course has a WhatsApp group
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
courseSchema.index({ status: 1, currentVersion: 1 });
courseSchema.index({ 'enrolledStudents.userId': 1 });
courseSchema.index({ archivedAt: 1 });
courseSchema.index({ deactivatedAt: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ createdBy: 1 });
courseSchema.index({ featured: 1 }); // Index for featured courses query

// Virtual for checking if course is available for new enrollments
courseSchema.virtual('isAvailableForEnrollment').get(function() {
  return this.status === 'active' && this.isPublic;
});

// Virtual for checking if course is accessible to enrolled students
courseSchema.virtual('isAccessibleToEnrolled').get(function() {
  if (this.status === 'active' || this.status === 'inactive') {
    return true;
  }
  
  // For archived courses, check grace period
  if (this.status === 'archived' && this.archiveGracePeriod) {
    return new Date() < this.archiveGracePeriod;
  }
  
  return false;
});

// Virtual for checking if course has reached max enrollments
courseSchema.virtual('hasReachedMaxEnrollments').get(function() {
  if (!this.maxEnrollments) return false;
  return this.totalEnrollments >= this.maxEnrollments;
});

// Function to generate unique slug
async function generateUniqueSlug(title, existingSlug = null) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  // If we're updating and the slug hasn't changed, return the existing slug
  if (existingSlug && existingSlug === baseSlug) {
    return existingSlug;
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  // Check if slug exists and generate a unique one
  while (true) {
    const existingCourse = await mongoose.model('Course').findOne({ slug });
    if (!existingCourse) {
      break;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// Pre-save middleware to generate unique slug
courseSchema.pre('save', async function(next) {
  try {
    if (this.isModified('title') || !this.slug) {
      // Extract title string for slug generation (use English if bilingual)
      const titleString = typeof this.title === 'string' ? this.title : (this.title?.en || this.title?.tg || '');
      this.slug = await generateUniqueSlug(titleString, this.slug);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get courses available for enrollment
courseSchema.statics.getAvailableCourses = function() {
  return this.find({ 
    status: 'active',
    isPublic: true,
    currentVersion: { $exists: true }
  }).populate('videos');
};

// Static method to get course by slug
courseSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' }).populate('videos');
};

// Static method to get courses by status
courseSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('videos');
};

// Static method to get archived courses past grace period
courseSchema.statics.getArchivedPastGracePeriod = function() {
  return this.find({
    status: 'archived',
    archiveGracePeriod: { $lt: new Date() }
  });
};

// Instance method to enroll a student
courseSchema.methods.enrollStudent = function(userId, accessGrantedBy = 'payment') {
  if (this.status !== 'active' && this.status !== 'inactive') {
    throw new Error('Course is not available for enrollment');
  }
  
  if (this.hasReachedMaxEnrollments) {
    throw new Error('Course has reached maximum enrollment limit');
  }
  
  // Check if already enrolled
  const existingEnrollment = this.enrolledStudents.find(
    enrollment => enrollment.userId && enrollment.userId.toString() === userId.toString()
  );
  
  if (existingEnrollment) {
    // If already enrolled, update the enrollment instead of throwing error
    existingEnrollment.status = 'active';
    existingEnrollment.accessGrantedBy = accessGrantedBy;
    existingEnrollment.grantedAt = new Date();
    existingEnrollment.lastAccessedAt = new Date();
    return this.save();
  }
  
  // Add enrollment
  this.enrolledStudents.push({
    userId,
    versionEnrolled: this.currentVersion,
    status: 'active',
    lastAccessedAt: new Date(),
    accessGrantedBy: accessGrantedBy,
    grantedAt: new Date()
  });
  
  this.totalEnrollments += 1;
  return this.save();
};

// Instance method to deactivate course (removes from public listings, enrolled students keep access)
courseSchema.methods.deactivate = function(reason = 'Admin request') {
  this.status = 'inactive';
  this.deactivatedAt = new Date();
  this.deactivationReason = reason;
  
  // Set archive grace period (6 months from now)
  const gracePeriod = new Date();
  gracePeriod.setMonth(gracePeriod.getMonth() + 6);
  this.archiveGracePeriod = gracePeriod;
  
  return this.save();
};

// Instance method to reactivate course
courseSchema.methods.reactivate = function() {
  this.status = 'active';
  this.deactivatedAt = null;
  this.deactivationReason = null;
  this.archiveGracePeriod = null;
  return this.save();
};

// Instance method to archive course (after 6 months of deactivation)
courseSchema.methods.archive = function(reason = 'Auto-archived after 6 months deactivation') {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archiveReason = reason;
  
  // Keep the existing archiveGracePeriod if set, otherwise set to 6 months from now
  if (!this.archiveGracePeriod) {
    const gracePeriod = new Date();
    gracePeriod.setMonth(gracePeriod.getMonth() + 6);
    this.archiveGracePeriod = gracePeriod;
  }
  
  return this.save();
};

// Instance method to unarchive course
courseSchema.methods.unarchive = function() {
  this.status = 'active';
  this.archivedAt = null;
  this.archiveReason = null;
  this.deactivatedAt = null;
  this.deactivationReason = null;
  this.archiveGracePeriod = null;
  return this.save();
};

// Instance method to create new version
courseSchema.methods.createNewVersion = function() {
  this.version += 1;
  this.currentVersion = this.version;
  return this.save();
};

// Instance method to update student progress
courseSchema.methods.updateStudentProgress = function(userId, progress, completedVideos = []) {
  const enrollment = this.enrolledStudents.find(
    enrollment => enrollment.userId && enrollment.userId.toString() === userId.toString()
  );
  
  if (!enrollment) {
    throw new Error('Student not enrolled in this course');
  }
  
  enrollment.progress = Math.min(100, Math.max(0, progress));
  enrollment.completedVideos = completedVideos;
  enrollment.lastAccessedAt = new Date();
  
  return this.save();
};

// Instance method to get student enrollment
courseSchema.methods.getStudentEnrollment = function(userId) {
  if (!userId) return null;
  
  try {
    return this.enrolledStudents.find(
      enrollment => enrollment.userId && enrollment.userId.toString() === userId.toString()
    );
  } catch (error) {
    console.error('❌ [getStudentEnrollment] Error:', error.message);
    return null;
  }
};

// Instance method to revoke student access (remove enrollment)
courseSchema.methods.revokeStudentAccess = function(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  const enrollmentIndex = this.enrolledStudents.findIndex(
    enrollment => enrollment.userId && enrollment.userId.toString() === userId.toString()
  );
  
  if (enrollmentIndex === -1) {
    throw new Error('Student is not enrolled in this course');
  }
  
  // Remove enrollment
  this.enrolledStudents.splice(enrollmentIndex, 1);
  
  // Decrement total enrollments if it's greater than 0
  if (this.totalEnrollments > 0) {
    this.totalEnrollments -= 1;
  }
  
  return this.save();
};

// Instance method to check if student has access to specific version
courseSchema.methods.studentHasAccessToVersion = function(userId, version) {
  const enrollment = this.getStudentEnrollment(userId);
  if (!enrollment) return false;
  
  // Students can access the version they enrolled in or any previous version
  return enrollment.versionEnrolled >= version;
};

module.exports = mongoose.model('Course', courseSchema); 