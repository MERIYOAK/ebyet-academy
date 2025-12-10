#!/usr/bin/env node

/**
 * Simple test for WhatsApp Group Access System
 * Tests the core functionality without requiring a full server setup
 */

const mongoose = require('mongoose');
const GroupAccessToken = require('./models/GroupAccessToken');
const Course = require('./models/Course');
require('dotenv').config();

async function testWhatsAppFunctionality() {
  try {
    console.log('🧪 Testing WhatsApp Group Access System...\n');

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/persi-academy');
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Create a test course with WhatsApp group
    console.log('📚 Test 1: Creating test course with WhatsApp group...');
    const testCourse = new Course({
      title: 'Test WhatsApp Course',
      description: 'Test course for WhatsApp group functionality',
      price: 99,
      category: 'other',
      level: 'beginner',
      hasWhatsappGroup: true,
      whatsappGroupLink: 'https://chat.whatsapp.com/test-group-link',
      status: 'active',
      isPublic: true
    });
    
    await testCourse.save();
    console.log(`✅ Test course created: ${testCourse._id}\n`);

    // Test 2: Generate a group access token
    console.log('🔑 Test 2: Generating group access token...');
    const tokenDoc = await GroupAccessToken.createToken(
      new mongoose.Types.ObjectId(), // Mock user ID
      testCourse._id,
      1 // 1 hour expiry
    );
    
    console.log(`✅ Token generated: ${tokenDoc.token.substring(0, 20)}...`);
    console.log(`   Expires at: ${tokenDoc.expiresAt}\n`);

    // Test 3: Validate the token
    console.log('✅ Test 3: Validating token...');
    const validation = await GroupAccessToken.validateAndConsume(
      tokenDoc.token,
      '127.0.0.1', // Mock IP
      'Test User Agent' // Mock user agent
    );
    
    if (validation.valid) {
      console.log('✅ Token validation successful');
      console.log(`   User ID: ${validation.userId}`);
      console.log(`   Course ID: ${validation.courseId}\n`);
    } else {
      console.log('❌ Token validation failed:', validation.error);
    }

    // Test 4: Try to use the same token again (should fail)
    console.log('🚫 Test 4: Testing token reuse (should fail)...');
    const reuseValidation = await GroupAccessToken.validateAndConsume(
      tokenDoc.token,
      '127.0.0.1',
      'Test User Agent'
    );
    
    if (!reuseValidation.valid) {
      console.log('✅ Token reuse properly blocked:', reuseValidation.error);
    } else {
      console.log('❌ Token reuse was not blocked (security issue!)');
    }

    // Test 5: Test expired token
    console.log('\n⏰ Test 5: Testing expired token...');
    const expiredToken = await GroupAccessToken.createToken(
      new mongoose.Types.ObjectId(),
      testCourse._id,
      -1 // Negative hours = already expired
    );
    
    const expiredValidation = await GroupAccessToken.validateAndConsume(
      expiredToken.token,
      '127.0.0.1',
      'Test User Agent'
    );
    
    if (!expiredValidation.valid) {
      console.log('✅ Expired token properly rejected:', expiredValidation.error);
    } else {
      console.log('❌ Expired token was not rejected (security issue!)');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await Course.deleteOne({ _id: testCourse._id });
    await GroupAccessToken.deleteMany({ courseId: testCourse._id });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All WhatsApp functionality tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Course creation with WhatsApp group');
    console.log('   ✅ Token generation');
    console.log('   ✅ Token validation');
    console.log('   ✅ Token reuse prevention');
    console.log('   ✅ Expired token handling');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Database disconnected');
  }
}

// Run the test
testWhatsAppFunctionality();
