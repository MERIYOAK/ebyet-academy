# Environment Configuration Guide

This document explains how to configure environment variables to remove hardcoded URLs from the codebase.

## Overview

The application has been updated to use environment variables instead of hardcoded URLs. This makes the application more flexible and easier to deploy across different environments (development, staging, production).

## Frontend Configuration

### Environment Variables

Create a `.env` file in the `frontend/` directory with the following variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000

# Frontend Configuration
VITE_FRONTEND_URL=http://localhost:5173

# App Configuration
VITE_APP_NAME=QENDIEL Academy
VITE_APP_DESCRIPTION=Professional Skills Development

# S3 Configuration
VITE_S3_BUCKET_URL=https://persi-edu-platform.s3.us-east-1.amazonaws.com
VITE_S3_IMAGE_PATH=/persi-academy/Ig-images/ig-image.jpeg

# Third Party Services
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Environment Configuration File

The frontend uses a centralized configuration file at `frontend/src/config/environment.ts` that:

- Loads environment variables with fallbacks
- Provides helper functions for building URLs
- Centralizes API endpoints
- Handles different environments (development/production)

### Usage in Components

Instead of hardcoded URLs, use the environment configuration:

```typescript
// ❌ Old way (hardcoded)
const response = await fetch('http://localhost:5000/api/courses');

// ✅ New way (environment-based)
import { buildApiUrl } from '../config/environment';
const response = await fetch(buildApiUrl('/api/courses'));

// ✅ Or use the ApiClient utility
import { ApiClient } from '../utils/api';
const courses = await ApiClient.get('/api/courses');
```

## Backend Configuration

### Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```env
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
# MONGODB CONFIGURATION
# =============================================================================
MONGODB_URI=mongodb://localhost:27017/persi-academy

# =============================================================================
# STRIPE PAYMENT CONFIGURATION
# =============================================================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

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
# EMAIL CONFIGURATION
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_FROM=your_email@gmail.com

# =============================================================================
# AWS S3 CONFIGURATION
# =============================================================================
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=persi-edu-platform

# =============================================================================
# GOOGLE OAUTH CONFIGURATION
# =============================================================================
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## HTML Template Variables

The `frontend/index.html` file uses template variables that are replaced during the build process:

```html
<!-- These will be replaced with actual values during build -->
<title>%VITE_APP_NAME% - %VITE_APP_DESCRIPTION%</title>
<meta property="og:url" content="%VITE_FRONTEND_URL%" />
<meta property="og:image" content="%VITE_S3_BUCKET_URL%%VITE_S3_IMAGE_PATH%" />
<link rel="icon" href="%VITE_API_BASE_URL%/favicon.svg" />
```

## Vite Configuration

The `frontend/vite.config.ts` includes a custom plugin that replaces template variables in HTML:

```typescript
const htmlEnvPlugin = () => {
  return {
    name: 'html-env-replace',
    transformIndexHtml(html: string) {
      return html.replace(/%VITE_([^%]+)%/g, (match, envVar) => {
        const value = import.meta.env[`VITE_${envVar}`]
        return value || match
      })
    }
  }
}
```

## API Client Utility

A centralized API client utility is available at `frontend/src/utils/api.ts`:

```typescript
import { ApiClient } from '../utils/api';

// GET request
const courses = await ApiClient.get('/api/courses');

// POST request
const newCourse = await ApiClient.post('/api/courses', courseData);

// File upload
const formData = new FormData();
formData.append('file', file);
const uploadResult = await ApiClient.upload('/api/videos/upload', formData);
```

## Migration Checklist

### Frontend Files Updated

- [x] `frontend/index.html` - Template variables for meta tags
- [x] `frontend/src/config/environment.ts` - Centralized configuration
- [x] `frontend/src/utils/api.ts` - API client utility
- [x] `frontend/vite.config.ts` - Build configuration with HTML plugin
- [x] `frontend/env.example` - Environment variables example

### Backend Files Updated

- [x] `server/server.js` - CORS and URL configuration
- [x] `server/env.example` - Environment variables example
- [x] `server/services/emailService.js` - Email service URLs
- [x] `server/controllers/paymentController.js` - Payment redirect URLs
- [x] `server/controllers/certificateController.js` - Certificate URLs

### Files Still Need Migration

The following files still contain hardcoded URLs and need to be updated:

#### Frontend Files
- [ ] `frontend/src/pages/HomePage.tsx`
- [ ] `frontend/src/pages/LoginPage.tsx`
- [ ] `frontend/src/pages/RegisterPage.tsx`
- [ ] `frontend/src/pages/DashboardPage.tsx`
- [ ] `frontend/src/pages/CoursesPage.tsx`
- [ ] `frontend/src/pages/CourseDetailPage.tsx`
- [ ] `frontend/src/pages/VideoPlayerPage.tsx`
- [ ] `frontend/src/pages/ProfilePage.tsx`
- [ ] `frontend/src/pages/VerifyEmailPage.tsx`
- [ ] `frontend/src/pages/ResetPasswordPage.tsx`
- [ ] `frontend/src/pages/ResendVerificationPage.tsx`
- [ ] `frontend/src/pages/GoogleCallbackPage.tsx`
- [ ] `frontend/src/pages/CertificatesPage.tsx`
- [ ] `frontend/src/pages/CertificateVerificationPage.tsx`
- [ ] `frontend/src/pages/AdminLoginPage.tsx`
- [ ] `frontend/src/pages/AdminDashboardPage.tsx`
- [ ] `frontend/src/pages/AdminCoursesPage.tsx`
- [ ] `frontend/src/pages/AdminCourseViewPage.tsx`
- [ ] `frontend/src/pages/AdminCourseEditPage.tsx`
- [ ] `frontend/src/pages/AdminCourseVideosPage.tsx`
- [ ] `frontend/src/pages/AdminVideoPlayerPage.tsx`
- [ ] `frontend/src/pages/AdminVideoUploadPage.tsx`
- [ ] `frontend/src/pages/AdminUploadPage.tsx`
- [ ] `frontend/src/pages/AdminUsersPage.tsx`
- [ ] `frontend/src/pages/AdminAnalyticsPage.tsx`
- [ ] `frontend/src/contexts/AdminAuthContext.tsx`
- [ ] `frontend/src/components/nav/UserNavbar.tsx`
- [ ] `frontend/src/hooks/useCourseDeletion.ts`
- [ ] `frontend/src/services/progressService.ts`

#### Backend Files
- [ ] `server/utils/stripe.js`
- [ ] `server/debug-email-auth.js`

## Deployment Instructions

### Development

1. Copy `frontend/env.example` to `frontend/.env`
2. Copy `server/env.example` to `server/.env`
3. Update the values in both `.env` files
4. Start the development servers

### Production

1. Set environment variables in your hosting platform
2. Ensure all URLs point to production domains
3. Update CORS settings for production domains
4. Configure SSL certificates for HTTPS

### Environment-Specific Configurations

#### Development
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

#### Staging
```env
VITE_API_BASE_URL=https://api-staging.yourapp.com
VITE_FRONTEND_URL=https://staging.yourapp.com
NODE_ENV=staging
```

#### Production
```env
VITE_API_BASE_URL=https://api.yourapp.com
VITE_FRONTEND_URL=https://yourapp.com
NODE_ENV=production
```

## Benefits

1. **Flexibility**: Easy to deploy to different environments
2. **Security**: No hardcoded credentials or URLs in code
3. **Maintainability**: Centralized configuration management
4. **Scalability**: Easy to add new environments
5. **Best Practices**: Follows 12-factor app principles

## Troubleshooting

### Common Issues

1. **Environment variables not loading**: Ensure `.env` files are in the correct directories
2. **CORS errors**: Check that `FRONTEND_URL` is correctly set in backend
3. **Build errors**: Verify all template variables in HTML are properly formatted
4. **API calls failing**: Check that `VITE_API_BASE_URL` is correctly set

### Debug Commands

```bash
# Check environment variables in frontend
cd frontend && npm run dev

# Check environment variables in backend
cd server && node -e "console.log(process.env)"

# Build frontend with environment check
cd frontend && npm run build
```

## Next Steps

1. Update all remaining files with hardcoded URLs
2. Test the application in different environments
3. Update deployment scripts to use environment variables
4. Add environment validation on startup
5. Create environment-specific configuration files
