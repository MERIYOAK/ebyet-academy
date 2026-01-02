const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  // Bilingual support - can be string (legacy) or object {en, tg}
  title: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v) {
        if (typeof v === 'string') return true;
        if (typeof v === 'object' && v !== null && v.en && v.tg) return true;
        return false;
      },
      message: 'Title must be a string or object with en and tg properties'
    }
  },
  description: {
    type: mongoose.Schema.Types.Mixed,
    default: '',
    validate: {
      validator: function(v) {
        if (!v || v === '') return true; // Optional field
        if (typeof v === 'string') return true;
        if (typeof v === 'object' && v !== null && v.en && v.tg) return true;
        return false;
      },
      message: 'Description must be a string or object with en and tg properties'
    }
  },
  s3Key: { type: String, required: true },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  courseVersion: { 
    type: Number, 
    required: true,
    default: 1
  },
  order: { type: Number, default: 0 },
  fileSize: { type: Number, default: 0 }, // in bytes
  mimeType: { type: String },
  originalName: { type: String },
  fileExtension: { type: String }, // e.g., 'pdf', 'xlsx', 'docx'
  uploadedBy: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'archived'], 
    default: 'active' 
  },
  archivedAt: { type: Date },
  archiveReason: { type: String }
}, { timestamps: true });

// Indexes for efficient queries
materialSchema.index({ courseId: 1, courseVersion: 1 });
materialSchema.index({ courseId: 1, status: 1 });
materialSchema.index({ status: 1 });

// Static method to get materials by course version
materialSchema.statics.getByCourseVersion = async function(courseId, version) {
  return this.find({ 
    courseId, 
    courseVersion: version,
    status: 'active'
  }).sort({ order: 1, createdAt: 1 });
};

// Instance method to get file type icon/name
materialSchema.methods.getFileType = function() {
  const ext = this.fileExtension?.toLowerCase() || '';
  const mime = this.mimeType?.toLowerCase() || '';
  
  if (ext === 'pdf' || mime.includes('pdf')) return { type: 'PDF', icon: '📄' };
  if (ext === 'xlsx' || ext === 'xls' || mime.includes('spreadsheet')) return { type: 'Excel', icon: '📊' };
  if (ext === 'docx' || ext === 'doc' || mime.includes('word')) return { type: 'Word', icon: '📝' };
  if (ext === 'pptx' || ext === 'ppt' || mime.includes('presentation')) return { type: 'PowerPoint', icon: '📽️' };
  if (ext === 'csv' || mime.includes('csv')) return { type: 'CSV', icon: '📋' };
  if (ext === 'py' || mime.includes('python')) return { type: 'Python', icon: '🐍' };
  if (ext === 'zip' || ext === 'rar' || mime.includes('zip') || mime.includes('rar')) return { type: 'Archive', icon: '📦' };
  if (mime.includes('image')) return { type: 'Image', icon: '🖼️' };
  if (mime.includes('audio')) return { type: 'Audio', icon: '🎵' };
  
  return { type: 'File', icon: '📎' };
};

// Instance method to format file size
materialSchema.methods.getFormattedSize = function() {
  if (!this.fileSize) return '0 B';
  const bytes = this.fileSize;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

module.exports = mongoose.model('Material', materialSchema);

