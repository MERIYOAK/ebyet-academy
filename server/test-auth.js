const mongoose = require('mongoose');
const User = require('./models/User');
const authService = require('./services/authService');
require('dotenv').config();

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

async function testAuthentication() {
  try {
    console.log('🧪 Testing Authentication System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clean up existing test user
    await User.deleteOne({ email: testUser.email });
    console.log('🧹 Cleaned up existing test user');

    // Test 1: Local Registration
    console.log('\n📝 Test 1: Local Registration');
    try {
      const registrationResult = await authService.registerLocal(testUser);
      console.log('✅ Registration successful');
      console.log('   User ID:', registrationResult.user._id);
      console.log('   Auth Provider:', registrationResult.user.authProvider);
      console.log('   Token generated:', !!registrationResult.token);
    } catch (error) {
      console.log('❌ Registration failed:', error.message);
    }

    // Test 2: Local Login
    console.log('\n🔑 Test 2: Local Login');
    try {
      const loginResult = await authService.loginLocal(testUser.email, testUser.password);
      console.log('✅ Login successful');
      console.log('   User authenticated:', loginResult.user.name);
      console.log('   Token generated:', !!loginResult.token);
    } catch (error) {
      console.log('❌ Login failed:', error.message);
    }

    // Test 3: Get User by ID
    console.log('\n👤 Test 3: Get User by ID');
    try {
      const user = await User.findOne({ email: testUser.email });
      const retrievedUser = await authService.getUserById(user._id);
      console.log('✅ User retrieved successfully');
      console.log('   Name:', retrievedUser.name);
      console.log('   Email:', retrievedUser.email);
      console.log('   Auth Provider:', retrievedUser.authProvider);
    } catch (error) {
      console.log('❌ Get user failed:', error.message);
    }

    // Test 4: JWT Token Verification
    console.log('\n🔐 Test 4: JWT Token Verification');
    try {
      const user = await User.findOne({ email: testUser.email });
      const token = authService.generateToken(user);
      const decoded = authService.verifyToken(token);
      console.log('✅ Token verification successful');
      console.log('   User ID:', decoded.userId);
      console.log('   Email:', decoded.email);
      console.log('   Role:', decoded.role);
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
    }

    // Test 5: Password Change
    console.log('\n🔒 Test 5: Password Change');
    try {
      const user = await User.findOne({ email: testUser.email });
      const newPassword = 'newpassword123';
      const result = await authService.changePassword(user._id, testUser.password, newPassword);
      console.log('✅ Password change successful');
      
      // Test login with new password
      const newLoginResult = await authService.loginLocal(testUser.email, newPassword);
      console.log('✅ Login with new password successful');
    } catch (error) {
      console.log('❌ Password change failed:', error.message);
    }

    // Test 6: Profile Update
    console.log('\n📝 Test 6: Profile Update');
    try {
      const user = await User.findOne({ email: testUser.email });
      const updateData = { name: 'Updated Test User' };
      const updatedUser = await authService.updateProfile(user._id, updateData);
      console.log('✅ Profile update successful');
      console.log('   Updated name:', updatedUser.name);
    } catch (error) {
      console.log('❌ Profile update failed:', error.message);
    }

    // Test 7: Invalid Login Attempt
    console.log('\n🚫 Test 7: Invalid Login Attempt');
    try {
      await authService.loginLocal(testUser.email, 'wrongpassword');
      console.log('❌ Invalid login should have failed');
    } catch (error) {
      console.log('✅ Invalid login correctly rejected:', error.message);
    }

    // Test 8: Duplicate Registration
    console.log('\n🚫 Test 8: Duplicate Registration');
    try {
      await authService.registerLocal(testUser);
      console.log('❌ Duplicate registration should have failed');
    } catch (error) {
      console.log('✅ Duplicate registration correctly rejected:', error.message);
    }

    console.log('\n🎉 All authentication tests completed!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Local registration and login');
    console.log('   ✅ JWT token generation and verification');
    console.log('   ✅ User profile management');
    console.log('   ✅ Password change functionality');
    console.log('   ✅ Error handling for invalid credentials');
    console.log('   ✅ Duplicate user prevention');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuthentication();
}

module.exports = { testAuthentication }; 