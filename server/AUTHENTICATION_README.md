# 🔐 Authentication System Documentation

## Overview

This document describes the comprehensive user registration and authentication system implemented for the QENDIEL Academy Platform. The system supports both local authentication (email/password) and Google OAuth authentication, with secure profile photo handling using AWS S3.

## 🏗️ Architecture

### Components

1. **User Model** (`models/User.js`)
   - Enhanced schema with authentication provider support
   - Google OAuth integration fields
   - Profile photo key storage

2. **Authentication Service** (`services/authService.js`)
   - JWT token generation and verification
   - Local and Google OAuth authentication logic
   - Profile management functions

3. **S3 Service** (`services/s3Service.js`)
   - Profile photo upload/download management
   - Signed URL generation for secure access
   - Google profile photo integration

4. **Authentication Controller** (`controllers/authController.js`)
   - API endpoint handlers
   - Request validation and response formatting
   - Error handling

5. **Authentication Routes** (`routes/authRoutes.js`)
   - Route definitions for all authentication endpoints
   - File upload handling with Multer
   - Google OAuth route configuration

6. **Passport Configuration** (`config/passport.js`)
   - Google OAuth strategy setup
   - Profile handling and serialization

## 🔧 Setup Requirements

### Environment Variables

Add the following variables to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Application URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Session Configuration
SESSION_SECRET=your-session-secret-key
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)

### AWS S3 Setup

1. Create an S3 bucket named `persi-edu-platform`
2. Configure bucket permissions for private access
3. Create IAM user with S3 access
4. Set up CORS policy for the bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## 📋 API Endpoints

### Local Authentication

#### Register User
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
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "authProvider": "local",
      "profilePhotoKey": "persi-academy/profile-pictures/user_id_hash.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "name": "John Smith", // optional
  "email": "johnsmith@example.com", // optional
  "profilePhoto": [file] // optional
}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Google OAuth

#### Initiate Google Login
```http
GET /api/auth/google
```

#### Google OAuth Callback
```http
GET /api/auth/google/callback
```

### Profile Photo Management

#### Get Profile Photo URL
```http
GET /api/users/me/photo
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photoUrl": "https://s3.amazonaws.com/persi-edu-platform/persi-academy/profile-pictures/user_id_hash.jpg?AWSAccessKeyId=...&Signature=...&Expires=...",
    "expiresIn": 60
  }
}
```

#### Delete Profile Photo
```http
DELETE /api/users/me/photo
Authorization: Bearer <jwt_token>
```

## 🔒 Security Features

### JWT Token Security
- Tokens expire after 7 days
- Include user ID, email, role, and auth provider
- Verified on every protected request

### Password Security
- Bcrypt hashing with salt rounds of 10
- Minimum 6 character requirement
- Only required for local authentication

### File Upload Security
- File type validation (images only)
- File size limits (5MB max)
- Secure S3 storage with private ACL
- Signed URLs with 60-second expiration

### Google OAuth Security
- Secure callback handling
- Profile photo automatic download and storage
- Account linking for existing users

## 📁 File Structure

```
server/
├── models/
│   └── User.js                 # Enhanced user schema
├── services/
│   ├── authService.js          # Authentication logic
│   └── s3Service.js            # S3 operations
├── controllers/
│   └── authController.js       # API endpoint handlers
├── routes/
│   └── authRoutes.js           # Route definitions
├── middleware/
│   └── authMiddleware.js       # JWT verification
├── config/
│   └── passport.js             # Google OAuth setup
└── server.js                   # Main server file
```

## 🚀 Usage Examples

### Frontend Integration

#### Local Registration with Photo
```javascript
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
localStorage.setItem('token', data.data.token);
```

#### Google OAuth Login
```javascript
// Redirect to Google OAuth
window.location.href = '/api/auth/google';
```

#### Get Profile Photo
```javascript
const response = await fetch('/api/users/me/photo', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

const data = await response.json();
const photoUrl = data.data.photoUrl;
// Use photoUrl in <img> src (expires in 60 seconds)
```

## 🔧 Error Handling

### Common Error Responses

#### Validation Errors
```json
{
  "success": false,
  "message": "Name, email, and password are required"
}
```

#### Authentication Errors
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### File Upload Errors
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB."
}
```

## 🧪 Testing

### Test Endpoints

#### Health Check
```http
GET /api/auth/health
```

#### Protected Route Test
```http
GET /api/auth/me
Authorization: Bearer <valid_token>
```

## 🔄 Migration Notes

### Database Changes
- Added `authProvider` field (enum: ['google', 'local'])
- Added `profilePhotoKey` field for S3 storage
- Added `googleId` field for Google OAuth
- Made `password` field conditional (only for local auth)

### Breaking Changes
- Updated JWT token structure
- Changed authentication middleware response format
- Modified user registration/login endpoints

## 🛠️ Troubleshooting

### Common Issues

1. **Google OAuth not working**
   - Check Google Cloud Console credentials
   - Verify redirect URI configuration
   - Ensure Google+ API is enabled

2. **S3 upload failures**
   - Verify AWS credentials
   - Check bucket permissions
   - Ensure CORS is configured

3. **JWT token issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper Authorization header format

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=passport:*
NODE_ENV=development
```

## 📈 Performance Considerations

- Profile photos are stored in S3 for scalability
- Signed URLs expire quickly for security
- JWT tokens are stateless for better performance
- File uploads use memory storage for processing

## 🔮 Future Enhancements

- Email verification for local accounts
- Password reset functionality
- Two-factor authentication
- Social login providers (Facebook, GitHub)
- Profile photo cropping and resizing
- Bulk user import/export 