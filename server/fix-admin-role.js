const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixAdminRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing');
    console.log('✅ Connected to MongoDB');

    // Find the user and update their role to admin
    const user = await User.findOne({ email: 'meronmichaelabrha@gmail.com' });
    
    if (user) {
      console.log('👤 Current user:', {
        id: user._id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin
      });

      // Update user to admin role
      user.role = 'admin';
      user.isAdmin = true;
      await user.save();

      console.log('✅ User updated to admin:', {
        id: user._id,
        email: user.email,
        newRole: user.role,
        newIsAdmin: user.isAdmin
      });
    } else {
      console.log('❌ User not found');
    }

    // Verify the update
    const updatedUser = await User.findOne({ email: 'meronmichaelabrha@gmail.com' });
    console.log('🔍 Verification - Updated user:', {
      id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      isAdmin: updatedUser.isAdmin
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error fixing admin role:', error);
  }
}

fixAdminRole();
