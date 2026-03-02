const mongoose = require('mongoose');
const Course = require('./server/models/Course');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ebyet-academy')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Count courses by status
      const statusCounts = await Course.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log('\n📊 Course status distribution:');
      statusCounts.forEach(item => {
        console.log(`   ${item._id}: ${item.count} courses`);
      });
      
      // Get sample courses for each status
      const allCourses = await Course.find().select('title status').lean();
      
      console.log('\n📚 All courses with status:');
      allCourses.forEach((course, index) => {
        console.log(`   ${index + 1}. "${course.title}" - Status: ${course.status}`);
      });
      
      // Specifically look for inactive courses
      const inactiveCourses = await Course.find({ status: 'inactive' }).select('title status').lean();
      console.log(`\n🔍 Found ${inactiveCourses.length} inactive courses:`);
      inactiveCourses.forEach((course, index) => {
        console.log(`   ${index + 1}. "${course.title}" - Status: ${course.status}`);
      });
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });
