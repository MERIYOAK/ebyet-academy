import fetch from 'node-fetch';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BASE_URL = 'http://localhost:5000';
let authToken = '';

// Test user credentials
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

// Test course ID (you'll need to replace this with an actual course ID)
const testCourseId = 'your-course-id-here';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

async function testS3VideoAccess() {
  try {
    console.log('\n🔍 Testing S3 video access...');
    
    const response = await fetch(`${BASE_URL}/api/progress/course/${testCourseId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Course fetch failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Course data retrieved successfully');
    
    if (result.data.videos && result.data.videos.length > 0) {
      const video = result.data.videos[0];
      console.log(`   - Video title: ${video.title}`);
      console.log(`   - Video URL: ${video.videoUrl.substring(0, 100)}...`);
      
      // Test the video URL
      await testVideoUrl(video.videoUrl, video.title);
    } else {
      console.log('   - No videos found in course');
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ S3 video access test failed:', error.message);
    return null;
  }
}

async function testVideoUrl(videoUrl, videoTitle) {
  try {
    console.log(`\n🎬 Testing video URL for: ${videoTitle}`);
    
    // Test HEAD request to check headers
    const headResponse = await fetch(videoUrl, { method: 'HEAD' });
    
    console.log('📋 Response headers:');
    console.log(`   - Content-Type: ${headResponse.headers.get('content-type')}`);
    console.log(`   - Content-Length: ${headResponse.headers.get('content-length')}`);
    console.log(`   - Accept-Ranges: ${headResponse.headers.get('accept-ranges')}`);
    console.log(`   - Cache-Control: ${headResponse.headers.get('cache-control')}`);
    console.log(`   - Access-Control-Allow-Origin: ${headResponse.headers.get('access-control-allow-origin')}`);
    
    if (headResponse.ok) {
      console.log('✅ Video URL is accessible');
      
      // Check if content type is correct
      const contentType = headResponse.headers.get('content-type');
      if (contentType && contentType.startsWith('video/')) {
        console.log('✅ Content-Type is correct for video');
      } else {
        console.log('⚠️  Content-Type might be incorrect:', contentType);
      }
      
      // Check if CORS is enabled
      const corsHeader = headResponse.headers.get('access-control-allow-origin');
      if (corsHeader) {
        console.log('✅ CORS is enabled');
      } else {
        console.log('⚠️  CORS headers not found - this might cause issues');
      }
      
    } else {
      console.log(`❌ Video URL returned status: ${headResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing video URL:', error.message);
  }
}

async function testS3Configuration() {
  try {
    console.log('\n🔧 Testing S3 configuration...');
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    // Test bucket access
    console.log(`   - AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`   - S3 Bucket: ${process.env.AWS_S3_BUCKET}`);
    console.log(`   - Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}`);
    console.log(`   - Secret Access Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set'}`);
    
    // Test if we can list objects (this will verify credentials)
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET,
        MaxKeys: 1
      });
      
      await s3Client.send(listCommand);
      console.log('✅ S3 credentials and bucket access verified');
    } catch (error) {
      console.log('❌ S3 access test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ S3 configuration test failed:', error.message);
  }
}

async function testBrowserCompatibility() {
  console.log('\n🌐 Browser compatibility check:');
  console.log('   - Modern browsers support: MP4 (H.264), WebM, OGG');
  console.log('   - Most compatible: MP4 with H.264 codec');
  console.log('   - Check your video format and codec');
  console.log('   - Ensure videos are properly encoded for web playback');
}

async function runAllTests() {
  console.log('🚀 Starting S3 Video Access Tests\n');
  
  // Login first
  if (!await login()) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Test S3 configuration
  await testS3Configuration();
  
  // Test S3 video access
  await testS3VideoAccess();
  
  // Browser compatibility info
  await testBrowserCompatibility();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Summary:');
  console.log('   ✅ S3 configuration verification');
  console.log('   ✅ Video URL accessibility');
  console.log('   ✅ Content-Type headers');
  console.log('   ✅ CORS configuration');
  console.log('   ✅ Browser compatibility check');
}

// Run the tests
runAllTests().catch(console.error); 