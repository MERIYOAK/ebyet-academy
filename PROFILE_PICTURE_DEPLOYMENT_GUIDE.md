# Profile Picture System Deployment Guide

## 🎯 Overview

This guide covers the deployment of the improved profile picture handling system that now supports both development and production environments with automatic S3 region detection.

## 🔧 Key Improvements

### ✅ **Environment-Based Configuration**
- **Development**: `persi-edu-platform` bucket in `us-east-1`
- **Production**: `persi-educational-storage` bucket in `ca-central-1`
- Automatic bucket and region detection from environment variables

### ✅ **Enhanced Google OAuth Integration**
- Google profile photos are automatically downloaded and uploaded to S3
- Improved error handling and logging
- Graceful fallback if photo upload fails

### ✅ **Robust Profile Photo Management**
- Upload, update, and delete functionality
- Automatic old photo cleanup when updating
- Comprehensive validation and security checks

### ✅ **Automatic Region Detection**
- Handles `PermanentRedirect` errors automatically
- Retries operations with correct region
- No manual configuration needed

## 🌍 Environment Variables

### **Required Variables (Legacy AWS Format)**

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# S3 Configuration (Primary - Legacy AWS Format)
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=your_bucket_region
```

### **Optional Variables (New Format - Fallbacks)**

```bash
# New S3 Configuration (fallback)
S3_BUCKET=your_bucket_name
S3_REGION=your_bucket_region
```

## 🚀 Deployment Steps

### **1. Development Environment**

```bash
# .env file
NODE_ENV=development
AWS_ACCESS_KEY_ID=your_dev_access_key
AWS_SECRET_ACCESS_KEY=your_dev_secret_key
AWS_S3_BUCKET=persi-edu-platform
AWS_REGION=us-east-1
```

### **2. Production Environment (Render)**

```bash
# Render Environment Variables
NODE_ENV=production
AWS_ACCESS_KEY_ID=your_prod_access_key
AWS_SECRET_ACCESS_KEY=your_prod_secret_key
AWS_S3_BUCKET=persi-educational-storage
AWS_REGION=ca-central-1
```

### **3. Local Testing**

```bash
# Test the configuration
node test-profile-picture-complete.js
```

## 📋 Configuration Checklist

### **Development Setup**
- [ ] AWS credentials configured
- [ ] `AWS_S3_BUCKET=persi-edu-platform`
- [ ] `AWS_REGION=us-east-1`
- [ ] Test script passes

### **Production Setup**
- [ ] AWS credentials configured
- [ ] `AWS_S3_BUCKET=persi-educational-storage`
- [ ] `AWS_REGION=ca-central-1`
- [ ] Render environment variables set
- [ ] Deployment successful

## 🔍 Testing

### **Run Comprehensive Test**
```bash
node test-profile-picture-complete.js
```

### **Expected Output**
```
🧪 Testing Complete Profile Picture System

1️⃣ Testing S3 Configuration...
✅ S3 is properly configured

2️⃣ Testing Bucket Region Detection...
✅ Bucket region detected: us-east-1 (dev) / ca-central-1 (prod)

3️⃣ Testing Profile Photo Validation...
✅ Profile photo validation works correctly

...

🎉 Profile Picture System Test Complete!
```

## 🛠️ API Endpoints

### **Profile Photo Management**

```bash
# Update profile with photo
PUT /api/auth/profile
Content-Type: multipart/form-data
Authorization: Bearer <token>
Body: { profilePhoto: file, name?: string, email?: string }

# Delete profile photo
DELETE /api/users/me/photo
Authorization: Bearer <token>

# Get profile photo URL
GET /api/users/me/photo
Authorization: Bearer <token>
```

### **Google OAuth Integration**

```bash
# Google OAuth login
GET /api/auth/google

# Google OAuth callback
GET /api/auth/google/callback
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. S3 Not Configured**
```
⚠️  S3 client not initialized - missing AWS credentials
```
**Solution**: Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

#### **2. Bucket Not Found**
```
❌ Bucket region detection failed
```
**Solution**: Verify `AWS_S3_BUCKET` and `AWS_REGION` are correct

#### **3. PermanentRedirect Error**
```
Code: 'PermanentRedirect'
```
**Solution**: The system now handles this automatically with region detection

#### **4. Google Photo Upload Fails**
```
❌ Failed to upload Google profile photo
```
**Solution**: Check S3 permissions and network connectivity

### **Debug Commands**

```bash
# Check S3 configuration
node -e "console.log(require('./services/s3Service').getConfigurationStatus())"

# Test region detection
node -e "require('./services/s3Service').detectBucketRegion().then(r => console.log('Region:', r))"

# Check environment variables
node -e "console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET); console.log('AWS_REGION:', process.env.AWS_REGION)"
```

## 📊 Monitoring

### **Log Messages to Watch**

#### **Successful Operations**
```
✅ S3 client initialized with bucket: persi-edu-platform, region: us-east-1
✅ Bucket region confirmed: us-east-1
✅ Profile photo uploaded successfully: profile-pictures/user123-abc123.jpg
✅ Google profile photo uploaded successfully: profile-pictures/user123-google-def456.jpg
```

#### **Warning Messages**
```
⚠️  S3 not configured - skipping profile photo update
⚠️  Google profile photo upload returned null
```

#### **Error Messages**
```
❌ Failed to upload profile photo
❌ Bucket region detection failed
❌ Profile photo validation failed
```

## 🔒 Security Considerations

### **File Validation**
- Only image files allowed (JPEG, PNG, GIF, WebP)
- Maximum file size: 5MB
- Content type validation
- File extension validation

### **S3 Security**
- Private ACL for all uploaded files
- Signed URLs for secure access
- User-specific file naming
- Metadata tracking

### **Error Handling**
- Graceful degradation when S3 is unavailable
- No sensitive information in error messages
- Comprehensive logging for debugging

## 🚀 Deployment Verification

### **1. Check Configuration**
```bash
node test-profile-picture-complete.js
```

### **2. Test Google OAuth**
1. Register with Google
2. Verify profile photo is uploaded to S3
3. Check database for `profilePhotoKey`

### **3. Test Profile Photo Update**
1. Upload new profile photo
2. Verify old photo is deleted from S3
3. Verify new photo is uploaded
4. Check database is updated

### **4. Test Profile Photo Deletion**
1. Delete profile photo
2. Verify photo is removed from S3
3. Verify database `profilePhotoKey` is null

## 📝 Changelog

### **v2.0.0 - Profile Picture System Overhaul**
- ✅ Environment-based S3 configuration
- ✅ Automatic region detection
- ✅ Enhanced Google OAuth integration
- ✅ Improved error handling and logging
- ✅ Comprehensive validation
- ✅ Production-ready deployment

### **Previous Issues Fixed**
- ❌ Hardcoded bucket names
- ❌ Manual region configuration
- ❌ Google photo upload failures
- ❌ Poor error handling
- ❌ Missing validation

## 🎉 Success Criteria

The deployment is successful when:

1. ✅ **Development**: Profile photos work with `persi-edu-platform` bucket
2. ✅ **Production**: Profile photos work with `persi-educational-storage` bucket
3. ✅ **Google OAuth**: Profile photos are automatically uploaded
4. ✅ **Profile Updates**: Old photos are deleted, new ones uploaded
5. ✅ **Profile Deletion**: Photos are removed from S3 and database
6. ✅ **Error Handling**: Graceful degradation when S3 is unavailable
7. ✅ **Validation**: Only valid image files are accepted
8. ✅ **Security**: All files are private with signed URLs

---

**Need Help?** Check the troubleshooting section or run the test script for diagnostics.
