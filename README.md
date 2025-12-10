# QENDIEL Academy - Enhanced Course Management System

A comprehensive MERN stack application for managing online courses with advanced features including versioning, soft deletes, S3 integration, and automated archiving.

## 🚀 Features

### Course Management
- **Versioning System**: Each course can have multiple versions with separate content
- **Soft Delete**: Courses are archived instead of permanently deleted
- **Status Management**: Active, Inactive, and Archived states
- **Enrollment Tracking**: Students remain linked to their enrolled version
- **Automatic Archiving**: Inactive courses are automatically archived after 6 months

### File Management
- **S3 Integration**: All files stored in organized S3 buckets
- **Proper Organization**: Files organized by course name and version
- **Archive Management**: Archived content moved to separate S3 folders
- **File Validation**: Type and size validation for uploads

### Security & Access Control
- **Admin Authentication**: JWT-based admin authentication
- **Route Protection**: Admin-only routes for course management
- **File Access Control**: Private videos with signed URLs
- **Environment Variables**: Secure credential management

## 📁 Project Structure

```
server/
├── models/
│   ├── Course.js              # Enhanced course model with versioning
│   ├── CourseVersion.js       # Course version tracking
│   ├── Video.js               # Video model with version support
│   └── User.js                # User model
├── controllers/
│   ├── courseControllerEnhanced.js  # Enhanced course operations
│   └── authController.js      # Authentication
├── routes/
│   ├── courseRoutesEnhanced.js      # Enhanced course routes
│   ├── archiveRoutes.js       # Archive management
│   └── authRoutes.js          # Authentication routes
├── middleware/
│   ├── adminMiddleware.js     # Admin authentication
│   └── authMiddleware.js      # User authentication
├── utils/
│   └── s3Enhanced.js          # AWS SDK v3 S3 utilities
├── services/
│   └── archiveService.js      # Archive management service
└── server.js                  # Main server file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qendiel-academy-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the server directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/qendiel-academy
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   
   # AWS S3
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_S3_BUCKET=your-s3-bucket-name
   AWS_REGION=us-east-1
   S3_ROOT_PREFIX=qendiel-academy
   
   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Course Management (Admin Only)
- `POST /api/courses` - Create new course
- `PUT /api/courses/:courseId` - Update course metadata
- `DELETE /api/courses/:courseId` - Archive course
- `POST /api/courses/:courseId/versions` - Create new version

### File Uploads (Admin Only)
- `POST /api/courses/thumbnail` - Upload course thumbnail
- `POST /api/courses/video` - Upload course video

### Public Access
- `GET /api/courses` - Get all active courses
- `GET /api/courses/:courseId` - Get course details
- `POST /api/courses/:courseId/enroll` - Enroll in course

### Archive Management (Admin Only)
- `GET /api/archive/stats` - Get archive statistics
- `POST /api/archive/course/:courseId` - Manually archive course
- `POST /api/archive/course/:courseId/restore` - Restore archived course
- `POST /api/archive/auto-archive` - Trigger automatic archiving
- `POST /api/archive/cleanup` - Clean up old archived courses

### Admin Dashboard
- `GET /api/admin/stats` - Get admin statistics

## 🔧 S3 File Organization

```
qendiel-academy/
├── profile-pics/
│   └── [timestamp]_[filename]
├── courses/
│   └── [course-name]/
│       ├── v1/
│       │   ├── thumbnails/
│       │   ├── videos/
│       │   └── materials/
│       └── v2/
│           ├── thumbnails/
│           ├── videos/
│           └── materials/
└── archived-courses/
    └── [course-name]/
        └── v[version]/
            ├── thumbnails/
            ├── videos/
            └── materials/
```

## 📊 Course Versioning

### Version Management
- Each course can have multiple versions
- New enrollments link to the latest version
- Existing students remain on their enrolled version
- Version history is maintained for audit purposes

### Status Flow
```
Active → Inactive → Archived → Deleted (after 1 year)
```

### Enrollment Tracking
- Students are linked to specific course versions
- Version changes don't affect existing students
- New students get the latest version

## 🔒 Security Features

### Authentication
- JWT-based authentication
- Admin-specific routes protected
- Token expiration handling

### File Security
- Private video files with signed URLs
- Public thumbnail access
- File type and size validation
- Secure S3 bucket policies

### Data Protection
- Soft deletes prevent data loss
- Archive system for compliance
- Audit trails for all changes

## 🚀 Usage Examples

### Creating a Course
```javascript
const response = await fetch('/api/courses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    title: 'Advanced JavaScript',
    description: 'Learn advanced JS concepts',
    price: 99.99,
    category: 'Programming',
    tags: 'javascript,advanced,es6'
  })
});
```

### Uploading a Thumbnail
```javascript
const formData = new FormData();
formData.append('thumbnail', file);
formData.append('courseId', courseId);
formData.append('version', 1);

const response = await fetch('/api/courses/thumbnail', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});
```

### Creating a New Version
```javascript
const response = await fetch(`/api/courses/${courseId}/versions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    changeLog: 'Updated content and added new modules'
  })
});
```

## 🔄 Migration from Legacy System

The enhanced system maintains backward compatibility:

1. **Legacy routes** are available at `/api/courses-legacy`
2. **Gradual migration** is supported
3. **Data migration scripts** can be created as needed

## 📈 Monitoring and Maintenance

### Archive Management
- Automatic archiving of inactive courses (6 months)
- Cleanup of old archived courses (1 year)
- Manual archive/restore capabilities

### Health Checks
- `GET /health` - Server health status
- Database connection monitoring
- S3 connectivity checks

### Logging
- Comprehensive error logging
- Operation tracking
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**Built with ❤️ for QENDIEL Academy** #   E B Y E T - A c a d e m y  
 #   E B Y E T _ A c a d e m y  
 