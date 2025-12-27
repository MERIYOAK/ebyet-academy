const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  // Bilingual content
  title: {
    en: { type: String, required: true },
    tg: { type: String, required: true }
  },
  content: {
    en: { type: String, required: true },
    tg: { type: String, required: true }
  },
  date: {
    type: String,
    required: true
  },
  
  // Status and ordering
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'admin'
  }
});

// Update the updatedAt field before saving
announcementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for active announcements ordered by order field
announcementSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);

