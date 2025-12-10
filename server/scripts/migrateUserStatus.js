const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// User Schema (same as in User.js)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  profilePicture: { type: String, default: '' },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function migrateUserStatus() {
  try {
    console.log('🔄 Starting user status migration...');
    
    // Find all users that don't have a status field
    const usersWithoutStatus = await User.find({ status: { $exists: false } });
    
    console.log(`📊 Found ${usersWithoutStatus.length} users without status field`);
    
    if (usersWithoutStatus.length === 0) {
      console.log('✅ All users already have status field');
      return;
    }
    
    // Update all users to have 'active' status
    const updateResult = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    
    console.log(`✅ Successfully updated ${updateResult.modifiedCount} users with 'active' status`);
    
    // Verify the migration
    const usersAfterMigration = await User.find({ status: { $exists: true } });
    console.log(`📊 Total users with status field: ${usersAfterMigration.length}`);
    
    // Show status distribution
    const statusCounts = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('📈 Status distribution:');
    statusCounts.forEach(status => {
      console.log(`  - ${status._id}: ${status.count} users`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateUserStatus(); 