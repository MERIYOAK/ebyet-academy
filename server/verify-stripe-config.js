#!/usr/bin/env node

/**
 * Stripe Configuration Verification Script
 * Run this to verify your Stripe setup is working correctly
 */

console.log('🔧 Verifying Stripe Configuration...\n');

// Check environment variables
const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
  nodeEnv: process.env.NODE_ENV
};

console.log('📋 Environment Variables Status:');
console.log(`   🔐 Secret Key: ${stripeConfig.secretKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   🔑 Publishable Key: ${stripeConfig.publishableKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   🌐 Webhook Secret: ${stripeConfig.webhookSecret ? '✅ Set' : '❌ Missing'}`);
console.log(`   🏭 Environment: ${stripeConfig.nodeEnv || 'Not set'}`);

// Check if keys are test keys
if (stripeConfig.secretKey) {
  const isTestKey = stripeConfig.secretKey.startsWith('sk_test_');
  console.log(`   🧪 Test Mode: ${isTestKey ? '✅ Test Key' : '❌ Live Key'}`);
}

if (stripeConfig.publishableKey) {
  const isTestKey = stripeConfig.publishableKey.startsWith('pk_test_');
  console.log(`   🧪 Test Mode: ${isTestKey ? '✅ Test Key' : '❌ Live Key'}`);
}

console.log('\n🌐 Webhook Configuration:');
if (stripeConfig.nodeEnv === 'production') {
  console.log('   ✅ Production mode detected');
  console.log('   📍 Webhook URL: https://persi-academy.onrender.com/api/payment/webhook');
  console.log('   📋 Make sure this URL is configured in Stripe Dashboard');
} else {
  console.log('   ✅ Development mode detected');
  console.log('   📍 Use Stripe CLI: stripe listen --forward-to localhost:5000/api/payment/webhook');
}

console.log('\n🔍 Configuration Checklist:');
console.log(`1. ✅ Secret Key: ${stripeConfig.secretKey ? 'Set' : 'Missing'}`);
console.log(`2. ✅ Publishable Key: ${stripeConfig.publishableKey ? 'Set' : 'Missing'}`);
console.log(`3. ✅ Webhook Secret: ${stripeConfig.webhookSecret ? 'Set' : 'Missing'}`);
console.log(`4. ✅ Environment: ${stripeConfig.nodeEnv || 'Not set'}`);

const allConfigured = stripeConfig.secretKey && stripeConfig.publishableKey && stripeConfig.webhookSecret;

if (allConfigured) {
  console.log('\n✅ Stripe Configuration Complete!');
  console.log('🎯 Ready to test payments');
  console.log('\n📊 Test Cards:');
  console.log('   ✅ Success: 4242 4242 4242 4242');
  console.log('   ❌ Decline: 4000 0000 0000 0002');
  console.log('   🔐 Auth Required: 4000 0025 0000 3155');
} else {
  console.log('\n❌ Stripe Configuration Incomplete');
  console.log('🔧 Please complete the setup steps:');
  console.log('1. Get test API keys from Stripe Dashboard');
  console.log('2. Set up webhook endpoint');
  console.log('3. Configure environment variables');
  console.log('4. Deploy changes');
}

console.log('\n📋 Next Steps:');
console.log('1. Make a test purchase on your site');
console.log('2. Check Render logs for webhook processing');
console.log('3. Verify user gets course access');
console.log('4. Test receipt download functionality');
