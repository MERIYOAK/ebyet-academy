const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function fixCorrectAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ibyet-investing');
    console.log('✅ Connected to MongoDB');

    // Find and update the correct admin user
    const adminUser = await User.findOne({ email: 'admin@ibyet.com' });
    
    if (adminUser) {
      console.log('👤 Current admin user:', {
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role,
        isAdmin: adminUser.isAdmin
      });

      // Update to admin role
      adminUser.role = 'admin';
      adminUser.isAdmin = true;
      await adminUser.save();

      console.log('✅ Admin user updated:', {
        id: adminUser._id,
        email: adminUser.email,
        newRole: adminUser.role,
        newIsAdmin: adminUser.isAdmin
      });
    } else {
      console.log('❌ Admin user not found, creating...');
      
      // Create the admin user if it doesn't exist
      const newAdmin = new User({
        email: 'admin@ibyet.com',
        role: 'admin',
        isAdmin: true,
        status: 'active'
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created:', {
        id: newAdmin._id,
        email: newAdmin.email,
        role: newAdmin.role,
        isAdmin: newAdmin.isAdmin
      });
    }

    // Reset the other user back to regular user
    const regularUser = await User.findOne({ email: 'meronmichaelabrha@gmail.com' });
    if (regularUser) {
      regularUser.role = 'user';
      regularUser.isAdmin = false;
      await regularUser.save();
      console.log('✅ Regular user reset:', {
        id: regularUser._id,
        email: regularUser.email,
        newRole: regularUser.role,
        newIsAdmin: regularUser.isAdmin
      });
    }

    // Verify both users
    const adminCheck = await User.findOne({ email: 'admin@ibyet.com' });
    const userCheck = await User.findOne({ email: 'meronmichaelabrha@gmail.com' });
    
    console.log('🔍 Final verification:');
    console.log('Admin:', { email: adminCheck.email, role: adminCheck.role, isAdmin: adminCheck.isAdmin });
    console.log('User:', { email: userCheck.email, role: userCheck.role, isAdmin: userCheck.isAdmin });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error fixing admin:', error);
  }
}

fixCorrectAdmin();
