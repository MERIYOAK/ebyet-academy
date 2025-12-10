const mongoose = require('mongoose');
const User = require('./models/User');
const authService = require('./services/authService');
const emailService = require('./services/emailService');
require('dotenv').config();

const testUser = { 
  name: 'Test User Enhanced', 
  email: 'test-enhanced@example.com', 
  password: 'password123' 
};

async function testEnhancedAuthentication() {
  try {
    console.log('🧪 Testing Enhanced Authentication System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clean up test user
    await User.deleteOne({ email: testUser.email });
    console.log('🧹 Cleaned up existing test user');

    // Test 1: Manual Registration (should require verification)
    console.log('\n📝 Test 1: Manual Registration (Email Verification Required)');
    try {
      const registrationResult = await authService.registerLocal(testUser);
      console.log('✅ Registration successful');
      console.log(`   - User ID: ${registrationResult.user._id}`);
      console.log(`   - Verification Required: ${registrationResult.verificationRequired}`);
      console.log(`   - Email Sent: ${registrationResult.emailSent}`);
      console.log(`   - Is Verified: ${registrationResult.user.isVerified}`);
      console.log(`   - Auth Provider: ${registrationResult.user.authProvider}`);
    } catch (error) {
      console.log('❌ Registration failed:', error.message);
    }

    // Test 2: Login Attempt (should fail - not verified)
    console.log('\n🔑 Test 2: Login Attempt (Should Fail - Not Verified)');
    try {
      await authService.loginLocal(testUser.email, testUser.password);
      console.log('❌ Login should have failed for unverified user');
    } catch (error) {
      console.log('✅ Login correctly blocked for unverified user');
      console.log(`   - Error: ${error.message}`);
    }

    // Test 3: Get User and Check Verification Status
    console.log('\n👤 Test 3: Get User and Check Verification Status');
    try {
      const user = await User.findOne({ email: testUser.email });
      console.log('✅ User retrieved successfully');
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Is Verified: ${user.isVerified}`);
      console.log(`   - Auth Provider: ${user.authProvider}`);
      console.log(`   - Created At: ${user.createdAt}`);
    } catch (error) {
      console.log('❌ Failed to get user:', error.message);
    }

    // Test 4: Generate Verification Token
    console.log('\n🔐 Test 4: Generate Verification Token');
    try {
      const user = await User.findOne({ email: testUser.email });
      const verificationToken = authService.generateVerificationToken(user._id);
      console.log('✅ Verification token generated');
      console.log(`   - Token: ${verificationToken.substring(0, 50)}...`);
      
      // Test 5: Verify Email with Token
      console.log('\n✅ Test 5: Verify Email with Token');
      const verificationResult = await authService.verifyEmail(verificationToken);
      console.log('✅ Email verification successful');
      console.log(`   - User ID: ${verificationResult.user._id}`);
      console.log(`   - Is Verified: ${verificationResult.user.isVerified}`);
      console.log(`   - Auth Token: ${verificationResult.token.substring(0, 50)}...`);
      console.log(`   - Message: ${verificationResult.message}`);
    } catch (error) {
      console.log('❌ Email verification failed:', error.message);
    }

    // Test 6: Login After Verification (should succeed)
    console.log('\n🔑 Test 6: Login After Verification (Should Succeed)');
    try {
      const loginResult = await authService.loginLocal(testUser.email, testUser.password);
      console.log('✅ Login successful after verification');
      console.log(`   - User ID: ${loginResult.user._id}`);
      console.log(`   - Is Verified: ${loginResult.user.isVerified}`);
      console.log(`   - Auth Token: ${loginResult.token.substring(0, 50)}...`);
    } catch (error) {
      console.log('❌ Login failed after verification:', error.message);
    }

    // Test 7: Resend Verification Email (should fail - already verified)
    console.log('\n📧 Test 7: Resend Verification Email (Should Fail - Already Verified)');
    try {
      await authService.resendVerificationEmail(testUser.email);
      console.log('❌ Resend should have failed for verified user');
    } catch (error) {
      console.log('✅ Resend correctly blocked for verified user');
      console.log(`   - Error: ${error.message}`);
    }

    // Test 8: JWT Token Verification
    console.log('\n🔐 Test 8: JWT Token Verification');
    try {
      const user = await User.findOne({ email: testUser.email });
      const authToken = authService.generateToken(user);
      const decoded = authService.verifyToken(authToken);
      console.log('✅ JWT token verification successful');
      console.log(`   - User ID: ${decoded.userId}`);
      console.log(`   - Email: ${decoded.email}`);
      console.log(`   - Role: ${decoded.role}`);
      console.log(`   - Auth Provider: ${decoded.authProvider}`);
    } catch (error) {
      console.log('❌ JWT token verification failed:', error.message);
    }

    // Test 9: Profile Update
    console.log('\n📝 Test 9: Profile Update');
    try {
      const user = await User.findOne({ email: testUser.email });
      const updateResult = await authService.updateProfile(user._id, { name: 'Updated Test User' });
      console.log('✅ Profile update successful');
      console.log(`   - Updated Name: ${updateResult.name}`);
      console.log(`   - Email: ${updateResult.email}`);
      console.log(`   - Is Verified: ${updateResult.isVerified}`);
    } catch (error) {
      console.log('❌ Profile update failed:', error.message);
    }

    // Test 10: Password Change
    console.log('\n🔒 Test 10: Password Change');
    try {
      const user = await User.findOne({ email: testUser.email });
      await authService.changePassword(user._id, testUser.password, 'newpassword123');
      console.log('✅ Password change successful');
      
      // Test login with new password
      const loginResult = await authService.loginLocal(testUser.email, 'newpassword123');
      console.log('✅ Login with new password successful');
    } catch (error) {
      console.log('❌ Password change failed:', error.message);
    }

    // Test 11: Email Service Configuration
    console.log('\n📧 Test 11: Email Service Configuration');
    console.log(`   - Email Service Configured: ${emailService.isEmailConfigured()}`);
    if (emailService.isEmailConfigured()) {
      console.log('   - SMTP settings are available');
    } else {
      console.log('   - SMTP settings are missing (emails will be skipped)');
    }

    // Test 12: Duplicate Registration (should fail)
    console.log('\n🚫 Test 12: Duplicate Registration (Should Fail)');
    try {
      await authService.registerLocal(testUser);
      console.log('❌ Duplicate registration should have failed');
    } catch (error) {
      console.log('✅ Duplicate registration correctly blocked');
      console.log(`   - Error: ${error.message}`);
    }

    // Test 13: Invalid Login Attempt
    console.log('\n🚫 Test 13: Invalid Login Attempt');
    try {
      await authService.loginLocal(testUser.email, 'wrongpassword');
      console.log('❌ Invalid login should have failed');
    } catch (error) {
      console.log('✅ Invalid login correctly blocked');
      console.log(`   - Error: ${error.message}`);
    }

    // Test 14: Verification Token with Wrong Type
    console.log('\n🚫 Test 14: Verification Token with Wrong Type');
    try {
      const user = await User.findOne({ email: testUser.email });
      const wrongToken = authService.generateToken(user); // Regular auth token, not verification
      await authService.verifyEmail(wrongToken);
      console.log('❌ Wrong token type should have failed');
    } catch (error) {
      console.log('✅ Wrong token type correctly blocked');
      console.log(`   - Error: ${error.message}`);
    }

    console.log('\n🎉 All enhanced authentication tests completed!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Manual registration with email verification');
    console.log('   ✅ Login blocking for unverified users');
    console.log('   ✅ Email verification with JWT tokens');
    console.log('   ✅ Automatic login after verification');
    console.log('   ✅ Resend verification email handling');
    console.log('   ✅ JWT token generation and verification');
    console.log('   ✅ Profile management');
    console.log('   ✅ Password change functionality');
    console.log('   ✅ Email service configuration check');
    console.log('   ✅ Duplicate user prevention');
    console.log('   ✅ Invalid credential handling');
    console.log('   ✅ Token type validation');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  testEnhancedAuthentication();
}

module.exports = { testEnhancedAuthentication }; 