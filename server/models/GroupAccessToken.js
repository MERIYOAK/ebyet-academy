const mongoose = require('mongoose');

const groupAccessTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  used: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  isTemporaryLink: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
groupAccessTokenSchema.index({ userId: 1, courseId: 1 });
groupAccessTokenSchema.index({ token: 1, used: 1 });

// Static method to create a new access token
groupAccessTokenSchema.statics.createToken = function(userId, courseId, expiresInHours = 1) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);
  
  // Generate a secure random token
  const token = require('crypto').randomBytes(32).toString('hex');
  
  return this.create({
    userId,
    courseId,
    token,
    expiresAt
  });
};

// Static method to validate and consume a token
groupAccessTokenSchema.statics.validateAndConsume = async function(token, ipAddress, userAgent) {
  const tokenDoc = await this.findOne({ 
    token, 
    used: false, 
    expiresAt: { $gt: new Date() } 
  }).populate('courseId');
  
  if (!tokenDoc) {
    return { valid: false, error: 'Invalid or expired token' };
  }
  
  // Mark token as used
  tokenDoc.used = true;
  tokenDoc.usedAt = new Date();
  tokenDoc.ipAddress = ipAddress;
  tokenDoc.userAgent = userAgent;
  await tokenDoc.save();
  
  return { 
    valid: true, 
    userId: tokenDoc.userId, 
    courseId: tokenDoc.courseId,
    course: tokenDoc.courseId
  };
};

// Static method to generate a temporary WhatsApp group link
groupAccessTokenSchema.statics.generateTemporaryGroupLink = async function(courseId, userId) {
  const Course = mongoose.model('Course');
  const course = await Course.findById(courseId);
  
  if (!course || !course.whatsappGroupLink) {
    throw new Error('Course or WhatsApp group link not found');
  }
  
  // Generate a temporary token for the group link (expires in configured minutes)
  const tempToken = require('crypto').randomBytes(16).toString('hex');
  const expiresAt = new Date();
  const expiryMinutes = parseInt(process.env.WHATSAPP_TEMP_LINK_EXPIRY_MINUTES) || 30;
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);
  
  // Store the temporary link token
  const tempLinkDoc = new this({
    userId,
    courseId,
    token: tempToken,
    expiresAt,
    used: false,
    isTemporaryLink: true // Flag to identify temporary links
  });
  
  await tempLinkDoc.save();
  
  // Return the temporary link with the token
  return {
    temporaryLink: `${course.whatsappGroupLink}?ref=${tempToken}`,
    expiresAt,
    tempToken
  };
};

// Instance method to check if token is valid
groupAccessTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

module.exports = mongoose.model('GroupAccessToken', groupAccessTokenSchema);
