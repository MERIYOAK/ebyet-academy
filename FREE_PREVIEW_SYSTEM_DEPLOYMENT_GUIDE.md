# Free Preview System - Deployment Guide

## 🎯 **Overview**

This guide covers the implementation of a Udemy-style free preview system for lessons within courses. The system allows instructors to mark specific videos as free previews, enabling non-purchased users to watch them while keeping other videos locked behind a paywall.

---

## 📋 **Implementation Summary**

### **✅ Completed Features:**

1. **Database Schema Update**
   - Added `isFreePreview: { type: Boolean, default: false }` to Video model
   - Maintains backward compatibility with existing videos

2. **Backend Access Control**
   - Created `purchaseUtils.js` with helper functions
   - Updated video controller endpoints with access control
   - Modified progress tracking to work with free preview videos
   - Added admin endpoint to toggle free preview status

3. **Frontend Integration**
   - Updated VideoPlayerPage to use new access control API
   - Enhanced VideoPlaylist component with lock/unlock indicators
   - Added admin interface for managing free preview settings
   - Implemented redirect to checkout for locked videos

4. **Security & UX**
   - Secure access control with proper authentication
   - Smooth user experience with clear visual indicators
   - Admin-only access to free preview management
   - Progress tracking works for both free and paid videos

---

## 🚀 **Deployment Steps**

### **Step 1: Database Migration**

The database schema has been automatically updated. No manual migration is required as the `isFreePreview` field defaults to `false` for existing videos.

**Verification:**
```bash
# Test the database schema
node server/test-free-preview-system.mjs
```

### **Step 2: Backend Deployment**

1. **Update Video Model** ✅
   - `server/models/Video.js` - Added `isFreePreview` field

2. **Create Purchase Utils** ✅
   - `server/utils/purchaseUtils.js` - New utility functions

3. **Update Video Controller** ✅
   - `server/controllers/videoController.js` - Added access control
   - `server/controllers/progressController-fixed.js` - Updated progress logic

4. **Update Routes** ✅
   - `server/routes/videoRoutes.js` - Added free preview toggle endpoint

**Verification:**
```bash
# Start the server
npm run dev

# Test the new endpoints
curl -X GET "http://localhost:5000/api/videos/course/{courseId}/version/1" \
  -H "Authorization: Bearer {token}"
```

### **Step 3: Frontend Deployment**

1. **Update VideoPlayerPage** ✅
   - `frontend/src/pages/VideoPlayerPage.tsx` - New access control logic

2. **Update VideoPlaylist** ✅
   - `frontend/src/components/VideoPlaylist.tsx` - Lock/unlock indicators

3. **Update Admin Interface** ✅
   - `frontend/src/pages/AdminCourseVideosPage.tsx` - Free preview toggle

**Verification:**
```bash
# Start the frontend
cd frontend
npm run dev

# Test the video player with different user types
```

### **Step 4: Testing**

Run the comprehensive test suite:

```bash
# Test the complete system
node server/test-free-preview-system.mjs
```

---

## 🔧 **Configuration**

### **Environment Variables**

No new environment variables are required. The system uses existing authentication and database connections.

### **Admin Access**

Only users with `role: 'admin'` can toggle free preview settings. Ensure your admin users have the correct role in the database.

---

## 📊 **API Endpoints**

### **New Endpoints:**

1. **Toggle Free Preview** (Admin Only)
   ```
   PUT /api/videos/:videoId/free-preview
   Body: { "isFreePreview": boolean }
   ```

2. **Get Videos with Access Control**
   ```
   GET /api/videos/course/:courseId/version/:version
   Response includes: hasAccess, isLocked, lockReason, userHasPurchased
   ```

### **Updated Endpoints:**

1. **Get Video by ID**
   - Now includes access control checks
   - Returns 403 for locked videos

2. **Stream Video**
   - Now includes access control checks
   - Returns 403 for locked videos

3. **Progress Update**
   - Now allows progress tracking for free preview videos
   - Maintains existing behavior for purchased courses

---

## 🎨 **User Experience**

### **For Non-Purchased Users:**

1. **Course Page**: Shows all videos with lock indicators
2. **Free Preview Videos**: 
   - Playable without purchase
   - Marked with 🔓 "Free" badge
   - Progress tracking enabled
3. **Locked Videos**:
   - Greyed out with 🔒 lock icon
   - Clicking redirects to checkout
   - Clear "Purchase Required" messaging

### **For Purchased Users:**

1. **Full Access**: All videos are unlocked
2. **Normal Experience**: No changes to existing functionality
3. **Progress Tracking**: Works for all videos

### **For Admins:**

1. **Free Preview Management**: Toggle buttons in video list
2. **Visual Indicators**: Clear status badges
3. **Bulk Operations**: Can manage multiple videos

---

## 🔒 **Security Considerations**

### **Access Control:**

1. **Video Access**: Properly validated on all endpoints
2. **Admin Functions**: Restricted to admin users only
3. **Progress Tracking**: Only allowed for accessible videos
4. **API Security**: All endpoints require authentication

### **Data Integrity:**

1. **Purchase Status**: Verified against user's `purchasedCourses` array
2. **Free Preview Status**: Stored securely in database
3. **Progress Data**: Protected by access control

---

## 🧪 **Testing Scenarios**

### **Test Cases:**

1. **Non-Purchased User**
   - Can access free preview videos
   - Cannot access locked videos
   - Progress tracking works for free videos
   - Redirected to checkout for locked videos

2. **Purchased User**
   - Can access all videos
   - Progress tracking works for all videos
   - No changes to existing experience

3. **Admin User**
   - Can toggle free preview status
   - Can access all videos regardless of status
   - Can manage course content

4. **Edge Cases**
   - Mixed free/premium course content
   - User purchases course after viewing free previews
   - Admin changes free preview status

---

## 📈 **Monitoring & Analytics**

### **Key Metrics to Track:**

1. **Free Preview Usage**
   - Number of users watching free previews
   - Conversion rate from free preview to purchase
   - Most popular free preview videos

2. **Access Patterns**
   - Locked video click attempts
   - Checkout page redirects
   - Purchase completion rates

3. **User Engagement**
   - Time spent on free preview videos
   - Progress completion rates
   - Course completion rates

### **Logging:**

The system includes comprehensive logging for:
- Access control decisions
- Free preview status changes
- User purchase verification
- API endpoint usage

---

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Videos Not Loading**
   - Check authentication token
   - Verify course purchase status
   - Check free preview settings

2. **Admin Toggle Not Working**
   - Verify admin role in database
   - Check API endpoint permissions
   - Review server logs

3. **Progress Not Tracking**
   - Verify video access permissions
   - Check progress controller logic
   - Review database connections

### **Debug Commands:**

```bash
# Check video access for a user
curl -X GET "http://localhost:5000/api/videos/course/{courseId}/version/1" \
  -H "Authorization: Bearer {token}"

# Toggle free preview (admin only)
curl -X PUT "http://localhost:5000/api/videos/{videoId}/free-preview" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{"isFreePreview": true}'

# Check user purchase status
curl -X GET "http://localhost:5000/api/payment/check-purchase/{courseId}" \
  -H "Authorization: Bearer {token}"
```

---

## 🔄 **Rollback Plan**

If you need to rollback the free preview system:

1. **Database**: No rollback needed (field defaults to false)
2. **Backend**: Restore previous versions of modified files
3. **Frontend**: Restore previous versions of modified files
4. **Routes**: Remove the new free preview endpoint

**Rollback Commands:**
```bash
# Restore previous versions
git checkout HEAD~1 -- server/models/Video.js
git checkout HEAD~1 -- server/controllers/videoController.js
git checkout HEAD~1 -- frontend/src/pages/VideoPlayerPage.tsx

# Restart services
npm run dev
```

---

## 📞 **Support**

### **Documentation:**
- API Documentation: Check the updated route files
- Database Schema: See `server/models/Video.js`
- Frontend Components: See updated React components

### **Testing:**
- Run `node server/test-free-preview-system.mjs` for comprehensive testing
- Use browser dev tools to monitor API calls
- Check server logs for detailed error information

---

## ✅ **Deployment Checklist**

- [ ] Database schema updated
- [ ] Backend endpoints deployed
- [ ] Frontend components updated
- [ ] Admin interface functional
- [ ] Access control tested
- [ ] Progress tracking verified
- [ ] Security measures in place
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team trained on new features

---

**🎉 Congratulations!** Your free preview system is now ready for production use. The implementation follows Udemy's proven model and provides a smooth user experience for both free preview and paid content.
