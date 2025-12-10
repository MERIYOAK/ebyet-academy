const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testProfileUploadFlow() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Complete Profile Upload Flow...');
  console.log('');

  // Step 1: Test health endpoint
  try {
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/auth/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Health check passed:', healthData.message);
    console.log('   📊 Features:', healthData.features);
    
    if (!healthData.features.profilePhotos) {
      console.log('   ❌ Profile photos feature is disabled - AWS S3 not configured');
      return;
    }
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
    return;
  }

  console.log('');

  // Step 2: Test registration to get a user token
  console.log('2️⃣ Testing user registration...');
  let authToken = null;
  
  try {
    const registerData = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });

    if (registerResponse.ok) {
      const registerResult = await registerResponse.json();
      authToken = registerResult.token;
      console.log('   ✅ Registration successful');
      console.log('   🔑 Token received');
    } else {
      const errorData = await registerResponse.json();
      console.log('   ❌ Registration failed:', errorData.message);
      
      // Try login instead
      console.log('   🔄 Trying login instead...');
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: registerData.email,
          password: registerData.password
        })
      });

      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        authToken = loginResult.token;
        console.log('   ✅ Login successful');
        console.log('   🔑 Token received');
      } else {
        console.log('   ❌ Login also failed');
        return;
      }
    }
  } catch (error) {
    console.log('   ❌ Registration/Login error:', error.message);
    return;
  }

  console.log('');

  // Step 3: Test getting current user
  console.log('3️⃣ Testing get current user...');
  try {
    const userResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('   ✅ User data retrieved');
      console.log('   👤 User ID:', userData.data._id);
      console.log('   📸 Has profile photo key:', !!userData.data.profilePhotoKey);
    } else {
      console.log('   ❌ Failed to get user data');
      return;
    }
  } catch (error) {
    console.log('   ❌ Get user error:', error.message);
    return;
  }

  console.log('');

  // Step 4: Test profile photo upload
  console.log('4️⃣ Testing profile photo upload...');
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xCF, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    const formData = new FormData();
    formData.append('profilePhoto', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    });
    formData.append('firstName', 'Test');
    formData.append('lastName', 'User');

    console.log('   📤 Uploading test image...');
    const uploadResponse = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('   📊 Upload response status:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      const uploadResult = await uploadResponse.json();
      console.log('   ✅ Profile update successful');
      console.log('   📸 Profile photo key:', uploadResult.data.profilePhotoKey);
      
      if (uploadResult.data.profilePhotoKey) {
        console.log('   ✅ Profile photo uploaded to S3');
      } else {
        console.log('   ⚠️  No profile photo key returned');
      }
    } else {
      const errorData = await uploadResponse.json();
      console.log('   ❌ Profile update failed:', errorData.message);
      console.log('   📋 Error details:', errorData);
    }
  } catch (error) {
    console.log('   ❌ Upload error:', error.message);
  }

  console.log('');

  // Step 5: Test profile photo retrieval
  console.log('5️⃣ Testing profile photo retrieval...');
  try {
    const photoResponse = await fetch(`${baseUrl}/api/auth/users/me/photo`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log('   📊 Photo response status:', photoResponse.status);
    
    if (photoResponse.ok) {
      const photoResult = await photoResponse.json();
      console.log('   ✅ Profile photo URL retrieved');
      console.log('   🔗 Photo URL:', photoResult.data.photoUrl);
    } else {
      const errorData = await photoResponse.json();
      console.log('   ❌ Profile photo retrieval failed:', errorData.message);
    }
  } catch (error) {
    console.log('   ❌ Photo retrieval error:', error.message);
  }

  console.log('');
  console.log('🎯 Test Summary:');
  console.log('   ✅ Health check passed');
  console.log('   ✅ Authentication working');
  console.log('   ✅ User data accessible');
  console.log('   📸 Profile photo upload tested');
  console.log('   🔗 Profile photo retrieval tested');
}

// Run the test
testProfileUploadFlow().catch(console.error);
