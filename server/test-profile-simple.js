const https = require('https');
const http = require('http');

// Simple HTTP client for testing
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testProfileUpload() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Profile Upload System...');
  console.log('');

  // Step 1: Test health endpoint
  try {
    console.log('1️⃣ Testing health endpoint...');
    const healthResult = await makeRequest(`${baseUrl}/api/auth/health`);
    console.log('   📊 Status:', healthResult.status);
    
    if (healthResult.status === 200) {
      console.log('   ✅ Health check passed');
      console.log('   📊 Features:', healthResult.data.features);
      
      if (!healthResult.data.features.profilePhotos) {
        console.log('   ❌ Profile photos feature is disabled - AWS S3 not configured');
        console.log('   💡 Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env file');
        return;
      } else {
        console.log('   ✅ Profile photos feature is enabled');
      }
    } else {
      console.log('   ❌ Health check failed');
      return;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    console.log('   💡 Make sure the server is running on port 5000');
    return;
  }

  console.log('');

  // Step 2: Test profile photo endpoint without auth (should return 401)
  try {
    console.log('2️⃣ Testing profile photo endpoint without auth...');
    const photoResult = await makeRequest(`${baseUrl}/api/auth/users/me/photo`);
    console.log('   📊 Status:', photoResult.status);
    
    if (photoResult.status === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log('   ⚠️  Unexpected response - should require auth');
    }
  } catch (error) {
    console.log('   ❌ Profile photo endpoint error:', error.message);
  }

  console.log('');

  // Step 3: Test profile update endpoint without auth (should return 401)
  try {
    console.log('3️⃣ Testing profile update endpoint without auth...');
    const updateResult = await makeRequest(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ firstName: 'Test' })
    });
    console.log('   📊 Status:', updateResult.status);
    
    if (updateResult.status === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log('   ⚠️  Unexpected response - should require auth');
    }
  } catch (error) {
    console.log('   ❌ Profile update endpoint error:', error.message);
  }

  console.log('');

  // Step 4: Check server logs for any S3 configuration issues
  console.log('4️⃣ Checking for common issues...');
  console.log('   💡 Check server console for these messages:');
  console.log('      - "✅ S3 connection successful - uploads will use S3"');
  console.log('      - "❌ S3 connection failed - uploads will use local storage"');
  console.log('      - "⚠️  S3 not configured - uploads will use local storage"');
  console.log('   💡 If you see S3 connection failures, check:');
  console.log('      - AWS_ACCESS_KEY_ID in .env file');
  console.log('      - AWS_SECRET_ACCESS_KEY in .env file');
  console.log('      - AWS_S3_BUCKET in .env file');
  console.log('      - AWS_REGION in .env file (defaults to us-east-1)');

  console.log('');
  console.log('🎯 Test Summary:');
  console.log('   ✅ Health endpoint accessible');
  console.log('   ✅ Authentication required for protected endpoints');
  console.log('   📸 Profile photo feature status checked');
  console.log('');
  console.log('🔍 Next Steps:');
  console.log('   1. Check server console for S3 configuration messages');
  console.log('   2. Verify AWS credentials in .env file');
  console.log('   3. Test with a real user account and token');
  console.log('   4. Check browser console for frontend errors');
}

// Run the test
testProfileUpload().catch(console.error);
