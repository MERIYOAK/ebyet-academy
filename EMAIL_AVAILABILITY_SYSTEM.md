# 🔐 Email Availability System

## Overview

This system prevents duplicate email usage between Google OAuth and manual registration. When a user signs up with Google OAuth, that email address cannot be used for manual registration, and vice versa.

## 🎯 **Problem Solved**

### **Before Implementation**
- Users could register manually with an email already used by Google OAuth
- This created duplicate accounts and confusion
- No clear guidance on which authentication method to use

### **After Implementation**
- ✅ **Prevents duplicate emails** between Google OAuth and manual registration
- ✅ **Clear error messages** guiding users to the correct authentication method
- ✅ **Real-time email validation** on the frontend
- ✅ **Account linking** when Google OAuth user tries to use existing local account

## 🏗️ **System Architecture**

### **Email Availability Check Flow**

```
User enters email in registration form
        ↓
Check if email exists in database
        ↓
If email exists:
  ├── Google OAuth user → "Use Google sign-in"
  └── Local user → "Email already registered"
        ↓
If email doesn't exist:
  └── Allow registration
```

### **Registration Prevention Flow**

```
User submits registration form
        ↓
Check email availability
        ↓
If email used by Google OAuth:
  └── Block registration with clear message
        ↓
If email used by local user:
  └── Block registration with sign-in prompt
        ↓
If email available:
  └── Allow registration
```

## 📋 **API Endpoints**

### **Check Email Availability**
```http
POST /api/auth/check-email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response Examples:**

#### **Available Email**
```json
{
  "success": true,
  "data": {
    "available": true,
    "message": "Email is available for registration"
  }
}
```

#### **Email Used by Google OAuth**
```json
{
  "success": true,
  "data": {
    "available": false,
    "message": "This email is already registered with Google. Please sign in with Google instead.",
    "authProvider": "google"
  }
}
```

#### **Email Used by Local User**
```json
{
  "success": true,
  "data": {
    "available": false,
    "message": "This email is already registered. Please sign in or use a different email.",
    "authProvider": "local"
  }
}
```

### **Manual Registration**
```http
POST /api/auth/register
Content-Type: multipart/form-data

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "profilePhoto": [file] // optional
}
```

**Error Response for Google OAuth Email:**
```json
{
  "success": false,
  "message": "This email is already registered with Google. Please sign in with Google instead."
}
```

## 🔧 **Implementation Details**

### **Backend Changes**

#### **1. Enhanced Registration Logic**
```javascript
// In authService.js
async registerLocal(userData, profilePhoto = null) {
  const existingUser = await User.findOne({ email: userData.email });
  
  if (existingUser) {
    if (existingUser.authProvider === 'google') {
      throw new Error('This email is already registered with Google. Please sign in with Google instead.');
    } else {
      throw new Error('User with this email already exists. Please sign in or use a different email.');
    }
  }
  // ... continue with registration
}
```

#### **2. Email Availability Check**
```javascript
// In authService.js
async checkEmailAvailability(email) {
  const existingUser = await User.findOne({ email: email });
  
  if (!existingUser) {
    return {
      available: true,
      message: 'Email is available for registration'
    };
  }
  
  if (existingUser.authProvider === 'google') {
    return {
      available: false,
      message: 'This email is already registered with Google. Please sign in with Google instead.',
      authProvider: 'google'
    };
  } else {
    return {
      available: false,
      message: 'This email is already registered. Please sign in or use a different email.',
      authProvider: 'local'
    };
  }
}
```

#### **3. Enhanced Google OAuth Handling**
```javascript
// In authService.js
async handleGoogleAuth(profile) {
  let user = await User.findOne({ googleId: profile.id });

  if (!user) {
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      if (user.authProvider === 'local') {
        // Link existing local account to Google OAuth
        console.log(`🔗 Linking existing local account to Google OAuth: ${user.email}`);
        user.googleId = profile.id;
        user.authProvider = 'google';
        // ... update user
      }
    }
  }
  // ... continue with authentication
}
```

### **Frontend Integration**

#### **Real-time Email Validation**
```javascript
// In registration form
const checkEmailAvailability = async (email) => {
  try {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const result = await response.json();
    
    if (result.success) {
      if (!result.data.available) {
        if (result.data.authProvider === 'google') {
          setEmailError('This email is registered with Google. Please sign in with Google instead.');
          setShowGoogleSignIn(true);
        } else {
          setEmailError('This email is already registered. Please sign in.');
        }
      } else {
        setEmailError('');
        setShowGoogleSignIn(false);
      }
    }
  } catch (error) {
    console.error('Email check failed:', error);
  }
};
```

## 🧪 **Testing**

### **Test Scenarios**

1. **New Email Registration**
   - ✅ Should allow registration
   - ✅ Should show success message

2. **Google OAuth Email Attempt**
   - ✅ Should block registration
   - ✅ Should show "Use Google sign-in" message
   - ✅ Should provide Google sign-in option

3. **Local User Email Attempt**
   - ✅ Should block registration
   - ✅ Should show "Email already registered" message
   - ✅ Should provide sign-in link

4. **Invalid Email Format**
   - ✅ Should show validation error
   - ✅ Should not make API call

### **Run Tests**
```bash
cd server
node test-email-availability.mjs
```

## 🎨 **User Experience**

### **Error Messages**

#### **Google OAuth Email**
```
❌ This email is already registered with Google. 
   Please sign in with Google instead.
   
   [Sign in with Google] [Use Different Email]
```

#### **Local User Email**
```
❌ This email is already registered. 
   Please sign in or use a different email.
   
   [Sign In] [Use Different Email]
```

### **Success Messages**

#### **Available Email**
```
✅ Email is available for registration
```

## 🔒 **Security Benefits**

1. **Prevents Account Confusion**: Users can't accidentally create duplicate accounts
2. **Clear Authentication Path**: Users know which method to use for their email
3. **Account Linking**: Seamless transition from local to Google OAuth
4. **Data Integrity**: Maintains single source of truth for user accounts

## 🚀 **Future Enhancements**

1. **Email Change Validation**: Prevent changing to an email used by another auth method
2. **Account Merging**: Allow users to merge accounts with same email
3. **Social Login Linking**: Support linking multiple social providers to one account
4. **Email Verification**: Enhanced verification for account linking

## 📊 **Monitoring & Analytics**

### **Logs to Monitor**
```javascript
// Account linking
console.log(`🔗 Linking existing local account to Google OAuth: ${user.email}`);

// New Google OAuth user
console.log(`🆕 Creating new Google OAuth user: ${profile.emails[0].value}`);

// Registration blocked
console.log(`🚫 Registration blocked for Google OAuth email: ${email}`);
```

### **Metrics to Track**
- Number of registration attempts blocked
- Number of account linking events
- Email availability check frequency
- User authentication method preferences

This system ensures a clean, user-friendly authentication experience while preventing duplicate accounts and confusion! 🎉 