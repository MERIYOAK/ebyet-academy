# Webhook Troubleshooting Guide

## Current Issue: Webhook Signature Verification Failed

### Error Analysis
- **Error**: `No webhook payload was provided`
- **Status**: Webhook failing in Stripe Dashboard
- **Result**: Payment records not created, receipt download fails

## Step-by-Step Fix

### 1. Check Environment Variables in Render

Go to your Render dashboard → Backend service → Environment tab and verify:

```
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here
NODE_ENV=production
```

### 2. Verify Webhook Configuration in Stripe Dashboard

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Check your webhook endpoint:
   - **URL**: `https://persi-academy.onrender.com/api/payment/webhook`
   - **Events**: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - **Status**: Should show recent delivery attempts

### 3. Test Webhook Endpoint

Run this test to verify your endpoint:

```bash
node server/test-webhook-endpoint.js
```

### 4. Check Render Logs

After making a test purchase, check Render logs for:

```
🔧 Webhook received...
   - Headers: {...}
   - Body length: [number]
   - Body type: [string/buffer]
   - NODE_ENV: production
   - STRIPE_SECRET_KEY: Set
   - STRIPE_WEBHOOK_SECRET: Set
```

### 5. Common Issues and Solutions

#### Issue 1: "No webhook payload was provided"
**Cause**: Raw body not being processed correctly
**Solution**: Verify `express.raw()` middleware is configured

#### Issue 2: "Webhook signature verification failed"
**Cause**: Wrong webhook secret or missing signature header
**Solution**: 
1. Copy webhook secret from Stripe Dashboard
2. Update Render environment variables
3. Redeploy backend

#### Issue 3: Webhook not being sent
**Cause**: Wrong webhook URL or CORS issues
**Solution**:
1. Verify webhook URL in Stripe Dashboard
2. Check CORS configuration in server.js

### 6. Manual Test Process

1. **Make a test purchase** using card: `4242 4242 4242 4242`
2. **Check Render logs** for webhook processing
3. **Verify payment record** was created
4. **Test receipt download**

### 7. Expected Log Flow

```
🔧 Webhook received...
🔧 Calling verifyWebhook function...
🔧 Verifying Stripe webhook signature...
✅ Webhook verified: checkout.session.completed
🔧 Processing checkout session completion...
✅ Course access granted successfully
```

### 8. If Webhook Still Fails

1. **Check webhook secret** - Copy fresh from Stripe Dashboard
2. **Redeploy backend** - Environment variables need redeployment
3. **Test with Stripe CLI** - Use `stripe listen` for local testing
4. **Check network** - Ensure Render can receive webhooks

### 9. Fallback Solution

If webhook continues to fail, implement a fallback:
1. Add manual payment verification
2. Create payment records on successful checkout
3. Allow receipt download without webhook

## Quick Fix Checklist

- [ ] STRIPE_WEBHOOK_SECRET set in Render
- [ ] Webhook URL correct in Stripe Dashboard
- [ ] Correct events selected (3 events)
- [ ] Backend redeployed after env changes
- [ ] Test purchase made with test card
- [ ] Render logs checked for webhook processing
- [ ] Payment record created in database
- [ ] Receipt download working
