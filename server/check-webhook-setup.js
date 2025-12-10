#!/usr/bin/env node

/**
 * Webhook Setup Verification Script
 * Run this to check if your webhook configuration is correct
 */

console.log('🔧 Checking webhook configuration...\n');

// Check environment variables
const requiredVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NODE_ENV'
];

console.log('📋 Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const maskedValue = varName.includes('SECRET') || varName.includes('KEY') 
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`   ✅ ${varName}: ${maskedValue}`);
  } else {
    console.log(`   ❌ ${varName}: Not set`);
  }
});

console.log('\n🌐 Webhook Endpoint:');
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  console.log('   ✅ Production mode detected');
  console.log('   📍 Endpoint: https://persi-academy.onrender.com/api/payment/webhook');
  console.log('   📋 Make sure this URL is configured in Stripe Dashboard');
} else {
  console.log('   ✅ Development mode detected');
  console.log('   📍 Use Stripe CLI: stripe listen --forward-to localhost:5000/api/payment/webhook');
}

console.log('\n🔍 Verification Steps:');
console.log('1. Check Stripe Dashboard → Webhooks');
console.log('2. Verify endpoint URL is correct');
console.log('3. Ensure webhook secret is copied to environment variables');
console.log('4. Test with a small purchase');
console.log('5. Check Render logs for webhook processing');

console.log('\n📊 To test webhook processing:');
console.log('1. Make a test purchase on your site');
console.log('2. Check Render logs for "Webhook received" messages');
console.log('3. Verify user gets course access');
console.log('4. Try downloading receipt');

console.log('\n🚨 Common Issues:');
console.log('- Webhook secret not set in production');
console.log('- Wrong webhook endpoint URL');
console.log('- Missing webhook events in Stripe Dashboard');
console.log('- Network issues preventing webhook delivery');

console.log('\n✅ If everything is configured correctly, webhooks should work automatically!');
