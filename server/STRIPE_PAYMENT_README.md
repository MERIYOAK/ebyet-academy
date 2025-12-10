# Stripe Payment Integration Guide

This guide explains how to set up and use the Stripe payment system for your educational platform.

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and configure your Stripe keys:

```bash
cp env.example .env
```

Edit `.env` and add your Stripe test keys:

```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
CLIENT_URL=http://localhost:5173
```

### 2. Get Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. Replace the placeholder values in your `.env` file

### 3. Set Up Webhooks (Development)

Install Stripe CLI and forward webhooks to your local server:

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:5000/api/payment/webhook
```

Copy the webhook secret from the CLI output to your `.env` file.

## 🔧 API Endpoints

### Create Checkout Session
```http
POST /api/payments/create-checkout-session
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "courseId": "course_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

### Check Purchase Status
```http
GET /api/payments/check-purchase/:courseId
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "hasPurchased": true,
  "courseId": "course_id_here"
}
```

### Webhook Endpoint
```http
POST /api/payment/webhook
Content-Type: application/json
Stripe-Signature: t=timestamp,v1=signature
```

## 🧪 Testing

### Test Card Numbers

Use these test card numbers in Stripe Checkout:

| Card Number | Description | Expected Result |
|-------------|-------------|-----------------|
| `4242 4242 4242 4242` | Visa (success) | ✅ Payment succeeds |
| `4000 0000 0000 0002` | Visa (declined) | ❌ Payment declined |
| `4000 0025 0000 3155` | Visa (requires auth) | 🔐 Requires 3D Secure |

**Test Card Details:**
- **Expiry:** 12/34
- **CVC:** 123
- **ZIP:** 12345

### Testing Flow

1. **Start your servers:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   
   # Terminal 3: Stripe webhooks
   stripe listen --forward-to localhost:5000/api/payment/webhook
   ```

2. **Test a purchase:**
   - Go to `http://localhost:5173/courses`
   - Click "Buy Now" on any course
   - Use test card `4242 4242 4242 4242`
   - Complete the payment
   - Verify course access is granted

## 🔄 Payment Flow

### 1. User Clicks "Buy"
- Frontend calls `/api/payments/create-checkout-session`
- Backend creates Stripe Checkout Session
- User is redirected to Stripe Checkout

### 2. Payment Processing
- User enters payment details on Stripe
- Stripe processes the payment
- Stripe sends webhook to your server

### 3. Webhook Processing
- Server verifies webhook signature
- On `checkout.session.completed`:
  - Extracts `courseId` and `userId` from metadata
  - Adds course to user's `purchasedCourses` array
  - Grants access to the course

### 4. Success/Cancel
- User is redirected to success or cancel page
- Frontend updates UI to show purchased status

## 🛡️ Security Features

### Webhook Verification
- All webhooks are verified using Stripe signatures
- Prevents replay attacks and unauthorized requests

### Authentication
- All payment endpoints require JWT authentication
- User can only purchase courses for themselves

### Metadata Validation
- Course and user IDs are validated before processing
- Prevents invalid purchases

## 🐛 Development Mode

If Stripe is not configured (`STRIPE_SECRET_KEY` is missing):

1. **Checkout sessions** are simulated
2. **Payments** are automatically marked as successful
3. **Course access** is granted immediately
4. **Webhooks** are bypassed

This allows development without Stripe configuration.

## 📊 Monitoring

### Console Logs
The system provides detailed console logging:

```
🔧 Creating checkout session...
   - User ID: 507f1f77bcf86cd799439011
   - Course: JavaScript Fundamentals ($49.99)
✅ Stripe session created: cs_test_...
🔧 Webhook received...
✅ Webhook verified: checkout.session.completed
✅ Course access granted successfully
```

### Error Handling
- Invalid course IDs return 404
- Duplicate purchases return 400
- Authentication failures return 401
- Server errors return 500

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes (for production) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature secret | Yes (for production) |
| `CLIENT_URL` | Frontend URL | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |

### Optional Features

- **Email confirmations:** Uncomment in webhook handler
- **Transaction logging:** Add Transaction model
- **Enhanced security:** Add additional security measures
- **Subscription support:** Modify for recurring payments

## 🚀 Production Deployment

### 1. Update Environment
```env
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://yourdomain.com
```

### 2. Set Up Production Webhooks
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/payment/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret to environment

### 3. SSL Certificate
Ensure your domain has a valid SSL certificate for webhook security.

## 📝 Troubleshooting

### Common Issues

**Webhook not receiving events:**
- Check webhook endpoint URL
- Verify webhook secret
- Check server logs for errors

**Payment not completing:**
- Verify Stripe keys are correct
- Check browser console for errors
- Ensure user is authenticated

**Course access not granted:**
- Check webhook processing logs
- Verify course and user IDs
- Check MongoDB connection

### Debug Mode
Set `DEBUG=true` in your `.env` for detailed logging.

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

## 🤝 Support

For issues with this integration:
1. Check the console logs
2. Verify your Stripe configuration
3. Test with the provided test cards
4. Review the webhook setup

---

**Note:** This implementation is for **test mode only**. For production, ensure you're using live Stripe keys and proper security measures. 