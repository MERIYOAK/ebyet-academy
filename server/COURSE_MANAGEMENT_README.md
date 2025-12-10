# Course Management Backend - MERN Stack with S3

A comprehensive backend system for managing courses with versioning, soft deletes, and proper S3 organization in a MERN stack application.

## 🏗️ Architecture Overview

### Key Features
- **Course Versioning**: Each course can have multiple versions with preserved content
- **Soft Deletes**: Courses and videos are archived instead of permanently deleted
- **S3 Organization**: Structured file storage with version-specific folders
- **Admin Controls**: Secure admin-only operations with proper authentication
- **Student Access Control**: Version-specific enrollment and access management

## 📁 S3 File Organization

```
persi-academy/
├── profile-pics/
│   └── [timestamp]_[filename]
├── courses/
│   └── [courseName]/
│       ├── v1/
│       │   ├── thumbnails/
│       │   │   └── [timestamp]_[filename]
│       │   ├── videos/
│       │   │   └── [timestamp]_[filename]
│       │   └── materials/
│       │       └── [timestamp]_[filename]
│       └── v2/
│           ├── thumbnails/
│           ├── videos/
│           └── materials/
└── archived-courses/
    └── [courseName]/
        └── v[version]/
            ├── thumbnails/
            ├── videos/
            └── materials/
```

## 🗄️ Database Models

### Course Model
```javascript
{
  title: String,
  description: String,
  price: Number,
  version: Number,           // Latest version number
  currentVersion: Number,    // Currently active version
  status: 'active' | 'inactive' | 'archived',
  thumbnailURL: String,
  videos: [ObjectId],
  enrolledStudents: [{
    userId: ObjectId,
    enrolledAt: Date,
    versionEnrolled: Number, // Which version they enrolled in
    status: 'active' | 'completed' | 'cancelled',
    lastAccessedAt: Date,
    progress: Number,
    completedVideos: [ObjectId]
  }],
  totalEnrollments: Number,
  averageRating: Number,
  totalRatings: Number,
  archivedAt: Date,
  archiveReason: String,
  archiveGracePeriod: Date, // When archived content becomes inaccessible
  slug: String,
  tags: [String],
  category: String,
  createdBy: String,
  lastModifiedBy: String,
  isPublic: Boolean,
  requiresApproval: Boolean,
  maxEnrollments: Number
}
```

### CourseVersion Model
```javascript
{
  courseId: ObjectId,
  versionNumber: Number,
  title: String,
  description: String,
  price: Number,
  thumbnailURL: String,
  videos: [ObjectId],
  s3FolderPath: String,     // e.g., "courses/course-name/v1"
  status: 'active' | 'inactive' | 'archived',
  createdBy: String,
  changeLog: String,
  archivedAt: Date,
  archiveS3Path: String,
  archiveReason: String,
  totalVideos: Number,
  totalDuration: Number,    // in seconds
  fileSize: Number,         // total size in bytes
  isPublic: Boolean,
  requiresApproval: Boolean
}
```

### Video Model
```javascript
{
  title: String,
  s3Key: String,
  courseId: ObjectId,
  courseVersion: Number,    // Which course version this video belongs to
  duration: String,
  order: Number,
  fileSize: Number,
  mimeType: String,
  originalName: String,
  status: 'active' | 'processing' | 'error' | 'archived',
  uploadedBy: String,
  description: String,
  tags: [String],
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed',
  processingError: String,
  archivedAt: Date,
  archiveS3Key: String
}
```

## 🔐 Authentication & Authorization

### Admin Authentication
- Uses JWT tokens stored in `localStorage`
- Admin credentials validated against `.env` variables
- All course management operations require admin authentication

### User Authentication
- Standard JWT-based user authentication
- Students can only access courses they're enrolled in
- Version-specific access control

## 🚀 API Endpoints

### Course Management (Admin Only)

#### Create Course
```http
POST /api/courses
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "title": "Course Title",
  "description": "Course description",
  "price": 99.99,
  "category": "Programming",
  "tags": "javascript,react,nodejs",
  "isPublic": true,
  "maxEnrollments": 100
}
```

#### Upload Thumbnail
```http
PUT /api/courses/thumbnail/:courseId
Authorization: Bearer [admin-token]
Content-Type: multipart/form-data

{
  "version": 1,
  "file": [image file]
}
```

#### Upload Video
```http
POST /api/courses/video
Authorization: Bearer [admin-token]
Content-Type: multipart/form-data

{
  "courseId": "course-id",
  "version": 1,
  "title": "Video Title",
  "order": 1,
  "file": [video file]
}
```

#### Create New Version
```http
POST /api/courses/:courseId/versions
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "changeLog": "Updated content and added new videos"
}
```

#### Update Course
```http
PUT /api/courses/:id
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "price": 149.99,
  "status": "active",
  "isPublic": true,
  "maxEnrollments": 200
}
```

#### Archive Course
```http
POST /api/courses/:courseId/archive
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "reason": "Course content outdated",
  "gracePeriodMonths": 6
}
```

#### Unarchive Course
```http
POST /api/courses/:courseId/unarchive
Authorization: Bearer [admin-token]
```

### Public Course Access

#### Get All Courses
```http
GET /api/courses?status=active&category=programming&limit=20&page=1
```

#### Get Course by ID
```http
GET /api/courses/:id?version=2
```

### User Enrollment

#### Enroll in Course
```http
POST /api/courses/:courseId/enroll
Authorization: Bearer [user-token]
```

#### Update Progress
```http
PUT /api/courses/:courseId/progress
Authorization: Bearer [user-token]
Content-Type: application/json

{
  "progress": 75,
  "completedVideos": ["video-id-1", "video-id-2"]
}
```

### Video Management

#### Update Video
```http
PUT /api/videos/:videoId
Authorization: Bearer [admin-token]
Content-Type: multipart/form-data

{
  "title": "Updated Video Title",
  "duration": "15:30",
  "order": 2,
  "file": [new video file] // Optional
}
```

#### Archive Video
```http
DELETE /api/videos/:videoId
Authorization: Bearer [admin-token]
```

#### Restore Video
```http
POST /api/videos/:videoId/restore
Authorization: Bearer [admin-token]
```

#### Stream Video
```http
GET /api/videos/:videoId/stream
Authorization: Bearer [user-token]
```

### Admin Statistics

#### Course Statistics
```http
GET /api/courses/admin/statistics
Authorization: Bearer [admin-token]
```

#### Video Statistics
```http
GET /api/videos/admin/statistics
Authorization: Bearer [admin-token]
```

#### Get Courses by Status
```http
GET /api/courses/admin/status/archived?limit=20&page=1
Authorization: Bearer [admin-token]
```

#### Bulk Archive Courses
```http
POST /api/courses/admin/bulk-archive
Authorization: Bearer [admin-token]
Content-Type: application/json

{
  "courseIds": ["course-id-1", "course-id-2"],
  "reason": "Bulk cleanup",
  "gracePeriodMonths": 3
}
```

## 🔧 Environment Variables

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
S3_ROOT_PREFIX=persi-academy

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password

# JWT Secret
JWT_SECRET=your_jwt_secret

# Database
MONGODB_URI=mongodb://localhost:27017/your_database
```

## 🛡️ Security Features

### File Upload Security
- File type validation (images for thumbnails, videos for videos)
- File size limits (5MB for images, 500MB for videos)
- Secure file naming with timestamps
- S3 bucket policies for access control

### Access Control
- Admin-only course creation, editing, and deletion
- Version-specific student access
- Grace period for archived content
- Soft deletes prevent data loss

### Data Protection
- No permanent deletion of files
- Archive system with configurable grace periods
- Version preservation for enrolled students
- Audit trails for all admin actions

## 📊 Course Versioning Workflow

1. **Create Course**: Initial version (v1) is created
2. **Add Content**: Videos and thumbnails are uploaded to v1
3. **Create New Version**: When major updates are needed
   - Increments version number
   - Creates new S3 folder structure
   - Preserves old content
4. **Update Content**: New videos/thumbnails go to latest version
5. **Student Access**: Students maintain access to their enrolled version
6. **Archive**: Old versions can be archived after grace period

## 🗂️ Archive Management

### Archive Process
1. **Soft Delete**: Course status changed to 'archived'
2. **Grace Period**: Students retain access for configurable period (default: 6 months)
3. **S3 Organization**: Content moved to `archived-courses/` folder
4. **Database Updates**: Archive timestamps and reasons recorded

### Restore Process
1. **Unarchive**: Course status restored to 'active'
2. **S3 Restoration**: Content moved back to active folders
3. **Access Restoration**: Students regain access to content

## 🔄 Data Flow

### Course Creation
```
Admin Request → Validation → Course Creation → Version Creation → S3 Folder Setup
```

### Video Upload
```
Admin Upload → File Validation → S3 Upload → Video Record Creation → Version Update
```

### Student Enrollment
```
Student Request → Access Validation → Enrollment Record → Version Tracking
```

### Course Archiving
```
Admin Archive Request → Status Update → S3 Content Move → Grace Period Setup
```

## 🧪 Testing

### API Testing
```bash
# Test course creation
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer [admin-token]" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Course","description":"Test","price":99.99}'

# Test video upload
curl -X POST http://localhost:5000/api/courses/video \
  -H "Authorization: Bearer [admin-token]" \
  -F "courseId=[course-id]" \
  -F "version=1" \
  -F "title=Test Video" \
  -F "file=@test-video.mp4"
```

### S3 Testing
```bash
# Test S3 connectivity
curl http://localhost:5000/api/courses/debug/s3-config

# Test thumbnail URL generation
curl http://localhost:5000/api/courses/debug/test-thumbnail-url
```

## 📈 Monitoring & Analytics

### Course Metrics
- Total courses by status
- Enrollment statistics
- Version distribution
- Archive statistics

### Video Metrics
- Total videos by status
- Storage usage
- Processing status
- File size analytics

### Student Metrics
- Enrollment progress
- Version access patterns
- Completion rates

## 🚨 Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

### Error Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (admin access required)
- `404`: Not Found (course/video not found)
- `409`: Conflict (duplicate course title)
- `500`: Internal Server Error

## 🔧 Maintenance

### Regular Tasks
1. **Cleanup Old Archives**: Remove content past grace period
2. **S3 Optimization**: Monitor storage usage and costs
3. **Database Indexing**: Ensure optimal query performance
4. **Backup Verification**: Test restore procedures

### Monitoring
- S3 upload/download metrics
- Database performance
- API response times
- Error rate tracking

## 📚 Best Practices

### Course Management
- Always create new versions for major updates
- Use descriptive change logs
- Set appropriate grace periods
- Monitor enrollment limits

### File Management
- Validate all uploads
- Use consistent naming conventions
- Monitor storage costs
- Implement proper error handling

### Security
- Regular token rotation
- Monitor admin access logs
- Validate all inputs
- Implement rate limiting

## 🤝 Contributing

1. Follow the established code structure
2. Add comprehensive error handling
3. Include proper logging
4. Update documentation
5. Test all new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 