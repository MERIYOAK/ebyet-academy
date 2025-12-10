const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');

// Import models
const User = require('./models/User');
const Course = require('./models/Course');

async function debugPurchaseStatus() {
  try {
    console.log('🔧 Debugging purchase status...');
    
    // Find a user with purchased courses
    const users = await User.find({ 'purchasedCourses.0': { $exists: true } }).limit(5);
    console.log(`Found ${users.length} users with purchased courses`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email} (${user._id})`);
      console.log(`   Purchased courses: ${user.purchasedCourses.length}`);
      
      for (const courseId of user.purchasedCourses) {
        const course = await Course.findById(courseId);
        console.log(`   - Course: ${course?.title || 'Unknown'} (${courseId})`);
      }
    }
    
    // Test the specific course
    const courseId = '68a616a61e7edf6233cc14e7';
    console.log(`\n🔍 Testing course: ${courseId}`);
    
    const course = await Course.findById(courseId);
    console.log(`   Course title: ${course?.title || 'Not found'}`);
    
    // Check which users have purchased this course
    const usersWithCourse = await User.find({ purchasedCourses: courseId });
    console.log(`   Users who purchased this course: ${usersWithCourse.length}`);
    
    for (const user of usersWithCourse) {
      console.log(`   - ${user.email} (${user._id})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugPurchaseStatus();
