#!/usr/bin/env node

/**
 * Stripe Test API Production Setup Script
 * This script helps you set up Stripe test API for production deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Stripe Test API Production Setup\n');

console.log('📋 Step 1: Get Your Stripe Test API Keys');
console.log('1. Go to: https://dashboard.stripe.com/test/apikeys');
console.log('2. Make sure you\'re in TEST MODE (toggle in top-right)');
console.log('3. Copy your test keys:\n');

console.log('   🔑 Publishable Key (starts with pk_test_):');
console.log('   🔐 Secret Key (starts with sk_test_):\n');

console.log('📋 Step 2: Set Up Test Webhook');
console.log('1. Go to: https://dashboard.stripe.com/test/webhooks');
console.log('2. Click "Add endpoint"');
console.log('3. Set endpoint URL: https://persi-academy.onrender.com/api/payment/webhook');
console.log('4. Select these events:');
console.log('   ✅ checkout.session.completed');
console.log('   ✅ payment_intent.succeeded');
console.log('   ✅ payment_intent.payment_failed');
console.log('5. Click "Add endpoint"');
console.log('6. Copy the webhook secret (starts with whsec_)\n');

console.log('📋 Step 3: Configure Render Environment Variables');
console.log('Go to your Render dashboard → Backend service → Environment tab');
console.log('Add these variables:\n');

console.log('STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here');
console.log('STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here');
console.log('NODE_ENV=production\n');

console.log('📋 Step 4: Configure Vercel Environment Variables');
console.log('Go to your Vercel dashboard → Project → Settings → Environment Variables');
console.log('Add this variable:\n');

console.log('VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here\n');

console.log('📋 Step 5: Test Cards for Production Testing');
console.log('Use these test card numbers:\n');

console.log('✅ Success: 4242 4242 4242 4242');
console.log('❌ Decline: 4000 0000 0000 0002');
console.log('🔐 Requires Auth: 4000 0025 0000 3155\n');

console.log('Test card details:');
console.log('- Expiry: 12/34');
console.log('- CVC: 123');
console.log('- ZIP: 12345\n');

console.log('📋 Step 6: Verify Setup');
console.log('1. Deploy your changes to Render and Vercel');
console.log('2. Make a test purchase using test card 4242 4242 4242 4242');
console.log('3. Check Render logs for webhook processing');
console.log('4. Verify user gets course access');
console.log('5. Test receipt download\n');

console.log('📋 Step 7: Monitor Webhook Delivery');
console.log('In Stripe Dashboard → Webhooks, you can:');
console.log('- See webhook delivery attempts');
console.log('- View success/failure rates');
console.log('- Retry failed webhooks');
console.log('- See response times\n');

console.log('🚨 Important Notes:');
console.log('- Test API keys are safe to use in production');
console.log('- No real money will be charged');
console.log('- Perfect for testing before going live');
console.log('- When ready for real payments, switch to live API keys\n');

console.log('✅ Setup Complete!');
console.log('Your app is now configured to use Stripe test API in production.');
console.log('You can test the full payment flow without any real charges.');

// Check if environment files exist and provide guidance
const backendEnvPath = path.join(__dirname, '.env');
const frontendEnvPath = path.join(__dirname, '..', 'frontend', '.env');

console.log('\n📁 Environment Files Status:');
if (fs.existsSync(backendEnvPath)) {
  console.log('   ✅ Backend .env file exists');
} else {
  console.log('   ❌ Backend .env file missing - create one based on env.example');
}

if (fs.existsSync(frontendEnvPath)) {
  console.log('   ✅ Frontend .env file exists');
} else {
  console.log('   ❌ Frontend .env file missing - create one based on env.example');
}

console.log('\n🎯 Next Steps:');
console.log('1. Update your environment variables in Render and Vercel');
console.log('2. Deploy your changes');
console.log('3. Test the payment flow');
console.log('4. Monitor webhook delivery in Stripe Dashboard');
