# Stripe Test API Setup for Production

## 1. Get Test API Keys from Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **TEST MODE** (toggle in top-right corner)
3. Copy these keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

## 2. Set Up Test Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://persi-academy.onrender.com/api/payment/webhook`
4. Select these events:
   - `checkout.session.completed` ✅
   - `payment_intent.succeeded` ✅
   - `payment_intent.payment_failed` ✅
5. Click "Add endpoint"
6. **Copy the webhook secret** (starts with `whsec_`)

## 3. Configure Render Environment Variables

Add these to your Render backend environment variables:

```
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret_here
NODE_ENV=production
```

## 4. Update Frontend Environment Variables

Add to your Vercel frontend environment variables:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key_here
```

## 5. Test Cards for Production Testing

Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Test card details:
- Expiry: `12/34`
- CVC: `123`
- ZIP: `12345`

## 6. Verify Setup

1. Deploy your changes
2. Make a test purchase using test card
3. Check Render logs for webhook processing
4. Verify user gets course access
5. Test receipt download

## 7. Switch to Live Mode Later

When ready for real payments:
1. Get live API keys from Stripe Dashboard
2. Update environment variables
3. Set up live webhook endpoint
4. Test with small real payment
