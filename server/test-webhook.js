require('dotenv').config();

console.log('🔍 Testing Webhook Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log(`   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set'}`);
console.log(`   - STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set'}`);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Test Stripe configuration
const { stripe, verifyWebhook } = require('./utils/stripe');

if (stripe) {
  console.log('\n✅ Stripe is configured');
} else {
  console.log('\n⚠️  Stripe is not configured - using development mode');
}

// Test webhook verification function
console.log('\n🧪 Testing webhook verification...');

// Simulate a real webhook request from Stripe CLI
const testWebhookBody = {
  id: 'evt_test_webhook',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_session',
      metadata: {
        userId: 'test_user_id',
        courseId: 'test_course_id',
        userEmail: 'test@example.com'
      }
    }
  }
};

const testReq = {
  headers: {
    'stripe-signature': 'whsec_test_signature',
    'content-type': 'application/json'
  },
  rawBody: Buffer.from(JSON.stringify(testWebhookBody)),
  body: testWebhookBody
};

try {
  const result = verifyWebhook(testReq);
  console.log('✅ Webhook verification function works');
  console.log(`   - Result type: ${result.type}`);
  console.log(`   - Result ID: ${result.id}`);
} catch (error) {
  console.log('❌ Webhook verification failed:', error.message);
}

console.log('\n💡 If webhook verification is failing, check:');
console.log('   1. STRIPE_WEBHOOK_SECRET is set in .env file');
console.log('   2. Webhook endpoint URL is correct in Stripe dashboard');
console.log('   3. Webhook events are properly configured'); 