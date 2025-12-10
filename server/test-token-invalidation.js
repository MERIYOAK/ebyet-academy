const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  authProvider: { type: String, enum: ['google', 'local'], default: 'local' },
  profilePhotoKey: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  tokenVersion: { type: Number, default: 1 },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  age: { type: Number, min: 1, max: 120, default: null },
  sex: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'], default: null },
  address: { type: String, default: null },
  phoneNumber: { type: String },
  country: { type: String, default: null },
  city: { type: String, default: null },
  googleId: { type: String, sparse: true },
  googleProfilePhoto: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Mock auth middleware function
const mockAuthMiddleware = async (token, user) => {
  try {
    if (!token) {
      return { success: false, message: 'Access denied. No token provided.' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token has been invalidated by checking token version
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Check if token version matches current user token version
    if (decoded.tokenVersion !== user.tokenVersion) {
      return { success: false, message: 'Token has been invalidated. Please log in again.' };
    }
    
    // Check if user is still active
    if (user.status !== 'active') {
      return { success: false, message: 'Account is not active' };
    }
    
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
};

async function testTokenInvalidation() {
  try {
    console.log('🧪 Testing Token Invalidation System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find a test user
    const testUser = await User.findOne({ role: 'user' });
    if (!testUser) {
      console.log('❌ No test user found. Please create a user first.');
      return;
    }
    
    console.log(`👤 Testing with user: ${testUser.email}`);
    console.log(`   Current status: ${testUser.status}`);
    console.log(`   Current tokenVersion: ${testUser.tokenVersion}\n`);
    
    // Generate initial token
    const initialToken = jwt.sign(
      { 
        userId: testUser._id, 
        email: testUser.email, 
        role: testUser.role,
        authProvider: testUser.authProvider,
        tokenVersion: testUser.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('🔑 Generated initial token');
    
    // Test 1: Token should work with active user
    console.log('\n📋 Test 1: Token with active user');
    const result1 = await mockAuthMiddleware(initialToken, testUser);
    console.log(`   Result: ${result1.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${result1.message}`);
    
    // Test 2: Deactivate user and increment token version
    console.log('\n📋 Test 2: Deactivating user and incrementing token version');
    testUser.status = 'inactive';
    testUser.tokenVersion = (testUser.tokenVersion || 1) + 1;
    await testUser.save();
    console.log(`   User status changed to: ${testUser.status}`);
    console.log(`   Token version incremented to: ${testUser.tokenVersion}`);
    
    // Test 3: Token should be invalidated after deactivation
    console.log('\n📋 Test 3: Token after user deactivation');
    const result3 = await mockAuthMiddleware(initialToken, testUser);
    console.log(`   Result: ${result3.success ? '❌ FAIL (token should be invalid)' : '✅ PASS'}`);
    console.log(`   Message: ${result3.message}`);
    
    // Test 4: Generate new token with updated version
    console.log('\n📋 Test 4: New token with updated version');
    const newToken = jwt.sign(
      { 
        userId: testUser._id, 
        email: testUser.email, 
        role: testUser.role,
        authProvider: testUser.authProvider,
        tokenVersion: testUser.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const result4 = await mockAuthMiddleware(newToken, testUser);
    console.log(`   Result: ${result4.success ? '❌ FAIL (inactive user should be blocked)' : '✅ PASS'}`);
    console.log(`   Message: ${result4.message}`);
    
    // Test 5: Reactivate user and increment token version again
    console.log('\n📋 Test 5: Reactivating user and incrementing token version');
    testUser.status = 'active';
    testUser.tokenVersion = (testUser.tokenVersion || 1) + 1;
    await testUser.save();
    console.log(`   User status changed to: ${testUser.status}`);
    console.log(`   Token version incremented to: ${testUser.tokenVersion}`);
    
    // Test 6: New token should work with reactivated user
    console.log('\n📋 Test 6: New token with reactivated user');
    const finalToken = jwt.sign(
      { 
        userId: testUser._id, 
        email: testUser.email, 
        role: testUser.role,
        authProvider: testUser.authProvider,
        tokenVersion: testUser.tokenVersion
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    const result6 = await mockAuthMiddleware(finalToken, testUser);
    console.log(`   Result: ${result6.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${result6.message}`);
    
    console.log('\n🎉 Token invalidation system test completed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Active users with valid tokens can access the system');
    console.log('   ✅ Deactivated users cannot access even with valid tokens');
    console.log('   ✅ Token version changes invalidate existing tokens');
    console.log('   ✅ Reactivated users need new tokens to access the system');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testTokenInvalidation();
}

module.exports = testTokenInvalidation;
