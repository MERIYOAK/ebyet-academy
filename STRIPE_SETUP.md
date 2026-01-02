# Stripe Payment Integration Setup Guide

## Overview
Your application is already configured to use **Stripe Checkout**, which redirects users to Stripe's hosted payment page on the Stripe website. This guide will help you set it up in test mode.

## How It Works
1. User clicks "Purchase" on a course or bundle
2. Backend creates a Stripe Checkout Session
3. User is redirected to Stripe's hosted payment page (on Stripe's website)
4. User completes payment on Stripe's website
5. Stripe redirects back to your success/cancel URLs
6. Webhook confirms payment and grants access

## Setup Instructions

### Step 1: Get Your Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test mode** (toggle in the top right)
3. Copy your **Secret key** (starts with `sk_test_`)
   - **Note:** You only need the Secret key for this setup
   - The Publishable key is NOT needed since we use Stripe Checkout (hosted payment page)

### Step 2: Configure Environment Variables

**Backend `.env` file** (in `server` directory):

```env
# Stripe Configuration (Test Mode)
# Only the SECRET key is needed - backend creates checkout sessions
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL (for redirects after payment)
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

**Frontend `.env` file** (in `frontend` directory):
- **No Stripe keys needed!** The frontend doesn't use Stripe directly.
- The frontend just redirects to the checkout URL provided by the backend.

### Step 3: Set Up Webhook (For Local Development)

**⚠️ Important: You CANNOT use `localhost` URLs in Stripe Dashboard!**

Stripe's servers can't reach your local machine. Instead, use **Stripe CLI** to forward webhooks:

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli
   - Windows: Download from the link above
   - Mac: `brew install stripe/stripe-cli/stripe`
   - Linux: See installation instructions on the page

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```
   This will open your browser to authenticate.

3. **Forward webhooks to your local server**:
   ```bash
   cd server
   npm run stripe:listen
   ```
   Or manually:
   ```bash
   stripe listen --forward-to localhost:5000/api/payment/webhook
   ```

4. **Copy the webhook signing secret**:
   The CLI will output something like:
   ```
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
   ```
   Copy this secret and add it to your backend `.env` file:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

5. **Keep the CLI running** while testing - it forwards webhooks from Stripe to your local server.

**Note:** You do NOT create a webhook endpoint in Stripe Dashboard for local development. The CLI handles it!

### Step 4: Set Up Webhook (For Production)

**⚠️ For Production, you need a publicly accessible URL (not localhost!)**

**For Test Mode (Development/Staging):**
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Make sure you're in **Test mode** (toggle in top right)
3. Click "Add endpoint" or "Create destination"
4. **Destination type**: Choose "Webhook endpoint"
5. **Endpoint URL**: Enter your **public URL**: `https://yourdomain.com/api/payment/webhook`
   - ❌ **NOT** `http://localhost:5000` (Stripe can't reach this!)
   - ✅ **YES** `https://yourdomain.com/api/payment/webhook` (publicly accessible)
6. **Events from**: Select "Your account"
7. **Payload style**: "Snapshot" (default)
8. **Events**: Select "Selected events" and choose:
   - `checkout.session.completed` (required)
   - `payment_intent.succeeded` (optional, for monitoring)
   - `payment_intent.payment_failed` (optional, for monitoring)
9. **Destination name**: Something like "ibyet-investing-test"
10. Click "Create" or "Add endpoint"
11. Copy the **Signing secret** (starts with `whsec_`) and add it to your `.env` file

**For Live Mode (Production):**
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Make sure you're in **Live mode** (toggle in top right)
3. Follow the same steps as above, but:
   - Use your **production URL**
   - Create a **separate endpoint** (different from test mode)
   - Copy the **NEW Signing secret** (different from test mode)

**Note:** 
- For local development: Use Stripe CLI (Step 3) - don't create a dashboard endpoint
- For production: Create endpoint in dashboard with your public URL
- Test and Live modes need separate endpoints with different secrets

### Step 5: Test the Integration

1. Start your server:
   ```bash
   cd server
   npm run dev
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Test with Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - Use any future expiry date, any CVC, and any ZIP code

4. Try purchasing a course or bundle - you should be redirected to Stripe's payment page!

## Test Mode vs Live Mode

### Test Mode (Sandbox) - For Development
- Also called "Sandbox" or "Test Environment"
- Use keys starting with `sk_test_` and `pk_test_`
- Payments are simulated, **no real charges**
- Perfect for development and testing
- Test cards work: https://stripe.com/docs/testing
- **This is what you use during development**

### Live Mode (Production) - For Real Payments
- Also called "Production Mode" or "Live Environment"
- Use keys starting with `sk_live_` and `pk_live_`
- **Real payments, real charges**
- Only switch when ready for production
- **Never use live keys during development**

### ⚠️ Important: Separate Webhooks Required

**Test mode and live mode require separate webhook configurations:**

1. **Test Mode Webhook** (for development/testing):
   - Configure in Stripe Dashboard while in **Test mode**
   - URL: `https://yourdomain.com/api/payment/webhook` (or local with Stripe CLI)
   - Signing secret starts with `whsec_`
   - Only receives events from test mode transactions

2. **Live Mode Webhook** (for production):
   - Configure in Stripe Dashboard while in **Live mode**
   - Same URL: `https://yourdomain.com/api/payment/webhook`
   - **Different** signing secret (also starts with `whsec_`)
   - Only receives events from live mode transactions

**When switching from test to live mode:**
- ✅ Update `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`
- ✅ Create a **new webhook endpoint** in Live mode
- ✅ Update `STRIPE_WEBHOOK_SECRET` with the new live mode webhook secret
- ✅ The webhook URL can be the same, but you need separate endpoints in Stripe Dashboard

**Why separate webhooks?**
- Stripe treats test and live modes as completely separate environments
- Test webhooks won't receive live payment events
- Live webhooks won't receive test payment events
- Each has its own signing secret for security

## Verification Checklist

- [ ] Stripe **secret key** is in backend `.env` file
- [ ] `STRIPE_SECRET_KEY` starts with `sk_test_` (for test mode)
- [ ] Webhook secret is configured (for production)
- [ ] `CLIENT_URL` is set correctly in backend `.env`
- [ ] Server is running and can access Stripe API
- [ ] Test payment redirects to Stripe's website
- [ ] Webhook receives events (check server logs)
- [ ] **Note:** Frontend does NOT need any Stripe keys

## Troubleshooting

### Payment doesn't redirect to Stripe
- Check that `STRIPE_SECRET_KEY` is set in `.env`
- Verify the key starts with `sk_test_` for test mode
- Check server logs for errors

### Webhook not working
- For local: Make sure `stripe listen` is running
- For production: Verify webhook URL is accessible
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Review server logs for webhook errors

### Payment succeeds but access not granted
- Check webhook is receiving `checkout.session.completed` events
- Verify webhook handler is processing events correctly
- Check database for payment records

## Security Notes

- **Never commit** `.env` file to git
- **Never share** your secret keys
- Use test keys for development
- Only use live keys in production
- Keep webhook secrets secure

## Additional Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Elements vs Checkout Guide](./STRIPE_ELEMENTS_VS_CHECKOUT.md) - Learn about embedded payment forms

