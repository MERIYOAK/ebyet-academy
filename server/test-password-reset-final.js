const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testPasswordResetFinal() {
  console.log('🧪 Final Password Reset Test\n');

  try {
    // Test with a real email address
    const testEmail = 'philiweb123@gmail.com'; // Use your actual email
    
    console.log(`📧 Testing password reset for: ${testEmail}`);
    
    const forgotResponse = await makeRequest(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail
      })
    });

    console.log('   Status:', forgotResponse.status);
    console.log('   Response:', forgotResponse.data);
    
    if (forgotResponse.status === 200) {
      console.log('   ✅ Password reset request successful!');
      console.log('   📧 Check your email for the reset link');
      console.log('   💡 The reset link will be valid for 1 hour');
    } else {
      console.log('   ❌ Password reset request failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPasswordResetFinal();
