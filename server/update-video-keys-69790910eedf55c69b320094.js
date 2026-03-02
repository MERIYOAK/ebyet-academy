
// Database update script for 69790910eedf55c69b320094
// Run this to update video S3 keys in your database

const mongoose = require('mongoose');
require('dotenv').config();

async function updateVideoKeys() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Video = require('./server/models/Video');
  
  const courseId = '69790910eedf55c69b320094';
  const targetFolder = 'videos/course/69790910eedf55c69b320094/';
  
  // Update all videos for this course
  const result = await Video.updateMany(
    { course: courseId },
    { 
      $set: { 
        s3Key: { $concat: [targetFolder, { $substr: ['$s3Key', { $strLenCP: { $subtract: [{ $strLenCP: '$s3Key' }, { $indexOfCP: ['$s3Key', '/'] }] }, { $indexOfCP: ['$s3Key', '/'] }] }] }
      }
    }
  );
  
  console.log('Updated', result.modifiedCount, 'video keys');
  await mongoose.connection.close();
}

updateVideoKeys();
