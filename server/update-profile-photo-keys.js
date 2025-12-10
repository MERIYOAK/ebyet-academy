const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  // Removed deprecated options: useNewUrlParser and useUnifiedTopology
  // These are no longer needed in MongoDB Driver 4.0+
});

// User Schema (import the same schema used in your app)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function() { return this.authProvider === 'local'; } },
  authProvider: { type: String, enum: ['google', 'local'], default: 'local' },
  profilePhotoKey: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  googleId: { type: String, sparse: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function updateProfilePhotoKeys() {
  try {
    console.log('🔄 Starting database profile photo key update...');
    console.log('');

    // Find all users with profile photo keys in the old format
    const users = await User.find({
      profilePhotoKey: { 
        $exists: true, 
        $ne: null,
        $regex: /^persi-academy\/[^\/]+\.(jpg|jpeg|png|gif|webp)$/i
      }
    });

    if (users.length === 0) {
      console.log('✅ No users found with profile photos in the old format.');
      return;
    }

    console.log(`📸 Found ${users.length} user(s) with profile photos to update:`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}): ${user.profilePhotoKey}`);
    });
    console.log('');

    let updatedCount = 0;
    let errorCount = 0;

    // Update each user's profile photo key
    for (const user of users) {
      try {
        const oldKey = user.profilePhotoKey;
        const fileName = oldKey.replace('persi-academy/', '');
        const newKey = `persi-academy/profile-pictures/${fileName}`;

        console.log(`🔄 Updating ${user.name}:`);
        console.log(`   Old: ${oldKey}`);
        console.log(`   New: ${newKey}`);

        // Update the user's profile photo key
        await User.findByIdAndUpdate(user._id, {
          profilePhotoKey: newKey
        });

        console.log(`   ✅ Updated successfully`);
        updatedCount++;

      } catch (error) {
        console.error(`   ❌ Error updating ${user.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Update Summary:');
    console.log(`   ✅ Successfully updated: ${updatedCount} user(s)`);
    console.log(`   ❌ Errors: ${errorCount} user(s)`);
    console.log('');

    if (updatedCount > 0) {
      console.log('🎉 Database update completed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('1. Run the S3 migration script to move the actual files');
      console.log('2. Test the profile photo functionality');
      console.log('3. Verify that all profile images are loading correctly');
    }

  } catch (error) {
    console.error('❌ Database update failed:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the update
updateProfilePhotoKeys(); 