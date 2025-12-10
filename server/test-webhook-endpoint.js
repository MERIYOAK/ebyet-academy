#!/usr/bin/env node

/**
 * Test Webhook Endpoint
 * This script tests if your webhook endpoint is accessible and working
 */

const https = require('https');
const http = require('http');

console.log('🔧 Testing Webhook Endpoint...\n');

const webhookUrl = 'https://persi-academy.onrender.com/api/payment/webhook';

console.log(`📍 Testing URL: ${webhookUrl}\n`);

// Test 1: Check if endpoint is accessible
console.log('🔍 Test 1: Checking endpoint accessibility...');

const testRequest = (url) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Webhook-Test/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Send a test payload
    const testPayload = JSON.stringify({
      type: 'test.event',
      data: {
        object: {
          id: 'test_webhook',
          metadata: {
            userId: 'test_user',
            courseId: 'test_course'
          }
        }
      }
    });

    req.write(testPayload);
    req.end();
  });
};

testRequest(webhookUrl)
  .then((response) => {
    console.log(`   ✅ Endpoint accessible`);
    console.log(`   📊 Status Code: ${response.statusCode}`);
    console.log(`   📋 Response: ${response.body.substring(0, 200)}...`);
    
    if (response.statusCode === 400) {
      console.log('   ✅ Expected 400 - webhook signature verification failed (this is normal for test requests)');
    } else if (response.statusCode === 200) {
      console.log('   ⚠️  Unexpected 200 - webhook might not be verifying signatures properly');
    }
  })
  .catch((error) => {
    console.log(`   ❌ Endpoint not accessible: ${error.message}`);
  });

console.log('\n📋 Environment Check:');
console.log('1. Make sure STRIPE_WEBHOOK_SECRET is set in Render environment variables');
console.log('2. Verify webhook URL is correct in Stripe Dashboard');
console.log('3. Check Render logs for webhook processing');

console.log('\n🔧 Manual Test Steps:');
console.log('1. Make a test purchase on your site');
console.log('2. Check Render logs for "Webhook received" messages');
console.log('3. Look for webhook processing errors');

console.log('\n📊 Expected Webhook Flow:');
console.log('1. User makes payment → Stripe sends webhook → Your server processes it');
console.log('2. Webhook creates payment record → User gets course access');
console.log('3. Receipt download should work after webhook processing');

console.log('\n🚨 Common Issues:');
console.log('- Webhook secret not configured in environment variables');
console.log('- Wrong webhook URL in Stripe Dashboard');
console.log('- CORS issues preventing webhook delivery');
console.log('- Server not processing raw body correctly');
