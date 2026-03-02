const mongoose = require('mongoose');
const Course = require('./models/Course');
const Video = require('./models/Video');

mongoose.connect('mongodb://localhost:27017/ibyet-investing')
  .then(async () => {
    console.log('🔍 Checking course 69790910eedf55c69b320094...');
    
    const course = await Course.findById('69790910eedf55c69b320094');
    console.log('Course found:', !!course);
    if (course) {
      console.log('Course title:', course.title);
      console.log('Course videos count:', course.videos?.length || 0);
    }
    
    const videos = await Video.find({ courseId: '69790910eedf55c69b320094' });
    console.log('Videos in database for this course:', videos.length);
    
    if (videos.length > 0) {
      console.log('First few videos:');
      videos.slice(0, 3).forEach((video, i) => {
        console.log(`  ${i+1}. ID: ${video._id}, Title: ${video.title}, S3Key: ${video.s3Key ? 'Exists' : 'Missing'}`);
      });
    }
    
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Database error:', err);
    process.exit(1);
  });
