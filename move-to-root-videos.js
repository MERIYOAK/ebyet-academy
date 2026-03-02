/**
 * Move Videos to Root Videos Folder
 * Moves videos from course subfolder to root videos folder
 * 
 * Usage: node move-to-root-videos.js [COURSE_ID]
 */

const AWS = require('aws-sdk');
require('dotenv').config();

const COURSE_ID = process.argv[2] || '69790910eedf55c69b320094';
const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// Source and target paths
const SOURCE_FOLDER = `ibyet_production/courses/Stock_Market_Investing_Course/`;
const TARGET_FOLDER = `videos/`;

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

async function moveToRootVideos() {
  try {
    console.log('🚀 Moving videos to root videos folder...');
    console.log(`   - Course ID: ${COURSE_ID}`);
    console.log(`   - Bucket: ${BUCKET_NAME}`);
    console.log(`   - Source: ${SOURCE_FOLDER}`);
    console.log(`   - Target: ${TARGET_FOLDER}`);
    
    // List all videos in source folder
    console.log('\n🔍 Listing videos in source folder...');
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: SOURCE_FOLDER,
      MaxKeys: 1000
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    const videos = listedObjects.Contents?.filter(obj => !obj.Key.endsWith('/')) || [];
    
    console.log(`✅ Found ${videos.length} videos to move`);
    
    if (videos.length === 0) {
      console.log('⚠️  No videos found in source folder');
      process.exit(0);
    }
    
    let movedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let totalSize = 0;
    
    // Process each video
    for (const video of videos) {
      try {
        const filename = video.Key.split('/').pop();
        const targetKey = `${TARGET_FOLDER}${filename}`;
        
        console.log(`\n🎥 Processing: ${filename}`);
        console.log(`   From: ${video.Key}`);
        console.log(`   To: ${targetKey}`);
        console.log(`   Size: ${(video.Size / 1024 / 1024).toFixed(2)} MB`);
        
        // Check if target already exists
        try {
          await s3.headObject({ Bucket: BUCKET_NAME, Key: targetKey }).promise();
          console.log('⚠️  Target already exists, skipping...');
          skippedCount++;
          continue;
        } catch (headError) {
          // Target doesn't exist, proceed
        }
        
        // Copy to new location
        console.log('📋 Copying to root videos folder...');
        const copyParams = {
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${video.Key}`,
          Key: targetKey
        };
        
        await s3.copyObject(copyParams).promise();
        console.log('✅ Copied successfully');
        
        movedCount++;
        totalSize += video.Size;
        
        // Optional: Delete from source after successful copy
        // Uncomment following lines to delete source files
        /*
        try {
          await s3.deleteObject({ Bucket: BUCKET_NAME, Key: video.Key }).promise();
          console.log('🗑️  Source file deleted');
        } catch (deleteError) {
          console.log('⚠️  Could not delete source file:', deleteError.message);
        }
        */
        
      } catch (videoError) {
        console.error(`❌ Error processing video:`, videoError.message);
        errorCount++;
      }
    }
    
    // Verify final structure
    console.log('\n🔍 Verifying root videos folder...');
    try {
      const targetListParams = {
        Bucket: BUCKET_NAME,
        Prefix: TARGET_FOLDER,
        MaxKeys: 1000
      };
      
      const targetObjects = await s3.listObjectsV2(targetListParams).promise();
      const targetVideos = targetObjects.Contents?.filter(obj => !obj.Key.endsWith('/')) || [];
      
      console.log(`✅ Root videos folder verification: ${targetVideos.length} videos`);
      
      // Show some examples
      targetVideos.slice(0, 10).forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.Key.split('/').pop()}`);
      });
      
      if (targetVideos.length > 10) {
        console.log(`   ... and ${targetVideos.length - 10} more`);
      }
      
    } catch (verifyError) {
      console.log('⚠️  Could not verify final structure:', verifyError.message);
    }
    
    // Update database with new S3 keys
    if (movedCount > 0) {
      console.log('\n📝 Updating database with new S3 keys...');
      await updateDatabaseKeys(TARGET_FOLDER);
    }
    
    // Summary
    console.log('\n🎉 Root videos move completed!');
    console.log('==============================');
    console.log(`   - Videos moved: ${movedCount}`);
    console.log(`   - Videos skipped: ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   - Target folder: ${TARGET_FOLDER}`);
    
    if (movedCount > 0) {
      console.log('\n✅ Videos successfully moved to root videos folder!');
      console.log('🚀 Your course now uses simplified S3 structure!');
      console.log('\n📋 Final S3 Structure:');
      console.log('   ibyet-investing/');
      console.log('   ├── videos/');
      console.log('   │   ├── video1.mp4');
      console.log('   │   ├── video2.mp4');
      console.log('   │   └── ... (all videos)');
      console.log('   └── ibyet_production/ (old location - can be deleted)');
    }
    
  } catch (error) {
    console.error('❌ Root videos move failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function updateDatabaseKeys(targetFolder) {
  const { MongoClient, ObjectId } = require('mongodb');
  
  let client;
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = uri.split('/').pop().split('?')[0];
    const db = client.db(dbName);
    
    // Update all video S3 keys for this course
    console.log('🔄 Updating video S3 keys in database...');
    const videos = await db.collection('videos').find({
      course: new ObjectId(COURSE_ID)
    }).toArray();
    
    console.log(`   Found ${videos.length} videos to update`);
    
    let updatedCount = 0;
    for (const video of videos) {
      if (video.s3Key) {
        const filename = video.s3Key.split('/').pop();
        const newS3Key = `${targetFolder}${filename}`;
        
        await db.collection('videos').updateOne(
          { _id: video._id },
          { $set: { s3Key: newS3Key } }
        );
        updatedCount++;
      }
    }
    
    console.log(`✅ Updated ${updatedCount} video S3 keys in database`);
    await client.close();
    
  } catch (dbError) {
    console.error('⚠️  Database update failed:', dbError.message);
  }
}

if (require.main === module) {
  console.log('🚀 Move to Root Videos Tool');
  console.log('=============================');
  moveToRootVideos();
}

module.exports = { moveToRootVideos };
