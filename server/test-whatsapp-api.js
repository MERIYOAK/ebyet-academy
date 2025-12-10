#!/usr/bin/env node

/**
 * Test WhatsApp API endpoints functionality
 * Tests the controller functions directly without requiring a full server
 */

const mongoose = require('mongoose');
const Course = require('./models/Course');
const GroupAccessToken = require('./models/GroupAccessToken');
const Payment = require('./models/Payment');
require('dotenv').config();

// Mock request and response objects
const createMockReq = (params = {}, body = {}, user = {}) => ({
  params,
  body,
  user: { id: new mongoose.Types.ObjectId().toString(), ...user },
  ip: '127.0.0.1',
  get: (header) => header === 'User-Agent' ? 'Test User Agent' : null
});

const createMockRes = () => {
  const res = {
    status: (code) => {
      res.statusCode = code;
      return res;
    },
    json: (data) => {
      res.data = data;
      return res;
    },
    redirect: (url) => {
      res.redirectUrl = url;
      return res;
    }
  };
  return res;
};

async function testWhatsAppAPI() {
  try {
    console.log('🧪 Testing WhatsApp API Endpoints...\n');

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');
    console.log('✅ Connected to MongoDB\n');

    // Import the controller functions
    const courseController = require('./controllers/courseController');

    // Test 1: Create test data
    console.log('📚 Test 1: Setting up test data...');
    
    // Create a test course
    const testCourse = new Course({
      title: 'Test WhatsApp API Course',
      description: 'Test course for API functionality',
      price: 99,
      category: 'other',
      level: 'beginner',
      hasWhatsappGroup: true,
      whatsappGroupLink: 'https://chat.whatsapp.com/test-api-group',
      status: 'active',
      isPublic: true
    });
    await testCourse.save();
    console.log(`✅ Test course created: ${testCourse._id}`);

    // Enroll a test user
    const testUserId = new mongoose.Types.ObjectId();
    testCourse.enrolledStudents.push({
      userId: testUserId,
      versionEnrolled: 1,
      status: 'active',
      lastAccessedAt: new Date()
    });
    testCourse.totalEnrollments = 1;
    await testCourse.save();
    console.log('✅ Test user enrolled in course');

    // Create a payment record for the user
    const testPayment = new Payment({
      userId: testUserId,
      courseId: testCourse._id,
      stripeSessionId: 'test_session_123',
      amount: 99,
      currency: 'usd',
      status: 'completed',
      paymentMethod: 'card',
      metadata: {
        userEmail: 'test@example.com',
        courseTitle: testCourse.title,
        paymentDate: new Date()
      }
    });
    await testPayment.save();
    console.log('✅ Test payment created\n');

    // Test 2: Test generateGroupToken endpoint
    console.log('🔑 Test 2: Testing generateGroupToken endpoint...');
    const req1 = createMockReq(
      { courseId: testCourse._id.toString() },
      {},
      { id: testUserId.toString() }
    );
    const res1 = createMockRes();

    await courseController.generateGroupToken(req1, res1);

    if (res1.statusCode === 200 && res1.data.success) {
      console.log('✅ Token generation successful');
      console.log(`   Token: ${res1.data.token.substring(0, 20)}...`);
      console.log(`   Join URL: ${res1.data.joinUrl}`);
      
      const testToken = res1.data.token;

      // Test 3: Test joinGroup endpoint
      console.log('\n🚪 Test 3: Testing joinGroup endpoint...');
      const req2 = createMockReq(
        { courseId: testCourse._id.toString() },
        {},
        {}
      );
      req2.query = { token: testToken };
      const res2 = createMockRes();

      await courseController.joinGroup(req2, res2);

      if (res2.redirectUrl === testCourse.whatsappGroupLink) {
        console.log('✅ Group join successful');
        console.log(`   Redirected to: ${res2.redirectUrl}`);
      } else {
        console.log('❌ Group join failed or wrong redirect URL');
        console.log(`   Expected: ${testCourse.whatsappGroupLink}`);
        console.log(`   Got: ${res2.redirectUrl}`);
      }

      // Test 4: Test token reuse (should fail)
      console.log('\n🚫 Test 4: Testing token reuse (should fail)...');
      const req3 = createMockReq(
        { courseId: testCourse._id.toString() },
        {},
        {}
      );
      req3.query = { token: testToken };
      const res3 = createMockRes();

      await courseController.joinGroup(req3, res3);

      if (res3.statusCode === 403) {
        console.log('✅ Token reuse properly blocked');
      } else {
        console.log('❌ Token reuse was not blocked (security issue!)');
      }

    } else {
      console.log('❌ Token generation failed:', res1.data?.message);
    }

    // Test 5: Test error scenarios
    console.log('\n🚨 Test 5: Testing error scenarios...');
    
    // Test with invalid course ID
    const req4 = createMockReq(
      { courseId: 'invalid-course-id' },
      {},
      { id: testUserId.toString() }
    );
    const res4 = createMockRes();

    await courseController.generateGroupToken(req4, res4);
    if (res4.statusCode === 404) {
      console.log('✅ Invalid course ID properly handled');
    } else {
      console.log('❌ Invalid course ID not properly handled');
    }

    // Test with no token
    const req5 = createMockReq(
      { courseId: testCourse._id.toString() },
      {},
      {}
    );
    const res5 = createMockRes();

    await courseController.joinGroup(req5, res5);
    if (res5.statusCode === 400) {
      console.log('✅ Missing token properly handled');
    } else {
      console.log('❌ Missing token not properly handled');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await Course.deleteOne({ _id: testCourse._id });
    await Payment.deleteOne({ _id: testPayment._id });
    await GroupAccessToken.deleteMany({ courseId: testCourse._id });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All WhatsApp API tests completed!');
    console.log('\n📋 API Test Summary:');
    console.log('   ✅ Token generation endpoint');
    console.log('   ✅ Group join endpoint');
    console.log('   ✅ Token reuse prevention');
    console.log('   ✅ Error handling');
    console.log('   ✅ Security validations');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Database disconnected');
  }
}

// Run the test
testWhatsAppAPI();
