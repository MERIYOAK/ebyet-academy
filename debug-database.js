/**
 * Database Debug Script
 * Checks database structure and finds videos/courses
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugDatabase() {
  let client;
  
  try {
    console.log('🔍 Debugging database structure...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // List all collections
    console.log('\n📋 Collections in database:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Check courses collection
    console.log('\n🎓 Courses collection:');
    const coursesCount = await db.collection('courses').countDocuments();
    console.log(`   Total courses: ${coursesCount}`);
    
    if (coursesCount > 0) {
      const sampleCourse = await db.collection('courses').findOne();
      console.log('   Sample course structure:');
      console.log(`     ID: ${sampleCourse._id}`);
      console.log(`     Title: ${sampleCourse.title?.en || sampleCourse.title}`);
      console.log(`     Videos field: ${sampleCourse.videos ? 'exists' : 'missing'}`);
      console.log(`     Videos count: ${sampleCourse.videos?.length || 0}`);
      
      // Find our specific course
      const targetCourse = await db.collection('courses').findOne({ 
        _id: '69790910eedf55c69b320094' 
      });
      
      if (targetCourse) {
        console.log('\n✅ Target course found:');
        console.log(`     Title: ${targetCourse.title?.en || targetCourse.title}`);
        console.log(`     Videos: ${targetCourse.videos?.length || 0}`);
        
        if (targetCourse.videos && targetCourse.videos.length > 0) {
          console.log('     Sample video IDs:');
          targetCourse.videos.slice(0, 3).forEach((vid, index) => {
            console.log(`       ${index + 1}. ${vid}`);
          });
        }
      } else {
        console.log('\n❌ Target course not found');
        
        // Try to find course by partial ID or title
        const searchResults = await db.collection('courses').find({
          $or: [
            { _id: { $regex: '69790910eedf55c69b320094' } },
            { 'title.en': { $regex: 'Stock Market', $options: 'i' } }
          ]
        }).toArray();
        
        console.log(`\n🔍 Search results (${searchResults.length}):`);
        searchResults.forEach((course, index) => {
          console.log(`   ${index + 1}. ID: ${course._id} - Title: ${course.title?.en || course.title}`);
        });
      }
    }
    
    // Check videos collection
    console.log('\n🎥 Videos collection:');
    const videosCount = await db.collection('videos').countDocuments();
    console.log(`   Total videos: ${videosCount}`);
    
    if (videosCount > 0) {
      const sampleVideo = await db.collection('videos').findOne();
      console.log('   Sample video structure:');
      console.log(`     ID: ${sampleVideo._id}`);
      console.log(`     Title: ${sampleVideo.title?.en || sampleVideo.title}`);
      console.log(`     Course field: ${sampleVideo.course || 'missing'}`);
      console.log(`     S3 Key: ${sampleVideo.s3Key || 'missing'}`);
      
      // Find videos for our course
      const courseVideos = await db.collection('videos').find({
        course: '69790910eedf55c69b320094'
      }).toArray();
      
      console.log(`\n🎯 Videos for target course: ${courseVideos.length}`);
      
      if (courseVideos.length > 0) {
        courseVideos.slice(0, 3).forEach((video, index) => {
          console.log(`   ${index + 1}. ${video.title?.en || video.title}`);
          console.log(`      S3 Key: ${video.s3Key}`);
        });
      }
      
      // Try to find videos by S3 key pattern
      const s3Videos = await db.collection('videos').find({
        s3Key: { $regex: 'Stock_Market_Investing_Course', $options: 'i' }
      }).toArray();
      
      console.log(`\n🔍 Videos with Stock Market S3 keys: ${s3Videos.length}`);
      
      if (s3Videos.length > 0) {
        console.log('   Sample S3 keys:');
        s3Videos.slice(0, 3).forEach((video, index) => {
          console.log(`   ${index + 1}. ${video.s3Key}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔍 Database Debug Tool');
  console.log('======================');
  debugDatabase();
}

module.exports = { debugDatabase };
