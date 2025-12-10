# Local Development Setup Guide

## ✅ CSP Issue Fixed!

The Content Security Policy has been updated to allow both development and production environments:

### **Before (Broken):**
```html
connect-src 'self' https://persi-academy.onrender.com https://api.stripe.com https://accounts.google.com
```

### **After (Fixed):**
```html
connect-src 'self' http://localhost:5000 https://localhost:5000 https://persi-academy.onrender.com https://api.stripe.com https://accounts.google.com
```

## **Setting Up Local Environment Variables**

### **Step 1: Create Frontend Environment File**

Create `frontend/.env.local` (this file is gitignored):

```env
# Frontend Environment Variables for Local Development
VITE_API_BASE_URL=http://localhost:5000
VITE_FRONTEND_URL=http://localhost:5173
VITE_APP_NAME=QENDIEL Academy
VITE_APP_DESCRIPTION=Professional Skills Development
VITE_S3_BUCKET_URL=https://persi-edu-platform.s3.us-east-1.amazonaws.com
VITE_S3_IMAGE_PATH=/persi-academy/Ig-images/ig-image.jpeg
VITE_S3_BUCKET_URL_DOMAIN=persi-edu-platform.s3.us-east-1.amazonaws.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### **Step 2: Create Backend Environment File**

Create `server/.env` (this file is gitignored):

```env
# Backend Environment Variables for Local Development
NODE_ENV=development
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000
APP_NAME=QENDIEL Academy
APP_DESCRIPTION=Professional Skills Development
APP_VERSION=1.0.0
S3_BUCKET_URL=https://persi-edu-platform.s3.us-east-1.amazonaws.com
S3_IMAGE_PATH=/persi-academy/Ig-images/ig-image.jpeg
```

## **Testing the Setup**

### **1. Start Backend Server:**
```bash
cd server
npm run dev
```

### **2. Start Frontend Server:**
```bash
cd frontend
npm run dev
```

### **3. Test API Connection:**
- Open `http://localhost:5173`
- Check browser console for any CSP errors
- Should see successful API calls to `http://localhost:5000`

## **Environment Variables Priority**

Vite loads environment variables in this order:
1. `.env.local` (highest priority, gitignored)
2. `.env.development.local`
3. `.env.development`
4. `.env.local`
5. `.env`

## **Production vs Development**

### **Development (Local):**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- CSP allows both HTTP and HTTPS localhost

### **Production (Vercel + Render):**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://persi-academy.onrender.com`
- CSP allows only HTTPS connections

## **Troubleshooting**

### **If you still get CSP errors:**
1. Clear browser cache
2. Restart both frontend and backend servers
3. Check that `.env.local` file exists in frontend directory
4. Verify `VITE_API_BASE_URL=http://localhost:5000` is set

### **If API calls fail:**
1. Check that backend server is running on port 5000
2. Verify MongoDB connection
3. Check backend console for errors

## **Next Steps**

1. ✅ CSP issue fixed
2. Create environment files
3. Test local development
4. Set up Stripe webhook for local testing
5. Test payment flow locally
