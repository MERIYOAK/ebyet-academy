const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ibyet-investing')
  .then(async () => {
    console.log('🔍 Connected to MongoDB');
    
    // Check models
    const Course = require('./server/models/Course');
    const Video = require('./server/models/Video');
    
    const courseId = '69790910eedf55c69b320094';
    
    // Check course details
    const course = await Course.findById(courseId);
    console.log('\n📚 Course Details:');
    console.log('Course found:', !!course);
    if (course) {
      console.log('Title:', course.title);
      console.log('Videos array length:', course.videos?.length || 0);
      console.log('Current version:', course.currentVersion);
      console.log('Course versions:', course.versions?.length || 0);
    }
    
    // Check videos in Video collection
    const videos = await Video.find({ courseId: courseId });
    console.log('\n🎥 Videos in Video collection:');
    console.log('Total videos found:', videos.length);
    
    if (videos.length > 0) {
      console.log('\nFirst few videos:');
      videos.slice(0, 5).forEach((video, i) => {
        console.log(`  ${i+1}. ID: ${video._id}`);
        console.log(`     Title: ${video.title}`);
        console.log(`     S3Key: ${video.s3Key ? 'EXISTS' : 'MISSING'}`);
        console.log(`     Course Version: ${video.courseVersion || 'NOT SET'}`);
        console.log(`     Order: ${video.order || 'NOT SET'}`);
        console.log('');
      });
    }
    
    // Check if there are any videos with different courseId formats
    const allVideos = await Video.find({});
    console.log('\n🔍 All videos in database:');
    console.log('Total videos in DB:', allVideos.length);
    
    // Look for any videos that might belong to this course
    const possibleMatches = allVideos.filter(v => 
      v.courseId?.toString() === courseId ||
      v.course === courseId ||
      JSON.stringify(v).includes(courseId)
    );
    console.log('Possible matches for this course:', possibleMatches.length);
    
    await mongoose.disconnect();
    console.log('\n✅ Database check completed');
  })
  .catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });
