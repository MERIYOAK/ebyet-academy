const mongoose = require('mongoose');
require('dotenv').config();

// User schema with tokenVersion field
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return this.authProvider === 'local'; } },
  authProvider: { type: String, enum: ['google', 'local'], default: 'local' },
  profilePhotoKey: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  tokenVersion: { type: Number, default: 1 }, // For token invalidation
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  // Extended profile fields
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  age: { type: Number, min: 1, max: 120, default: null },
  sex: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'], default: null },
  address: { type: String, default: null },
  phoneNumber: { 
    type: String, 
    required: function() { 
      return this.authProvider === 'local'; 
    } 
  },
  country: { type: String, default: null },
  city: { type: String, default: null },
  // Google OAuth specific fields
  googleId: { type: String, sparse: true },
  googleProfilePhoto: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateTokenVersion() {
  try {
    console.log('🔄 Starting token version migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all users that don't have a tokenVersion field
    const usersWithoutTokenVersion = await User.find({ tokenVersion: { $exists: false } });
    console.log(`📊 Found ${usersWithoutTokenVersion.length} users without tokenVersion field`);
    
    if (usersWithoutTokenVersion.length === 0) {
      console.log('✅ All users already have tokenVersion field');
      return;
    }
    
    // Update all users to have tokenVersion = 1
    const updateResult = await User.updateMany(
      { tokenVersion: { $exists: false } },
      { $set: { tokenVersion: 1 } }
    );
    
    console.log(`✅ Successfully updated ${updateResult.modifiedCount} users with tokenVersion = 1`);
    
    // Verify the migration
    const usersAfterMigration = await User.find({ tokenVersion: { $exists: true } });
    console.log(`📊 Total users with tokenVersion field: ${usersAfterMigration.length}`);
    
    console.log('🎉 Token version migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateTokenVersion();
}

module.exports = migrateTokenVersion;
