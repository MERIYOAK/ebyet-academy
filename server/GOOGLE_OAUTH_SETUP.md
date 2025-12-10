# 🔐 Google OAuth Setup Guide

## Overview
This guide will help you set up Google OAuth authentication for your QENDIEL Academy Platform.

## 📋 Prerequisites
- A Google account
- Access to Google Cloud Console

## 🚀 Step-by-Step Setup

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create a New Project
1. Click the project dropdown at the top of the page
2. Click "New Project"
3. Enter project name: `QENDIEL Academy Platform`
4. Click "Create"

### Step 3: Enable Required APIs
1. In the left sidebar, click "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Google+ API** (or Google Identity API)
   - **Google Identity and Access Management (IAM) API**

### Step 4: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - **App name**: `QENDIEL Academy Platform`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click "Save and Continue"
5. Skip the scopes section, click "Save and Continue"
6. Add test users if needed, click "Save and Continue"
7. Click "Back to Dashboard"

### Step 5: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth client:
   - **Application type**: Web application
   - **Name**: `QENDIEL Academy Platform Web Client`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     http://localhost:3000
     http://localhost:4173
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:5000/api/auth/google/callback
     ```
4. Click "Create"

### Step 6: Copy Your Credentials
After creation, you'll see:
- **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

**⚠️ Important**: Save these credentials securely!

## 🔧 Environment Configuration

### Create .env File
Create a `.env` file in your `server` directory with:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/persi-academy
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (add these after getting credentials)
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here

# Optional
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
SESSION_SECRET=your-session-secret-key
```

## 🧪 Testing Your Setup

### 1. Start the Server
```bash
cd server
npm start
```

### 2. Check Health Endpoint
Visit: `http://localhost:5000/api/auth/health`

You should see:
```json
{
  "success": true,
  "message": "Authentication service is running",
  "features": {
    "localAuth": true,
    "googleOAuth": true,
    "profilePhotos": false,
    "jwtAuth": true
  }
}
```

### 3. Test Google OAuth
1. Visit: `http://localhost:5000/api/auth/google`
2. You should be redirected to Google's login page
3. After login, you'll be redirected back to your app

## 🔒 Security Best Practices

### 1. Keep Credentials Secure
- Never commit `.env` files to version control
- Use different credentials for development and production
- Rotate credentials regularly

### 2. Production Setup
For production, update your OAuth client with:
- **Authorized JavaScript origins**:
  ```
  https://yourdomain.com
  ```
- **Authorized redirect URIs**:
  ```
  https://yourdomain.com/api/auth/google/callback
  ```

### 3. Environment Variables
In production, set these environment variables:
```env
NODE_ENV=production
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "OAuth2Strategy requires a clientID option"
- Check that `GOOGLE_CLIENT_ID` is set in your `.env` file
- Restart the server after adding credentials

#### 2. "redirect_uri_mismatch" Error
- Verify the redirect URI in Google Cloud Console matches your callback URL
- Check that `BACKEND_URL` is set correctly

#### 3. "invalid_client" Error
- Verify your Client ID and Client Secret are correct
- Check that the OAuth consent screen is configured

#### 4. "access_denied" Error
- Make sure you're using the correct Google account
- Check that the app is not in restricted mode

### Debug Mode
Enable debug logging:
```env
DEBUG=passport:*
NODE_ENV=development
```

## 📞 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Google Cloud Console settings match your configuration
4. Test with the health endpoint first

## 🎉 Success!

Once configured, users will be able to:
- Click "Sign in with Google" on your login page
- Authenticate with their Google account
- Access your platform seamlessly

The authentication system will automatically:
- Create new users for first-time Google logins
- Link existing accounts if the email matches
- Download and store profile photos from Google
- Generate JWT tokens for session management 