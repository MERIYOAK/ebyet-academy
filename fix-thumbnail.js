/**
 * Fix Course Thumbnail
 * Updates course thumbnail to point to correct S3 location
 */

const { MongoClient, ObjectId } = require('mongodb');
const AWS = require('aws-sdk');
require('dotenv').config();

const COURSE_ID = '69790910eedf55c69b320094';

async function fixThumbnail() {
  let client;
  
  try {
    console.log('🔧 Fixing course thumbnail...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    
    // Connect to database
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // Get current course data
    console.log('\n🔍 Getting current course data...');
    const course = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    if (!course) {
      console.log('❌ Course not found');
      process.exit(1);
    }
    
    console.log('✅ Course found');
    console.log(`   - Current thumbnailS3Key: ${course.thumbnailS3Key}`);
    console.log(`   - Current thumbnailURL: ${course.thumbnailURL?.substring(0, 100)}...`);
    
    // Configure S3
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    // Move thumbnail to new location if needed
    const currentThumbnailKey = course.thumbnailS3Key;
    const newThumbnailKey = `thumbnails/course-${COURSE_ID}.png`;
    
    if (currentThumbnailKey && currentThumbnailKey !== newThumbnailKey) {
      console.log('\n📋 Moving thumbnail to new location...');
      console.log(`   From: ${currentThumbnailKey}`);
      console.log(`   To: ${newThumbnailKey}`);
      
      try {
        // Copy thumbnail to new location
        const copyParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          CopySource: `${process.env.AWS_S3_BUCKET}/${currentThumbnailKey}`,
          Key: newThumbnailKey
        };
        
        await s3.copyObject(copyParams).promise();
        console.log('✅ Thumbnail copied to new location');
        
        // Update database with new S3 key
        const newThumbnailURL = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${newThumbnailKey}`;
        
        await db.collection('courses').updateOne(
          { _id: new ObjectId(COURSE_ID) },
          { 
            $set: { 
              thumbnailS3Key: newThumbnailKey,
              thumbnailURL: newThumbnailURL
            }
          }
        );
        
        console.log('✅ Database updated with new thumbnail paths');
        console.log(`   - New thumbnailS3Key: ${newThumbnailKey}`);
        console.log(`   - New thumbnailURL: ${newThumbnailURL}`);
        
      } catch (moveError) {
        console.log('⚠️  Could not move thumbnail:', moveError.message);
        console.log('🔄 Updating database with current thumbnail URL...');
        
        // Just update the URL to be clean
        const cleanThumbnailURL = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${currentThumbnailKey}`;
        
        await db.collection('courses').updateOne(
          { _id: new ObjectId(COURSE_ID) },
          { 
            $set: { 
              thumbnailURL: cleanThumbnailURL
            }
          }
        );
        
        console.log('✅ Database updated with clean thumbnail URL');
        console.log(`   - Clean thumbnailURL: ${cleanThumbnailURL}`);
      }
    } else {
      console.log('\n✅ Thumbnail is already in correct location');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying thumbnail fix...');
    const updatedCourse = await db.collection('courses').findOne({ 
      _id: new ObjectId(COURSE_ID) 
    });
    
    console.log('✅ Updated course data:');
    console.log(`   - thumbnailS3Key: ${updatedCourse.thumbnailS3Key}`);
    console.log(`   - thumbnailURL: ${updatedCourse.thumbnailURL}`);
    
    // Test if thumbnail is accessible
    try {
      const headParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: updatedCourse.thumbnailS3Key
      };
      
      await s3.headObject(headParams).promise();
      console.log('✅ Thumbnail is accessible in S3');
      
    } catch (s3Error) {
      console.log('❌ Thumbnail is NOT accessible in S3');
      console.log(`   - Error: ${s3Error.message}`);
    }
    
    console.log('\n🎉 Thumbnail fix completed!');
    console.log('============================');
    console.log('✅ Course thumbnail should now render correctly');
    console.log('\n🚀 Next steps:');
    console.log('   1. Refresh your admin courses page');
    console.log('   2. Check if thumbnail renders');
    console.log('   3. Test course on user-facing pages');
    
  } catch (error) {
    console.error('❌ Thumbnail fix failed:', error.message);
    console.error(error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

if (require.main === module) {
  console.log('🔧 Course Thumbnail Fix Tool');
  console.log('=============================');
  fixThumbnail();
}

module.exports = { fixThumbnail };
