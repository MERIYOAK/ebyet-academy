# S3 CORS Configuration for Video Playback

This guide will help you fix the video playback issues by properly configuring CORS settings on your S3 bucket.

## 🔍 **Current Issue**

The error `MEDIA_ERR_SRC_NOT_SUPPORTED` (Error Code 4) indicates that the browser cannot play the video. This is often caused by:

1. **Missing CORS headers** on S3 bucket
2. **Incorrect Content-Type** headers
3. **Browser security restrictions**

## 🛠️ **Solution: Configure S3 CORS**

### **Step 1: Access S3 Console**

1. Go to [AWS S3 Console](https://console.aws.amazon.com/s3/)
2. Select your bucket: `persi-edu-platform`
3. Click on the **"Permissions"** tab
4. Scroll down to **"Cross-origin resource sharing (CORS)"**
5. Click **"Edit"**

### **Step 2: Add CORS Configuration**

Replace the existing CORS configuration with this:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5000",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": [
            "Content-Length",
            "Content-Range",
            "Content-Type",
            "Accept-Ranges"
        ],
        "MaxAgeSeconds": 3600
    }
]
```

### **Step 3: Configure Bucket Policy**

In the **"Bucket policy"** section, ensure you have proper permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::persi-edu-platform/*",
            "Condition": {
                "StringEquals": {
                    "aws:PrincipalArn": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_IAM_USER"
                }
            }
        }
    ]
}
```

### **Step 4: Set Object Metadata**

For each video file in S3, ensure proper metadata:

1. Select the video file in S3
2. Click **"Properties"**
3. Scroll to **"Metadata"**
4. Add these key-value pairs:
   - `Content-Type`: `video/mp4` (or appropriate type)
   - `Cache-Control`: `public, max-age=3600`

## 🔧 **Backend Improvements**

The backend has been updated to include proper headers in signed URLs:

```javascript
const command = new GetObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: video.s3Key,
  ResponseContentType: getContentType(video.s3Key),
  ResponseContentDisposition: 'inline',
  ResponseCacheControl: 'public, max-age=3600'
});
```

## 🧪 **Testing the Fix**

Run the S3 test script to verify the configuration:

```bash
cd server
node test-s3-video-access.mjs
```

This will check:
- ✅ S3 credentials and bucket access
- ✅ Video URL accessibility
- ✅ Content-Type headers
- ✅ CORS configuration
- ✅ Browser compatibility

## 🌐 **Browser Compatibility**

Ensure your videos are in a web-compatible format:

### **Recommended Formats**
- **MP4 with H.264 codec** (most compatible)
- **WebM** (good for modern browsers)
- **OGG** (fallback option)

### **Video Encoding Settings**
```
Codec: H.264
Resolution: 720p or 1080p
Bitrate: 1-2 Mbps
Audio: AAC, 128kbps
Container: MP4
```

## 🔍 **Troubleshooting**

### **If videos still don't play:**

1. **Check browser console** for CORS errors
2. **Verify S3 bucket region** matches your configuration
3. **Test with a simple MP4 file** first
4. **Check video file format** and encoding
5. **Verify IAM permissions** for S3 access

### **Common Error Messages**

- `CORS policy: No 'Access-Control-Allow-Origin' header`: CORS not configured
- `MEDIA_ERR_SRC_NOT_SUPPORTED`: Video format not supported
- `MEDIA_ERR_NETWORK`: Network/CORS issues

## 📋 **Checklist**

- [ ] S3 CORS configuration updated
- [ ] Bucket policy configured
- [ ] Video metadata set correctly
- [ ] Backend signed URL generation updated
- [ ] Test script passes all checks
- [ ] Videos are in web-compatible format

## 🎯 **Expected Result**

After implementing these changes:

1. **Videos should load** without CORS errors
2. **Content-Type headers** should be correct
3. **Browser compatibility** should be improved
4. **Error handling** should provide better feedback

The enhanced error handling system will now automatically retry with fresh URLs and provide clear error messages if issues persist. 