const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ibyet-investing')
  .then(async () => {
    console.log('🔍 Connected to MongoDB');
    
    const Video = require('./server/models/Video');
    const courseId = '69790910eedf55c69b320094';
    const videoId = '69a31b7c6f0d9ddb03eedf9f';
    
    try {
      // Get the specific video that's failing
      const video = await Video.findById(videoId);
      console.log('\n🎥 Video Details:');
      console.log('ID:', video._id);
      console.log('Title:', video.title);
      console.log('S3Key:', video.s3Key);
      console.log('Course ID:', video.courseId);
      console.log('Order:', video.order);
      
      if (video.s3Key) {
        console.log('\n📦 Full S3 URL would be:');
        console.log(`https://ibyet-investing.s3.eu-central-1.amazonaws.com/${video.s3Key}`);
      } else {
        console.log('\n❌ No S3Key found for this video!');
      }
      
      // Check a few other videos to compare
      console.log('\n🔍 Checking other videos in this course:');
      const otherVideos = await Video.find({ courseId: courseId }).limit(5);
      otherVideos.forEach((v, i) => {
        console.log(`${i+1}. ${v.title?.en || v.title}`);
        console.log(`   S3Key: ${v.s3Key || 'MISSING'}`);
        console.log(`   Order: ${v.order || 'UNSET'}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');
  })
  .catch(err => {
    console.error('❌ Database error:', err);
    process.exit(1);
  });
