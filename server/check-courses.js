const mongoose = require('mongoose');
const Course = require('./models/Course');

async function checkCourses() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ebyet-academy');
    
    // Check all courses and their statuses
    const allCourses = await Course.find({}, { status: 1, title: 1, isPublic: 1 }).lean();
    console.log('📊 All courses in database:');
    allCourses.forEach(course => {
      const title = course.title?.en || course.title || 'No title';
      console.log(`  - ${title}: status='${course.status}', isPublic=${course.isPublic}`);
    });
    
    // Count by status
    const statusCounts = await Course.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('\n📈 Status counts:');
    statusCounts.forEach(item => {
      console.log(`  - ${item._id}: ${item.count}`);
    });
    
    // Test filtering
    console.log('\n🔍 Testing filters:');
    const activeCourses = await Course.find({ status: 'active' }).countDocuments();
    const inactiveCourses = await Course.find({ status: 'inactive' }).countDocuments();
    const archivedCourses = await Course.find({ status: 'archived' }).countDocuments();
    
    console.log(`  - Active courses: ${activeCourses}`);
    console.log(`  - Inactive courses: ${inactiveCourses}`);
    console.log(`  - Archived courses: ${archivedCourses}`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCourses();
