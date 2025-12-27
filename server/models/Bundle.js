const mongoose = require('mongoose');

const bundleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  longDescription: { type: String }, // Detailed description for detail page
  price: { type: Number, required: true },
  originalValue: { type: Number }, // Total value if courses were purchased individually
  
  // Course references
  courseIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  }],
  
  // Media
  thumbnailURL: { type: String },
  thumbnailS3Key: { type: String }, // Store S3 key for generating fresh signed URLs
  
  // Metadata
  category: { type: String }, // e.g., 'Trading', 'Investing', etc.
  featured: { type: Boolean, default: false }, // Whether this bundle should be featured/promoted
  
  // Status management
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'archived'], 
    default: 'active',
    required: true 
  },
  
  // Enrollment tracking
  enrolledStudents: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'cancelled'], 
      default: 'active' 
    },
    lastAccessedAt: { type: Date, default: Date.now }
  }],
  
  totalEnrollments: { type: Number, default: 0 },
  
  // SEO and display
  slug: { type: String, unique: true, sparse: true, index: true },
  tags: [{ type: String }],
  
  // Admin tracking
  createdBy: { type: String, default: 'admin' }, // admin email
  lastModifiedBy: { type: String, default: 'admin' },
  
  // Bundle settings
  isPublic: { type: Boolean, default: true },
  maxEnrollments: { type: Number }, // null for unlimited
  
  // Archive tracking
  archivedAt: { type: Date },
  archiveReason: { type: String },
  archiveGracePeriod: { type: Date }, // When archived content becomes inaccessible
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
bundleSchema.index({ status: 1 });
bundleSchema.index({ 'enrolledStudents.userId': 1 });
bundleSchema.index({ archivedAt: 1 });
bundleSchema.index({ category: 1 });
bundleSchema.index({ featured: 1 });
bundleSchema.index({ tags: 1 });
bundleSchema.index({ createdBy: 1 });

// Virtual for checking if bundle is available for purchase
bundleSchema.virtual('isAvailableForPurchase').get(function() {
  return this.status === 'active' && this.isPublic;
});

// Virtual for checking if bundle has reached max enrollments
bundleSchema.virtual('hasReachedMaxEnrollments').get(function() {
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
    const existingBundle = await mongoose.model('Bundle').findOne({ slug });
    if (!existingBundle) {
      break;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// Pre-save middleware to generate unique slug
bundleSchema.pre('save', async function(next) {
  try {
    if (this.isModified('title') || !this.slug) {
      this.slug = await generateUniqueSlug(this.title, this.slug);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get bundles available for purchase
bundleSchema.statics.getAvailableBundles = function() {
  return this.find({ 
    status: 'active',
    isPublic: true
  }).populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments');
};

// Static method to get featured bundles
bundleSchema.statics.getFeaturedBundles = function() {
  return this.find({ 
    status: 'active',
    isPublic: true,
    featured: true
  }).populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments');
};

// Static method to get bundle by slug
bundleSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, status: 'active' })
    .populate('courseIds', 'title description thumbnailURL price category level tags totalEnrollments videos');
};

// Instance method to enroll a student (purchase bundle)
bundleSchema.methods.enrollStudent = function(userId) {
  if (this.status !== 'active') {
    throw new Error('Bundle is not available for purchase');
  }
  
  if (this.hasReachedMaxEnrollments) {
    throw new Error('Bundle has reached maximum enrollment limit');
  }
  
  // Check if already enrolled
  const existingEnrollment = this.enrolledStudents.find(
    enrollment => enrollment.userId && enrollment.userId.toString() === userId.toString()
  );
  
  if (existingEnrollment) {
    throw new Error('Student already purchased this bundle');
  }
  
  // Add enrollment
  this.enrolledStudents.push({
    userId,
    status: 'active',
    lastAccessedAt: new Date()
  });
  
  this.totalEnrollments += 1;
  return this.save();
};

// Instance method to archive bundle
bundleSchema.methods.archive = function(reason = 'Admin request', gracePeriodMonths = 6) {
  this.status = 'archived';
  this.archivedAt = new Date();
  this.archiveReason = reason;
  
  // Set grace period (default 6 months)
  const gracePeriod = new Date();
  gracePeriod.setMonth(gracePeriod.getMonth() + gracePeriodMonths);
  this.archiveGracePeriod = gracePeriod;
  
  return this.save();
};

// Instance method to unarchive bundle
bundleSchema.methods.unarchive = function() {
  this.status = 'active';
  this.archivedAt = null;
  this.archiveReason = null;
  this.archiveGracePeriod = null;
  return this.save();
};

// Instance method to get student enrollment
bundleSchema.methods.getStudentEnrollment = function(userId) {
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

module.exports = mongoose.model('Bundle', bundleSchema);
