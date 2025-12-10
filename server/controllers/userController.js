const User = require('../models/User');
const { uploadFileWithOrganization, deleteFileFromS3, getPublicUrl } = require('../utils/s3');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get user profile', error: err.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldKey = user.profilePicture.split('.amazonaws.com/')[1];
      await deleteFileFromS3(oldKey);
    }
    
    // Upload new profile picture with organized structure
    const uploadResult = await uploadFileWithOrganization(req.file, 'profile-pic');
    const publicUrl = getPublicUrl(uploadResult.s3Key);
    
    user.profilePicture = publicUrl;
    await user.save();
    
    res.json({ 
      message: 'Profile picture uploaded successfully',
      profilePicture: publicUrl,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Profile picture upload failed', error: err.message });
  }
};

exports.deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.profilePicture) {
      return res.status(404).json({ message: 'Profile picture not found' });
    }
    
    // Delete from S3
    const s3Key = user.profilePicture.split('.amazonaws.com/')[1];
    await deleteFileFromS3(s3Key);
    
    // Remove from user document
    user.profilePicture = '';
    await user.save();
    
    res.json({ message: 'Profile picture deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete profile picture', error: err.message });
  }
};

exports.getUserDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('purchasedCourses')
      .select('-password');
    
    res.json({
      user,
      stats: {
        totalCourses: user.purchasedCourses.length,
        // Add more stats as needed
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get dashboard', error: err.message });
  }
};

// Admin user management functions
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', role = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = {};
    
    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by role
    if (role) {
      query.role = role;
    }
    
    // Build sort object
    const sortObj = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    
    // Handle different sort fields
    switch (sortBy) {
      case 'name':
        sortObj.name = order;
        break;
      case 'email':
        sortObj.email = order;
        break;
      case 'status':
        // For status sorting, we'll use a custom sort order: active, inactive
        sortObj.status = order;
        break;
      case 'createdAt':
      default:
        sortObj.createdAt = order;
        break;
    }
    
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
};

exports.deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent admin from deleting themselves (check by email for admin)
    if (req.user.id === 'admin' && user.email === req.user.email) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin accounts' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user status and increment token version to invalidate existing tokens
    user.status = status;
    user.tokenVersion = (user.tokenVersion || 1) + 1; // Increment token version
    await user.save();
    
    console.log(`🔒 User ${user.email} status changed to ${status}, token version incremented to ${user.tokenVersion}`);
    
    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user: { ...user.toObject(), password: undefined } }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user status', error: err.message });
  }
}; 