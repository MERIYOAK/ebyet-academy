# Purchase Filtering Implementation

## Overview

This document explains how the course purchase filtering system works, ensuring that purchased courses disappear from the homepage and general course listings for users who have purchased them, while remaining visible to other users who haven't purchased them.

## System Architecture

### Backend Implementation

#### 1. User Model (`server/models/User.js`)
- Users have a `purchasedCourses` field that stores an array of Course ObjectIds
- This field tracks which courses a user has purchased

```javascript
purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
```

#### 2. Course Filtering Logic (`server/controllers/courseControllerEnhanced.js`)

The `getAllCourses` function implements the core filtering logic:

```javascript
// Filter out purchased courses for logged-in users
let filteredCourses = courses;

// Check for authentication token in headers
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
  try {
    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded && decoded.userId) {
      // Get user's purchased courses
      const User = require('../models/User');
      const user = await User.findById(decoded.userId);
      
      if (user && user.purchasedCourses && user.purchasedCourses.length > 0) {
        const purchasedCourseIds = user.purchasedCourses.map(id => id.toString());
        
        // Filter out purchased courses
        filteredCourses = courses.filter(course => 
          !purchasedCourseIds.includes(course._id.toString())
        );
      }
    }
  } catch (error) {
    // Invalid token, show all courses
  }
}
```

#### 3. Payment Processing (`server/controllers/paymentController.js`)

When a user purchases a course, it's added to their `purchasedCourses` array:

```javascript
// Update user's purchased courses
const updatedUser = await User.findByIdAndUpdate(
  userId,
  { $addToSet: { purchasedCourses: courseId } },
  { new: true }
);
```

#### 4. Purchased Courses Endpoint (`server/routes/myCoursesRoutes.js`)

A dedicated endpoint to fetch only purchased courses for the dashboard:

```javascript
// GET /api/my-courses
router.get('/', authMiddleware, getUserPurchasedCourses);
```

### Frontend Implementation

#### 1. HomePage (`frontend/src/pages/HomePage.tsx`)
- Now includes authentication tokens when fetching courses
- Purchased courses are automatically filtered out for logged-in users

```typescript
// Get authentication token if available
const token = localStorage.getItem('token');
const headers: HeadersInit = {};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const res = await fetch('http://localhost:5000/api/courses', {
  headers
});
```

#### 2. CoursesPage (`frontend/src/pages/CoursesPage.tsx`)
- Already properly sends authentication tokens
- Purchased courses are filtered out from the course listing

#### 3. DashboardPage (`frontend/src/pages/DashboardPage.tsx`)
- Fetches purchased courses using the `/my-courses` endpoint
- Displays only courses the user has purchased

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/courses` - Returns all active courses (no filtering)

### Authenticated Endpoints
- `GET /api/courses` - Returns all active courses except those purchased by the user
- `GET /api/my-courses` - Returns only courses purchased by the user

## User Experience Flow

### For Non-Authenticated Users
1. Visit homepage → See all available courses
2. Visit courses page → See all available courses
3. Cannot access dashboard (redirected to login)

### For Authenticated Users (No Purchases)
1. Visit homepage → See all available courses
2. Visit courses page → See all available courses
3. Visit dashboard → See empty purchased courses section

### For Authenticated Users (With Purchases)
1. Visit homepage → See all available courses EXCEPT purchased ones
2. Visit courses page → See all available courses EXCEPT purchased ones
3. Visit dashboard → See only purchased courses

## Testing

A test script is provided to verify the functionality:

```bash
node server/test-purchase-filtering.js
```

This script tests:
1. Public access to courses (should show all)
2. Authenticated access to courses (should filter purchased)
3. My-courses endpoint (should show only purchased)
4. Purchase status verification

## Key Features

### ✅ Implemented
- [x] Backend filtering logic for purchased courses
- [x] Frontend authentication token inclusion
- [x] Separate endpoint for purchased courses
- [x] Payment processing updates user's purchased courses
- [x] Dashboard shows only purchased courses
- [x] Homepage and course listings filter out purchased courses
- [x] Other users still see all courses (including those purchased by others)

### 🔄 How It Works

1. **User purchases a course** → Course ID added to `user.purchasedCourses` array
2. **User visits homepage/courses page** → Frontend sends auth token with request
3. **Backend receives request** → Checks if user is authenticated
4. **If authenticated** → Filters out courses in user's `purchasedCourses` array
5. **If not authenticated** → Shows all courses
6. **User visits dashboard** → Fetches only purchased courses via `/my-courses`

## Security Considerations

- Authentication tokens are verified on the backend
- Invalid tokens fall back to showing all courses
- No sensitive information is exposed
- Purchase verification happens on the backend

## Performance Considerations

- Filtering happens on the backend to reduce frontend processing
- Database queries are optimized with proper indexing
- Caching could be implemented for frequently accessed data
- Pagination is supported for large course lists

## Future Enhancements

- Add course completion tracking
- Implement course recommendations based on purchase history
- Add course wishlist functionality
- Implement course sharing between users
- Add course ratings and reviews system 