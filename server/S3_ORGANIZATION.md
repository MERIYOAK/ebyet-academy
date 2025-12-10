# S3 File Organization Structure

This document outlines the organized folder structure for file uploads to the S3 bucket.

## 📁 Folder Structure

```
s3-bucket/
├── profile-pics/                    # User profile pictures
│   ├── 1703123456789_user_photo.jpg
│   └── 1703123456790_avatar.png
│
├── thumbnails/                      # Course thumbnails (PUBLIC ACCESS)
│   ├── YouTube_Monetization_Masterclass/
│   │   ├── 1703123456789_thumbnail.jpg
│   │   └── 1703123456790_updated_thumb.png
│   ├── Content_Strategy_for_YouTube_Success/
│   │   └── 1703123456791_course_thumb.jpg
│   └── YouTube_SEO_Algorithm_Secrets/
│       └── 1703123456792_seo_thumb.jpg
│
├── courses/                         # Course content (PRIVATE ACCESS)
│   ├── YouTube_Monetization_Masterclass/
│   │   ├── v1/
│   │   │   ├── videos/
│   │   │   │   ├── 1703123456789_introduction.mp4
│   │   │   │   ├── 1703123456790_setup_guide.mp4
│   │   │   │   └── 1703123456791_monetization_tips.mp4
│   │   │   └── materials/
│   │   │       ├── 1703123456789_workbook.pdf
│   │   │       └── 1703123456790_checklist.docx
│   │   └── v2/
│   │       ├── videos/
│   │       └── materials/
│   ├── Content_Strategy_for_YouTube_Success/
│   │   └── v1/
│   │       ├── videos/
│   │       │   ├── 1703123456792_content_planning.mp4
│   │       │   └── 1703123456793_audience_engagement.mp4
│   │       └── materials/
│   │           └── 1703123456791_content_calendar.xlsx
│   └── YouTube_SEO_Algorithm_Secrets/
│       └── v1/
│           ├── videos/
│           │   ├── 1703123456794_seo_basics.mp4
│           │   └── 1703123456795_algorithm_understanding.mp4
│           └── materials/
│
├── certificates/                    # Course completion certificates (PRIVATE ACCESS)
│   ├── YouTube_Monetization_Masterclass/
│   │   ├── 1703123456789_certificate_user123.pdf
│   │   └── 1703123456790_certificate_user456.pdf
│   └── Content_Strategy_for_YouTube_Success/
│       └── 1703123456791_certificate_user789.pdf
│
└── misc/                           # Miscellaneous files (PRIVATE ACCESS)
    ├── 1703123456789_temp_file.txt
    └── 1703123456790_backup.json
```

## 🔧 Implementation Details

### File Type Categories

1. **Profile Pictures** (`profile-pics/`)
   - User profile pictures and avatars
   - Public access (public-read ACL)
   - Format: `profile-pics/{timestamp}_{filename}`

2. **Thumbnails** (`thumbnails/{courseName}/`)
   - Course thumbnails and preview images
   - **PUBLIC ACCESS** (public-read ACL) - Can be accessed by anyone without authentication
   - Format: `thumbnails/{sanitized_course_name}/{timestamp}_{filename}`

3. **Videos** (`courses/{courseName}/v{version}/videos/`)
   - Course video content
   - **PRIVATE ACCESS** (private ACL) - Requires signed URLs for access
   - Format: `courses/{sanitized_course_name}/v{version}/videos/{timestamp}_{filename}`

4. **Course Materials** (`courses/{courseName}/v{version}/materials/`)
   - PDFs, documents, worksheets, etc.
   - **PRIVATE ACCESS** (private ACL) - Requires signed URLs for access
   - Format: `courses/{sanitized_course_name}/v{version}/materials/{timestamp}_{filename}`

5. **Certificates** (`certificates/{courseName}/`)
   - Course completion certificates
   - **PRIVATE ACCESS** (private ACL) - Requires signed URLs for access
   - Format: `certificates/{sanitized_course_name}/{timestamp}_{filename}`

6. **Miscellaneous** (`misc/`)
   - Any other files that don't fit the above categories
   - **PRIVATE ACCESS** (private ACL) - Requires signed URLs for access
   - Format: `misc/{timestamp}_{filename}`

### Key Features

- **Automatic Folder Creation**: Folders are created automatically based on course names
- **Sanitized Names**: Course names are sanitized to remove special characters
- **Timestamp Prefix**: All files include timestamps to prevent conflicts
- **Organized Structure**: Files are grouped by type and context
- **Scalable**: Structure supports unlimited courses and file types

## 🚀 Usage Examples

### Uploading a Profile Picture

```javascript
const uploadResult = await uploadFileWithOrganization(file, 'profile-pic');
// Result: { s3Key: 'persi-academy/profile-pics/1703123456789_user_photo.jpg', url: '...', publicUrl: '...' }
```

### Uploading a Course Thumbnail

```javascript
const uploadResult = await uploadFileWithOrganization(file, 'thumbnail', {
  courseName: 'YouTube Monetization Masterclass'
});
// Result: { s3Key: 'persi-academy/thumbnails/YouTube_Monetization_Masterclass/1703123456789_thumbnail.jpg', url: '...', publicUrl: '...' }
```

### Uploading a Course Video

```javascript
const uploadResult = await uploadToS3(file, 'course-video', {
  courseName: 'Content Strategy for YouTube Success',
  version: 1
});
// Result: { s3Key: 'persi-academy/courses/Content_Strategy_for_YouTube_Success/v1/videos/1703123456790_introduction.mp4', url: '...', publicUrl: null }
```

### Uploading Course Materials

```javascript
const uploadResult = await uploadToS3(file, 'course-material', {
  courseName: 'YouTube SEO & Algorithm Secrets',
  version: 1
});
// Result: { s3Key: 'persi-academy/courses/YouTube_SEO_Algorithm_Secrets/v1/materials/1703123456791_workbook.pdf', url: '...', publicUrl: null }
```

## 🔒 Security Considerations

- **Public Files**: 
  - **Thumbnails** are publicly accessible (public-read ACL) for easy display on the website
  - **Profile pictures** are publicly accessible for user avatars
- **Private Files**: 
  - **Videos**, **course materials**, and **certificates** are private by default
  - Private files require signed URLs with expiration for access
  - Access is controlled through application logic and user authentication
- **Security Benefits**:
  - Thumbnails can be loaded directly in HTML `<img>` tags without authentication
  - Sensitive content (videos, materials) remains protected
  - Signed URLs provide time-limited access to private content

## 📊 Benefits

1. **Organization**: Clear folder structure makes it easy to find files
2. **Scalability**: Structure supports growth and new file types
3. **Maintenance**: Easy to manage and clean up files by category
4. **Performance**: Organized structure can improve S3 performance
5. **Backup**: Easy to backup specific categories of files
6. **Cost Management**: Can apply different lifecycle policies per folder

## 🔄 Migration

If you have existing files in the old structure, you can:

1. **Gradual Migration**: Move files to new structure as they're accessed
2. **Bulk Migration**: Write a script to move all existing files
3. **Dual Structure**: Support both old and new structures during transition

## 🛠️ Maintenance

- **Regular Cleanup**: Remove orphaned files periodically
- **Lifecycle Policies**: Set up S3 lifecycle policies for different folders
- **Monitoring**: Monitor storage usage by folder
- **Backup**: Regular backups of important folders 