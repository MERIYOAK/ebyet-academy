/**
 * Simple test script for admin login functionality
 * Run this after setting up your .env file with admin credentials
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock environment variables for testing
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD_HASH = '$2b$12$a851k0FYdRlRXE9NyPm8JeietGzBGTezrViQYhyzCNkkkPR9pDfEu';
process.env.JWT_SECRET = 'test-secret-key';

// Import the admin controller
const adminController = require('./controllers/adminController');

// Mock request and response objects
const mockRequest = (body) => ({
  body
});

const mockResponse = () => {
  const res = {
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      res.data = data;
      return res;
    }
  };
  return res;
};

// Test admin login functionality
const testAdminLogin = async () => {
  console.log('Testing admin login functionality...\n');

  // Test 1: Valid credentials
  console.log('Test 1: Valid admin credentials');
  const validReq = mockRequest({
    email: 'admin@test.com',
    password: 'testpassword123'
  });
  const validRes = mockResponse();
  
  await adminController.adminLogin(validReq, validRes);
  
  if (validRes.data && validRes.data.success) {
    console.log('✅ Valid credentials test passed');
    console.log('Token generated:', validRes.data.token ? 'Yes' : 'No');
  } else {
    console.log('❌ Valid credentials test failed');
    console.log('Response:', validRes.data);
  }

  // Test 2: Invalid email
  console.log('\nTest 2: Invalid email');
  const invalidEmailReq = mockRequest({
    email: 'wrong@email.com',
    password: 'testpassword123'
  });
  const invalidEmailRes = mockResponse();
  
  await adminController.adminLogin(invalidEmailReq, invalidEmailRes);
  
  if (invalidEmailRes.data && invalidEmailRes.data.message === 'Invalid admin credentials') {
    console.log('✅ Invalid email test passed');
  } else {
    console.log('❌ Invalid email test failed');
    console.log('Response:', invalidEmailRes.data);
  }

  // Test 3: Invalid password
  console.log('\nTest 3: Invalid password');
  const invalidPasswordReq = mockRequest({
    email: 'admin@test.com',
    password: 'wrongpassword'
  });
  const invalidPasswordRes = mockResponse();
  
  await adminController.adminLogin(invalidPasswordReq, invalidPasswordRes);
  
  if (invalidPasswordRes.data && invalidPasswordRes.data.message === 'Invalid admin credentials') {
    console.log('✅ Invalid password test passed');
  } else {
    console.log('❌ Invalid password test failed');
    console.log('Response:', invalidPasswordRes.data);
  }

  // Test 4: Missing email
  console.log('\nTest 4: Missing email');
  const missingEmailReq = mockRequest({
    password: 'testpassword123'
  });
  const missingEmailRes = mockResponse();
  
  await adminController.adminLogin(missingEmailReq, missingEmailRes);
  
  if (missingEmailRes.data && missingEmailRes.data.message === 'Email and password are required') {
    console.log('✅ Missing email test passed');
  } else {
    console.log('❌ Missing email test failed');
    console.log('Response:', missingEmailRes.data);
  }

  console.log('\n🎉 Admin login tests completed!');
};

// Run tests if this file is executed directly
if (require.main === module) {
  testAdminLogin().catch(console.error);
}

module.exports = { testAdminLogin }; 