# 🔐 Enhanced Authentication System Documentation

## Overview

This document describes the enhanced user authentication system for the QENDIEL Academy Platform, featuring email verification for manual registration while maintaining seamless Google OAuth integration.

## 🆕 New Features

### Email Verification System
- ✅ **Manual Registration** requires email verification
- ✅ **Google OAuth** users skip email verification (automatically verified)
- ✅ **Verification Tokens** with 1-hour expiry
- ✅ **Resend Verification** functionality
- ✅ **Automatic Login** after successful verification

### Enhanced Security
- ✅ **Profile Photo Storage** in private S3 bucket (`persi-educational-storage/persi-academy/profile-pictures/` folder)
- ✅ **Signed URLs** for secure photo access
- ✅ **JWT Tokens** for both verification and authentication
- ✅ **Password Hashing** with bcrypt

## 🏗️ Architecture

### User Registration Flow

#### Manual Registration (Email/Password)
```
1. User submits registration form with profile photo
2. System validates input and uploads photo to S3 (persi-educational-storage/persi-academy/profile-pictures/ folder)
3. User record created with isVerified: false
4. Verification token generated (1-hour expiry)
5. Verification email sent to user
6. User clicks verification link
7. Token verified and user marked as verified
8. User automatically logged in with auth token
```

#### Google OAuth Registration
```
1. User clicks "Sign in with Google"
2. Google OAuth flow completed
3. User record created/updated with isVerified: true
4. Google profile photo downloaded and stored in S3 (persi-educational-storage/persi-academy/profile-pictures/ folder)
5. User automatically logged in with auth token
```

## 📋 API Endpoints

### Registration & Verification

#### Register User (Manual)
```http
POST /api/auth/register
Content-Type: multipart/form-data

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "profilePhoto": [file] // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authProvider": "local",
      "profilePhotoKey": "persi-academy/profile-pictures/user_id_hash.jpg",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "verificationRequired": true,
    "emailSent": true
  }
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "jwt_verification_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully! You are now logged in.",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authProvider": "local",
      "profilePhotoKey": "persi-academy/profile-pictures/user_id_hash.jpg",
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_auth_token"
  }
}
```

#### Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent! Please check your inbox.",
  "data": {
    "emailSent": true
  }
}
```

### Login (Updated)

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authProvider": "local",
      "profilePhotoKey": "persi-academy/profile-pictures/user_id_hash.jpg",
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_auth_token"
  }
}
```

**Error Response (Email Not Verified):**
```json
{
  "success": false,
  "message": "Please verify your email address before logging in. Check your inbox for a verification link.",
  "code": "EMAIL_NOT_VERIFIED"
}
```

### Profile Management

#### Get Profile Photo
```http
GET /api/users/me/photo
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photoUrl": "https://s3.amazonaws.com/persi-edu-platform/persi-academy/profile-pictures/user_id_hash.jpg?X-Amz-Algorithm=...",
    "expiresIn": 60
  }
}
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/persi-platform

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# SMTP Configuration (for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_PORT=587
SMTP_SECURE=false
FROM_EMAIL=noreply@yourdomain.com

# Application URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

### Optional Environment Variables
```env
# Google OAuth (optional - feature will be disabled if not provided)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Session Configuration
SESSION_SECRET=your-session-secret-key
```

## 🔒 Security Features

### Email Verification Security
- **JWT Tokens**: Secure, tamper-proof verification tokens
- **Time Limits**: 1-hour expiry prevents long-term abuse
- **One-time Use**: Tokens are invalidated after use

## 🗄️ Database Schema

### Enhanced User Model
```javascript
{
  name: String,                    // Required
  email: { type: String, unique: true }, // Required, unique
  password: String,                // Required for local auth only
  authProvider: { type: String, enum: ['google', 'local'] }, // Default: 'local'
  profilePhotoKey: String,         // S3 object key (persi-educational-storage/persi-academy/profile-pictures/ folder)
  isVerified: { type: Boolean, default: false }, // New field
  role: { type: String, enum: ['user', 'admin'] }, // Default: 'user'
  status: { type: String, enum: ['active', 'inactive', 'suspended'] }, // Default: 'active'
  googleId: String,                // For Google OAuth users
  googleProfilePhoto: String,      // Google profile photo URL
  purchasedCourses: [ObjectId],    // Array of course IDs
  createdAt: Date,                 // Auto-generated
  updatedAt: Date                  // Auto-generated
}
```

## 🚀 Frontend Integration

### Registration Flow
```javascript
// 1. Register user
const formData = new FormData();
formData.append('name', 'John Doe');
formData.append('email', 'john@example.com');
formData.append('password', 'password123');
formData.append('profilePhoto', fileInput.files[0]);

const response = await fetch('/api/auth/register', {
  method: 'POST',
  body: formData
});

const data = await response.json();

if (data.success && data.data.verificationRequired) {
  // Show verification message
  showMessage('Please check your email to verify your account');
}
```

### Email Verification
```javascript
// 2. Handle verification link
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  const response = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  const data = await response.json();

  if (data.success) {
    // Store auth token and redirect
    localStorage.setItem('token', data.data.token);
    window.location.href = '/dashboard';
  }
}
```

### Login with Verification Check
```javascript
// 3. Login with verification check
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const data = await response.json();

if (data.success) {
  localStorage.setItem('token', data.data.token);
  window.location.href = '/dashboard';
} else if (data.code === 'EMAIL_NOT_VERIFIED') {
  // Show resend verification option
  showResendVerification(email);
}
```

### Profile Photo Display
```javascript
// 4. Get and display profile photo
const getProfilePhoto = async () => {
  const response = await fetch('/api/users/me/photo', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });

  const data = await response.json(); 