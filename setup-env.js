#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment files...\n');

// Frontend environment file
const frontendEnvContent = `# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_APP_NAME=QENDIEL Academy
VITE_APP_DESCRIPTION=Professional Skills Development
VITE_S3_BUCKET_URL=https://persi-edu-platform.s3.us-east-1.amazonaws.com
VITE_S3_IMAGE_PATH=/persi-academy/Ig-images/ig-image.jpeg
VITE_S3_BUCKET_URL_DOMAIN=persi-edu-platform.s3.us-east-1.amazonaws.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
`;

// Backend environment file
const backendEnvContent = `# =============================================================================
# MONGODB CONFIGURATION
# =============================================================================
MONGODB_URI=mongodb://localhost:27017/persi-academy

# =============================================================================
# STRIPE PAYMENT CONFIGURATION (TEST MODE)
# =============================================================================
# Get these from your Stripe Dashboard: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# =============================================================================
# CLIENT URL CONFIGURATION
# =============================================================================
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000

# =============================================================================
# APP CONFIGURATION
# =============================================================================
APP_NAME=QENDIEL Academy
APP_DESCRIPTION=Professional Skills Development
APP_VERSION=1.0.0

# =============================================================================
# S3 BUCKET CONFIGURATION
# =============================================================================
S3_BUCKET_URL=https://persi-edu-platform.s3.us-east-1.amazonaws.com
S3_IMAGE_PATH=/persi-academy/Ig-images/ig-image.jpeg

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
PORT=5000
NODE_ENV=development

# =============================================================================
# JWT CONFIGURATION
# =============================================================================
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# =============================================================================
# SESSION CONFIGURATION
# =============================================================================
SESSION_SECRET=your_session_secret_here

# =============================================================================
# EMAIL CONFIGURATION (OPTIONAL)
# =============================================================================
# For Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM=your_email@gmail.com

# =============================================================================
# AWS S3 CONFIGURATION (OPTIONAL)
# =============================================================================
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=persi-edu-platform

# =============================================================================
# GOOGLE OAUTH CONFIGURATION (OPTIONAL)
# =============================================================================
# Get these from Google Cloud Console: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# =============================================================================
# DEVELOPMENT SETTINGS
# =============================================================================
# Set to true to enable detailed logging
DEBUG=true
`;

try {
  // Create frontend .env file
  const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('✅ Created frontend/.env');

  // Create backend .env file
  const backendEnvPath = path.join(__dirname, 'server', '.env');
  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log('✅ Created server/.env');

  console.log('\n🎉 Environment files created successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Update the values in both .env files with your actual credentials');
  console.log('2. Start MongoDB if you haven\'t already');
  console.log('3. Start the backend server: cd server && npm start');
  console.log('4. Start the frontend: cd frontend && npm run dev');
  console.log('\n⚠️  Note: Make sure to update the JWT_SECRET and other sensitive values before production!');

} catch (error) {
  console.error('❌ Error creating environment files:', error.message);
  console.log('\n📝 Manual setup:');
  console.log('1. Copy frontend/env.example to frontend/.env');
  console.log('2. Copy server/env.example to server/.env');
  console.log('3. Update the values in both files');
}
