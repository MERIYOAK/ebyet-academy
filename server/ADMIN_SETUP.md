# Admin Login Setup Guide

This guide will help you set up the admin-only login feature for your MERN stack application.

## Prerequisites

Make sure you have the following dependencies installed:
- `bcryptjs` (already installed)
- `jsonwebtoken` (already installed)
- `dotenv` (already installed)

## Environment Variables Setup

Add the following variables to your `.env` file:

```env
# Admin Configuration
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD_HASH=your_bcrypt_hash_here
JWT_SECRET=your_jwt_secret_key_here
```

## Generating Admin Password Hash

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Run the password hash generator:
   ```bash
   node utils/generateAdminPassword.js your_secure_password
   ```

3. Copy the generated hash and add it to your `.env` file as `ADMIN_PASSWORD_HASH`.

## API Endpoints

### Admin Login
- **POST** `/api/admin/login`
- **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "your_password"
  }
  ```
- **Response (Success - 200):**
  ```json
  {
    "success": true,
    "message": "Admin login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "email": "admin@example.com",
      "role": "admin",
      "type": "admin"
    }
  }
  ```
- **Response (Error - 401):**
  ```json
  {
    "message": "Invalid admin credentials"
  }
  ```

### Protected Admin Route Example
- **GET** `/api/admin/dashboard`
- **Headers:** `Authorization: Bearer <admin_token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Admin dashboard accessed successfully",
    "admin": {
      "email": "admin@example.com",
      "role": "admin",
      "type": "admin"
    }
  }
  ```

## Using Admin Authentication in Other Routes

To protect routes with admin authentication, use the `adminAuthMiddleware`:

```javascript
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Protected admin route
router.post('/products', adminAuthMiddleware, (req, res) => {
  // Only admins can access this route
  // req.admin contains admin information
});
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
2. **JWT Tokens**: Admin tokens expire after 24 hours
3. **Input Validation**: Email format and password length validation
4. **Error Handling**: Comprehensive error messages and proper HTTP status codes
5. **Environment Variables**: Sensitive data stored in environment variables

## Testing the Admin Login

You can test the admin login using curl or any API client:

```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

## Troubleshooting

1. **"Admin credentials not configured"**: Make sure `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are set in your `.env` file
2. **"Invalid admin credentials"**: Double-check your email and password
3. **"Invalid token"**: Make sure you're using the correct token format: `Bearer <token>`
4. **"Token expired"**: Admin tokens expire after 24 hours, you'll need to login again 