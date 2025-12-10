# Domain Update Summary for www.qendiel.com

## Overview
This document summarizes all the changes made to update the codebase from the old domain references to the new domain `www.qendiel.com`.

## Changes Made

### 1. Frontend Environment Configuration
- **File**: `frontend/env.production.example`
- **Change**: Updated `VITE_FRONTEND_URL` from `https://qendielacademy.vercel.app` to `https://www.qendiel.com`

### 2. Backend CORS Configuration
- **File**: `server/server.js`
- **Change**: Added new CORS origins:
  - `https://www.qendiel.com` (Production domain with www)
  - `https://qendiel.com` (Production domain without www)
  - Kept existing domains for backward compatibility

### 3. Email Address Updates
All email addresses have been updated to use the new domain:

#### Contact Page
- **File**: `frontend/src/pages/ContactPage.tsx`
- **Changes**:
  - `support@qendielacademy.com` → `support@qendiel.com`
  - `info@qendielacademy.com` → `info@qendiel.com`

#### Admin Settings
- **File**: `frontend/src/pages/AdminSettingsPage.tsx`
- **Changes**:
  - `contact@qendielacademy.com` → `contact@qendiel.com`
  - `support@qendielacademy.com` → `support@qendiel.com`
  - `noreply@qendielacademy.com` → `noreply@qendiel.com`

#### Privacy Policy
- **File**: `frontend/src/pages/PrivacyPolicyPage.tsx`
- **Changes**:
  - `privacy@qendielacademy.com` → `privacy@qendiel.com`
  - `dpo@qendielacademy.com` → `dpo@qendiel.com`

#### Main HTML
- **File**: `frontend/index.html`
- **Change**: `support@qendielacademy.com` → `support@qendiel.com`

### 4. Documentation Updates
- **File**: `BRANDING_UPDATE_SUMMARY.md`
- **Changes**: Updated all domain references and email addresses to reflect new domain

## Important Notes

### DNS Configuration Required
Before deploying, ensure you have:
1. **DNS Records**: Point `www.qendiel.com` and `qendiel.com` to your hosting provider
2. **SSL Certificate**: Obtain SSL certificate for both domains
3. **Hosting Setup**: Configure your hosting provider to serve the application

### S3 Bucket Configuration
Your production S3 configuration has been updated:
- **Production Bucket**: `persi-educational-storage` (ca-central-1)
- **Development Bucket**: `persi-edu-platform` (us-east-1)
- **Region**: Canada Central (ca-central-1)
- **URL**: `https://persi-educational-storage.s3.ca-central-1.amazonaws.com`

### Environment Variables
When deploying to production, make sure to set:
```bash
VITE_FRONTEND_URL=https://www.qendiel.com
FRONTEND_URL=https://www.qendiel.com
CLIENT_URL=https://www.qendiel.com
```

### Email Configuration
If you want to use the new email addresses, ensure:
1. **Email Service**: Set up email service for `@qendiel.com` domain
2. **SMTP Configuration**: Update backend SMTP settings if using custom email service
3. **Email Verification**: Test all email functionality with new addresses

## Files Modified
1. `frontend/env.production.example`
2. `server/server.js`
3. `frontend/src/pages/ContactPage.tsx`
4. `frontend/src/pages/AdminSettingsPage.tsx`
5. `frontend/src/pages/PrivacyPolicyPage.tsx`
6. `frontend/index.html`
7. `BRANDING_UPDATE_SUMMARY.md`

## Next Steps
1. **Deploy Changes**: Deploy the updated codebase
2. **Test Functionality**: Verify all features work with new domain
3. **Update External Services**: Update any external service configurations
4. **Monitor**: Watch for any issues related to domain changes

## Rollback Plan
If issues arise, you can:
1. Revert to previous domain references
2. Keep both domains in CORS configuration temporarily
3. Use environment variables to control domain usage

---
*Last Updated: $(date)*
*Domain: www.qendiel.com*
