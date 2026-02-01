const User = require('../models/User');
const Course = require('../models/Course');
const AuditLog = require('../models/AuditLog');
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

/**
 * Get user's course enrollments with access details
 * GET /api/user/admin/:userId/courses
 */
exports.getUserCourseEnrollments = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get all courses
    const courses = await Course.find({}).select('title enrolledStudents');
    
    // Build enrollment list with access details
    const enrollments = courses.map(course => {
      const enrollment = course.getStudentEnrollment(userId);
      const courseTitle = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || 'Untitled');
      
      return {
        courseId: course._id,
        courseTitle: courseTitle,
        hasAccess: !!enrollment,
        accessGrantedBy: enrollment?.accessGrantedBy || null,
        grantedAt: enrollment?.grantedAt || null,
        enrolledAt: enrollment?.enrolledAt || null,
        status: enrollment?.status || null,
        versionEnrolled: enrollment?.versionEnrolled || null
      };
    });
    
    res.json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        enrollments: enrollments
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user course enrollments', error: err.message });
  }
};

/**
 * Grant course access to a user (admin only)
 * POST /api/user/admin/:userId/courses/:courseId/grant
 */
exports.grantCourseAccess = async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    // Validate inputs
    if (!userId || !courseId) {
      return res.status(400).json({ message: 'User ID and Course ID are required' });
    }
    
    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(userId) || 
        !require('mongoose').Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid user ID or course ID format' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if already enrolled
    const existingEnrollment = course.getStudentEnrollment(userId);
    if (existingEnrollment) {
      return res.status(400).json({ 
        message: 'User already has access to this course',
        data: {
          accessGrantedBy: existingEnrollment.accessGrantedBy,
          grantedAt: existingEnrollment.grantedAt
        }
      });
    }
    
    // Grant access (enroll with admin flag)
    await course.enrollStudent(userId, 'admin');
    
    // Add to user's purchasedCourses if not already there (for compatibility)
    if (!user.purchasedCourses.includes(courseId)) {
      user.purchasedCourses.push(courseId);
      await user.save();
    }
    
    const courseTitle = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || 'Untitled');
    
    // Log audit action
    try {
      await AuditLog.logAction({
        action: 'course_access_granted',
        entityType: 'course',
        entityId: course._id,
        entityTitle: courseTitle,
        performedBy: adminEmail,
        performedById: null,
        details: {
          userId: user._id,
          userEmail: user.email,
          userName: user.name,
          accessGrantedBy: 'admin',
          courseId: course._id
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError);
      // Don't fail the request if audit logging fails
    }
    
    console.log(`✅ Admin granted course access: ${user.email} -> ${courseTitle}`);
    
    res.json({
      success: true,
      message: 'Course access granted successfully',
      data: {
        userId: user._id,
        courseId: course._id,
        courseTitle: courseTitle,
        accessGrantedBy: 'admin',
        grantedAt: new Date()
      }
    });
  } catch (err) {
    console.error('Error granting course access:', err);
    res.status(500).json({ 
      message: 'Failed to grant course access', 
      error: err.message 
    });
  }
};

/**
 * Revoke course access from a user (admin only)
 * DELETE /api/user/admin/:userId/courses/:courseId/revoke
 */
exports.revokeCourseAccess = async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    const adminEmail = req.admin?.email || req.user?.email || 'admin';
    
    // Validate inputs
    if (!userId || !courseId) {
      return res.status(400).json({ message: 'User ID and Course ID are required' });
    }
    
    // Validate ObjectId format
    if (!require('mongoose').Types.ObjectId.isValid(userId) || 
        !require('mongoose').Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid user ID or course ID format' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    
    // Check if user is enrolled
    const enrollment = course.getStudentEnrollment(userId);
    if (!enrollment) {
      return res.status(404).json({ message: 'User does not have access to this course' });
    }
    
    // Don't revoke if access was granted by payment (only revoke admin-granted access)
    // Actually, let's allow revoking any access as per requirements
    // But we'll log the source for audit purposes
    
    // Revoke access
    await course.revokeStudentAccess(userId);
    
    // Remove from user's purchasedCourses (only if it was admin-granted)
    // Actually, let's be safe and only remove if it was admin-granted
    if (enrollment.accessGrantedBy === 'admin') {
      user.purchasedCourses = user.purchasedCourses.filter(
        id => id.toString() !== courseId.toString()
      );
      await user.save();
    }
    
    const courseTitle = typeof course.title === 'string' ? course.title : (course.title?.en || course.title?.tg || 'Untitled');
    
    // Log audit action
    try {
      await AuditLog.logAction({
        action: 'course_access_revoked',
        entityType: 'course',
        entityId: course._id,
        entityTitle: courseTitle,
        performedBy: adminEmail,
        performedById: null,
        details: {
          userId: user._id,
          userEmail: user.email,
          userName: user.name,
          previousAccessGrantedBy: enrollment.accessGrantedBy,
          courseId: course._id
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (auditError) {
      console.error('Failed to log audit action:', auditError);
      // Don't fail the request if audit logging fails
    }
    
    console.log(`✅ Admin revoked course access: ${user.email} -> ${courseTitle}`);
    
    res.json({
      success: true,
      message: 'Course access revoked successfully',
      data: {
        userId: user._id,
        courseId: course._id,
        courseTitle: courseTitle
      }
    });
  } catch (err) {
    console.error('Error revoking course access:', err);
    res.status(500).json({ 
      message: 'Failed to revoke course access', 
      error: err.message 
    });
  }
}; 