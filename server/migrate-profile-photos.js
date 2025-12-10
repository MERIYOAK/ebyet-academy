const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Check if AWS credentials are available
const hasAwsCredentials = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

if (!hasAwsCredentials) {
  console.log('❌ AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.');
  process.exit(1);
}

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = 'persi-edu-platform';
const OLD_FOLDER = 'persi-academy/';
const NEW_FOLDER = 'persi-academy/profile-pictures/';

async function migrateProfilePhotos() {
  try {
    console.log('🔄 Starting profile photo migration...');
    console.log(`📁 From: ${OLD_FOLDER}`);
    console.log(`📁 To: ${NEW_FOLDER}`);
    console.log('');

    // List all objects in the old folder
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: OLD_FOLDER,
      MaxKeys: 1000
    });

    const listResult = await s3Client.send(listCommand);
    
    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log('✅ No objects found in the old folder. Migration complete!');
      return;
    }

    // Filter out folders and only get files
    const files = listResult.Contents.filter(obj => 
      obj.Key !== OLD_FOLDER && 
      !obj.Key.endsWith('/') &&
      !obj.Key.includes('/courses/') &&
      !obj.Key.includes('/thumbnails/')
    );

    if (files.length === 0) {
      console.log('✅ No profile photos found in the old folder. Migration complete!');
      return;
    }

    console.log(`📸 Found ${files.length} profile photo(s) to migrate:`);
    files.forEach(file => console.log(`   - ${file.Key}`));
    console.log('');

    // Migrate each file
    for (const file of files) {
      const oldKey = file.Key;
      const fileName = oldKey.replace(OLD_FOLDER, '');
      const newKey = NEW_FOLDER + fileName;

      console.log(`🔄 Migrating: ${oldKey} → ${newKey}`);

      try {
        // Copy to new location
        const copyCommand = new CopyObjectCommand({
          Bucket: BUCKET_NAME,
          CopySource: `${BUCKET_NAME}/${oldKey}`,
          Key: newKey,
          MetadataDirective: 'COPY'
        });

        await s3Client.send(copyCommand);
        console.log(`   ✅ Copied successfully`);

        // Delete from old location
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: oldKey
        });

        await s3Client.send(deleteCommand);
        console.log(`   ✅ Deleted from old location`);

      } catch (error) {
        console.error(`   ❌ Error migrating ${oldKey}:`, error.message);
      }
    }

    console.log('');
    console.log('🎉 Profile photo migration completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Update your database to reflect the new S3 keys');
    console.log('2. Test the profile photo functionality');
    console.log('3. Verify that all profile images are loading correctly');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateProfilePhotos(); 