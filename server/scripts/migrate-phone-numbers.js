const mongoose = require('mongoose');
require('dotenv').config();

// Import the User model
const User = require('../models/User');

async function migratePhoneNumbers() {
  try {
    console.log('🔧 Starting phone number migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to process`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Check if user has old telephone field
        if (user.telephone && !user.phoneNumber) {
          updateData.phoneNumber = user.telephone;
          needsUpdate = true;
          console.log(`📱 User ${user.email}: Migrating telephone (${user.telephone}) to phoneNumber`);
        }

        // Check if user has no phone number at all
        if (!user.phoneNumber && !user.telephone) {
          // Set a placeholder phone number that will require user to update
          updateData.phoneNumber = '+000000000000';
          needsUpdate = true;
          console.log(`⚠️  User ${user.email}: No phone number found, setting placeholder`);
        }

        // Check if user has both fields (cleanup)
        if (user.telephone && user.phoneNumber) {
          // Remove the old telephone field
          updateData.$unset = { telephone: 1 };
          needsUpdate = true;
          console.log(`🧹 User ${user.email}: Cleaning up duplicate telephone field`);
        }

        if (needsUpdate) {
          await User.updateOne(
            { _id: user._id },
            updateData
          );
          updatedCount++;
          console.log(`✅ Updated user: ${user.email}`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped user: ${user.email} (already has phoneNumber)`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${user.email}:`, error.message);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📱 Total processed: ${users.length} users`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some users had errors during migration. Please review the logs above.');
    }

    console.log('\n🎯 Next steps:');
    console.log('   1. Users with placeholder phone numbers (+000000000000) need to update their profiles');
    console.log('   2. Consider sending email notifications to users about required phone number updates');
    console.log('   3. Test the new phone number validation in the registration and profile update flows');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePhoneNumbers()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePhoneNumbers };
