const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  // Certificate identification
  certificateId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // User and course information
  studentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  
  // Certificate details
  studentName: { 
    type: String, 
    required: true 
  },
  courseTitle: { 
    type: String, 
    required: true 
  },
  instructorName: { 
    type: String, 
    required: true 
  },
  
  // Timestamps
  dateIssued: { 
    type: Date, 
    default: Date.now 
  },
  completionDate: { 
    type: Date, 
    required: true 
  },
  
  // File storage
  pdfUrl: { 
    type: String 
  },
  pdfS3Key: { 
    type: String 
  },
  
  // Verification
  isVerified: { 
    type: Boolean, 
    default: true 
  },
  verificationHash: { 
    type: String 
  },
  
  // Metadata
  platformName: { 
    type: String, 
    default: 'QENDIEL Academy' 
  },
  totalLessons: { 
    type: Number, 
    required: true 
  },
  completedLessons: { 
    type: Number, 
    required: true 
  },
  completionPercentage: { 
    type: Number, 
    required: true 
  }
}, { 
  timestamps: true 
});

// Indexes for efficient queries
certificateSchema.index({ studentId: 1, courseId: 1 });
certificateSchema.index({ dateIssued: -1 });

// Generate unique certificate ID
certificateSchema.statics.generateCertificateId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `CERT-${timestamp}-${random}`.toUpperCase();
};

// Static method to check if certificate exists for user-course combination
certificateSchema.statics.existsForUserAndCourse = function(studentId, courseId) {
  return this.findOne({ studentId, courseId });
};

// Static method to get certificate by ID
certificateSchema.statics.getByCertificateId = function(certificateId) {
  return this.findOne({ certificateId })
    .populate('studentId', 'name email')
    .populate('courseId', 'title description instructorName');
};

// Static method to get all certificates for a user
certificateSchema.statics.getUserCertificates = function(studentId) {
  return this.find({ studentId })
    .populate('courseId', 'title description thumbnailURL')
    .sort({ dateIssued: -1 });
};

// Static method to get certificate for specific course
certificateSchema.statics.getCourseCertificate = function(studentId, courseId) {
  return this.findOne({ studentId, courseId })
    .populate('studentId', 'name email')
    .populate('courseId', 'title description instructorName');
};

// Generate verification hash
certificateSchema.methods.generateVerificationHash = function() {
  const data = `${this.certificateId}-${this.studentId.toString()}-${this.courseId.toString()}-${this.dateIssued}`;
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Pre-save middleware to generate verification hash
certificateSchema.pre('save', function(next) {
  if (!this.verificationHash) {
    this.verificationHash = this.generateVerificationHash();
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
