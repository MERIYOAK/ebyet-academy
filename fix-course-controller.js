/**
 * Fix Course Controller Access
 * Updates the getCourseById function to handle authentication properly
 */

const fs = require('fs');

async function fixCourseController() {
  try {
    console.log('🔧 Fixing course controller access...');
    
    const controllerPath = './server/controllers/courseControllerEnhanced.js';
    
    // Read the current controller file
    const controllerContent = fs.readFileSync(controllerPath, 'utf8');
    
    // Find the getCourseById function and fix the authentication check
    const oldFunction = `const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate course ID
    if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Find course with populated videos
    const course = await Course.findById(id)
      .populate('videos', 'title s3Key order fileSize duration originalName description');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is public and active - only allow access to public active courses for regular users
    // But allow admins to access any course for editing
    const isAdmin = req.admin || (req.user && req.user.role === 'admin');
    
    if (!isAdmin && (!course.isPublic || course.status !== 'active')) {
      return res.status(403).json({
        success: false,
        message: 'Course not available'
      });
    }`;

    const newFunction = `const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate course ID
    if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Find course with populated videos
    const course = await Course.findById(id)
      .populate('videos', 'title s3Key order fileSize duration originalName description');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is public and active - only allow access to public active courses for regular users
    // But allow admins to access any course for editing
    const isAdmin = req.admin || (req.user && req.user.role === 'admin');
    
    console.log(\`🔍 [getCourseById] Course access check:\`, {
      courseId: id,
      isPublic: course.isPublic,
      status: course.status,
      isAdmin: !!isAdmin,
      hasUser: !!req.user,
      userRole: req.user?.role
    });
    
    // For public courses, allow access without authentication
    if (course.isPublic && course.status === 'active') {
      console.log(\`✅ [getCourseById] Public active course, allowing access\`);
      return res.json({
        success: true,
        data: {
          course: course.toObject()
        }
      });
    }
    
    // For non-public courses, require authentication and proper permissions
    if (!isAdmin && (!course.isPublic || course.status !== 'active')) {
      console.log(\`❌ [getCourseById] Course not available for regular user\`);
      return res.status(403).json({
        success: false,
        message: 'Course not available'
      });
    }`;

    // Replace the function in the file
    if (controllerContent.includes(oldFunction)) {
      const updatedContent = controllerContent.replace(oldFunction, newFunction);
      
      // Write the updated content back
      fs.writeFileSync(controllerPath, updatedContent);
      
      console.log('✅ Course controller updated successfully!');
      console.log('\n🔧 Changes made:');
      console.log('   - Added detailed logging for access checks');
      console.log('   - Fixed public course access logic');
      console.log('   - Public courses now accessible without authentication');
      
    } else {
      console.log('❌ Could not find the exact function to replace');
      console.log('   - The controller file may have been modified');
      console.log('   - Manual fix may be required');
    }
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Try accessing the course again');
    console.log('   3. Check backend logs for access check details');
    
  } catch (error) {
    console.error('❌ Course controller fix failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  console.log('🔧 Course Controller Fix Tool');
  console.log('==============================');
  fixCourseController();
}

module.exports = { fixCourseController };
