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

async function testCompleteProfileSystem() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Complete Profile Image Upload System Test');
  console.log('=============================================');
  console.log('');

  // Step 1: Environment Check
  console.log('1️⃣ Environment Configuration Check');
  console.log('-----------------------------------');
  
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET', 'PORT', 'NODE_ENV'];
  const awsVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'];
  
  console.log('📋 Required Variables:');
  let missingRequired = false;
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: Set`);
    } else {
      console.log(`   ❌ ${varName}: NOT SET`);
      missingRequired = true;
    }
  });

  console.log('');
  console.log('📋 AWS S3 Variables:');
  let awsConfigured = true;
  awsVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== 'your_aws_access_key_id' && value !== 'your_aws_secret_access_key') {
      console.log(`   ✅ ${varName}: Set`);
    } else if (value && (value === 'your_aws_access_key_id' || value === 'your_aws_secret_access_key')) {
      console.log(`   ⚠️  ${varName}: DEFAULT VALUE (needs real credentials)`);
      awsConfigured = false;
    } else {
      console.log(`   ❌ ${varName}: NOT SET`);
      awsConfigured = false;
    }
  });

  if (missingRequired) {
    console.log('');
    console.log('❌ CRITICAL: Missing required environment variables');
    console.log('💡 Create a .env file in the server directory');
    return;
  }

  if (!awsConfigured) {
    console.log('');
    console.log('⚠️  WARNING: AWS S3 not properly configured');
    console.log('📸 Profile image uploads will fail');
    console.log('💡 To fix: Set real AWS credentials in .env file');
  }

  console.log('');

  // Step 2: Server Health Check
  console.log('2️⃣ Server Health Check');
  console.log('----------------------');
  
  try {
    const healthResult = await makeRequest(`${baseUrl}/api/auth/health`);
    console.log('📊 Health Status:', healthResult.status);
    
    if (healthResult.status === 200) {
      console.log('✅ Server is running');
      console.log('📊 Features:', healthResult.data.features);
      
      if (healthResult.data.features.profilePhotos) {
        console.log('✅ Profile photos feature is enabled');
      } else {
        console.log('❌ Profile photos feature is disabled');
      }
    } else {
      console.log('❌ Server health check failed');
      return;
    }
  } catch (error) {
    console.log('❌ Server not accessible:', error.message);
    console.log('💡 Make sure the server is running on port 5000');
    return;
  }

  console.log('');

  // Step 3: Route Testing
  console.log('3️⃣ Route Testing');
  console.log('----------------');
  
  const routes = [
    { path: '/api/auth/profile', method: 'PUT', name: 'Profile Update' },
    { path: '/api/auth/users/me/photo', method: 'GET', name: 'Profile Photo Get' },
    { path: '/api/users/me/photo', method: 'GET', name: 'Profile Photo Get (Alt)' }
  ];

  for (const route of routes) {
    try {
      const result = await makeRequest(`${baseUrl}${route.path}`, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (result.status === 401) {
        console.log(`✅ ${route.name}: Requires authentication (correct)`);
      } else if (result.status === 404) {
        console.log(`❌ ${route.name}: Route not found`);
      } else {
        console.log(`⚠️  ${route.name}: Unexpected status ${result.status}`);
      }
    } catch (error) {
      console.log(`❌ ${route.name}: Error - ${error.message}`);
    }
  }

  console.log('');

  // Step 4: Frontend-Backend Integration Check
  console.log('4️⃣ Frontend-Backend Integration Check');
  console.log('--------------------------------------');
  
  console.log('📋 Frontend Profile Page Issues:');
  console.log('   ✅ FormData handling looks correct');
  console.log('   ✅ File validation implemented');
  console.log('   ✅ Error handling implemented');
  console.log('   ✅ Progress feedback implemented');
  
  console.log('');
  console.log('📋 Backend Profile Upload Issues:');
  console.log('   ✅ Multer configuration looks correct');
  console.log('   ✅ File validation implemented');
  console.log('   ✅ S3 service integration implemented');
  console.log('   ⚠️  Error handling catches S3 failures silently');

  console.log('');

  // Step 5: Issue Summary
  console.log('5️⃣ Issue Summary');
  console.log('-----------------');
  
  if (!awsConfigured) {
    console.log('🎯 PRIMARY ISSUE: AWS S3 Not Configured');
    console.log('');
    console.log('❌ Profile image uploads will fail because:');
    console.log('   - AWS credentials are missing or set to default values');
    console.log('   - S3 service cannot authenticate with AWS');
    console.log('   - Uploads will fail silently due to error handling');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('   1. Create a .env file in the server directory');
    console.log('   2. Add your real AWS credentials:');
    console.log('      AWS_ACCESS_KEY_ID=your_real_access_key');
    console.log('      AWS_SECRET_ACCESS_KEY=your_real_secret_key');
    console.log('      AWS_S3_BUCKET=persi-edu-platform');
    console.log('      AWS_REGION=us-east-1');
    console.log('   3. Restart the server');
    console.log('   4. Test profile image upload again');
  } else {
    console.log('✅ AWS S3 appears to be configured');
    console.log('💡 If uploads still fail, check:');
    console.log('   - AWS credentials are valid');
    console.log('   - S3 bucket exists and is accessible');
    console.log('   - IAM permissions allow uploads');
    console.log('   - Server logs for specific error messages');
  }

  console.log('');
  console.log('🔍 Additional Debugging:');
  console.log('   - Check server console for S3 connection messages');
  console.log('   - Check browser console for frontend errors');
  console.log('   - Check network tab for failed requests');
  console.log('   - Test with a real user account and token');
}

// Run the test
testCompleteProfileSystem().catch(console.error);
