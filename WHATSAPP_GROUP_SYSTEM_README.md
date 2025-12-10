# WhatsApp Group Access System

A secure, token-based system for managing WhatsApp course groups without using the WhatsApp Business API.

## 🎯 Overview

This system allows enrolled students to securely access course-specific WhatsApp groups through a token-based authentication mechanism. The actual WhatsApp group links are hidden from the frontend and only accessible through validated tokens.

## 🔧 Features

- **Secure Token Generation**: JWT-based tokens with expiration (default: 1 hour)
- **Enrollment Verification**: Only enrolled students can access group tokens
- **Payment Validation**: Paid course students must have completed payment
- **One-time Use Tokens**: Tokens are consumed after use for security
- **Hidden Group Links**: WhatsApp links are never exposed in frontend code
- **Multi-language Support**: English and Tigrinya translations included

## 🏗️ Architecture

### Backend Components

1. **Models**:
   - `Course.js`: Added `whatsappGroupLink` and `hasWhatsappGroup` fields
   - `GroupAccessToken.js`: New model for managing access tokens

2. **Routes**:
   - `GET /api/courses/:courseId/group-token`: Generate access token
   - `GET /api/courses/:courseId/join?token=...`: Validate token and redirect

3. **Controllers**:
   - `generateGroupToken()`: Creates secure access tokens
   - `joinGroup()`: Validates tokens and redirects to WhatsApp

### Frontend Components

1. **WhatsAppGroupButton**: React component for joining groups
2. **Integration**: Added to VideoPlayerPage and UserCourseDetailPage
3. **Translations**: English and Tigrinya support

## 🚀 Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# WhatsApp Group Configuration
WHATSAPP_TOKEN_EXPIRY_HOURS=1
DEFAULT_WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/your_default_group_link
```

### 2. Database Setup

The system automatically creates the necessary database collections. No manual setup required.

### 3. Course Configuration

To enable WhatsApp groups for a course, set these fields in the Course model:

```javascript
{
  hasWhatsappGroup: true,
  whatsappGroupLink: "https://chat.whatsapp.com/your-group-link"
}
```

## 📱 Usage

### For Students

1. **Enroll in Course**: Student must be enrolled and have paid (if required)
2. **Access Video Player**: Navigate to any video in the course
3. **Join Group**: Click "Join WhatsApp Group" button
4. **Automatic Redirect**: System validates access and redirects to WhatsApp

### For Administrators

1. **Create WhatsApp Group**: Create a WhatsApp group and get the invite link
2. **Update Course**: Set `hasWhatsappGroup: true` and add the group link
3. **Monitor Access**: Tokens are logged with IP and user agent for security

## 🔒 Security Features

### Token Security
- **Cryptographically Secure**: Uses Node.js crypto.randomBytes()
- **Time-limited**: Tokens expire after 1 hour (configurable)
- **One-time Use**: Tokens are consumed after successful validation
- **IP Tracking**: Logs IP address and user agent for audit

### Access Control
- **Enrollment Check**: Verifies user is enrolled in the course
- **Payment Verification**: Confirms payment completion for paid courses
- **Course Validation**: Ensures course has WhatsApp group enabled

### Data Protection
- **Hidden Links**: WhatsApp links never exposed in frontend
- **Secure Storage**: Tokens stored with expiration in database
- **Audit Trail**: All access attempts logged with metadata

## 🧪 Testing

Run the test suite to verify functionality:

```bash
cd server
node test-whatsapp-group-access.mjs
```

The test suite covers:
- Token generation
- Token validation
- Error handling
- Security scenarios

## 📊 API Endpoints

### Generate Group Token

```http
GET /api/courses/:courseId/group-token
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",
  "expiresAt": "2024-01-01T12:00:00.000Z",
  "joinUrl": "/api/courses/123/join?token=abc123..."
}
```

### Join Group

```http
GET /api/courses/:courseId/join?token=<access-token>
```

**Response:**
- **Success**: 302 Redirect to WhatsApp group
- **Error**: 403/400 with error message

## 🎨 Frontend Integration

### Component Usage

```tsx
import WhatsAppGroupButton from '../components/WhatsAppGroupButton';

<WhatsAppGroupButton
  courseId={courseId}
  isEnrolled={userHasPurchased}
  hasPaid={userHasPurchased}
  hasWhatsappGroup={course.hasWhatsappGroup}
/>
```

### Translation Keys

```json
{
  "whatsapp": {
    "join_group": "Join WhatsApp Group",
    "generating_token": "Generating Access...",
    "error_title": "Unable to Join Group",
    "access_info": "Secure access for enrolled students only"
  }
}
```

## 🔧 Configuration Options

### Token Expiration

```bash
# Set token expiration time (in hours)
WHATSAPP_TOKEN_EXPIRY_HOURS=2
```

### Default Group Link

```bash
# Fallback group link for courses without specific links
DEFAULT_WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/default-group
```

## 🚨 Error Handling

### Common Error Scenarios

1. **Not Enrolled**: "You must be enrolled in this course"
2. **Payment Required**: "You must complete payment to access"
3. **No Group**: "This course does not have a WhatsApp group"
4. **Invalid Token**: "Invalid or expired access token"
5. **Token Used**: "Token has already been used"

### Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error information"
}
```

## 📈 Monitoring & Analytics

### Database Queries

Monitor token usage:

```javascript
// Get token usage statistics
db.groupaccesstokens.aggregate([
  { $group: { _id: "$courseId", count: { $sum: 1 } } }
])

// Get expired tokens
db.groupaccesstokens.find({
  expiresAt: { $lt: new Date() }
})
```

### Log Analysis

All access attempts are logged with:
- User ID
- Course ID
- IP Address
- User Agent
- Timestamp
- Success/Failure status

## 🔄 Maintenance

### Cleanup Expired Tokens

The system automatically cleans up expired tokens using MongoDB TTL indexes. No manual cleanup required.

### Token Rotation

For enhanced security, consider implementing token rotation:

```javascript
// Regenerate tokens periodically
const rotateTokens = async () => {
  await GroupAccessToken.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};
```

## 🛡️ Security Best Practices

1. **Regular Token Cleanup**: Expired tokens are automatically removed
2. **Rate Limiting**: Consider implementing rate limiting on token generation
3. **Audit Logging**: Monitor access patterns for suspicious activity
4. **HTTPS Only**: Ensure all communications use HTTPS
5. **Token Rotation**: Consider implementing token rotation for high-security scenarios

## 🐛 Troubleshooting

### Common Issues

1. **Token Generation Fails**
   - Check user enrollment status
   - Verify payment completion
   - Ensure course has WhatsApp group enabled

2. **Redirect Not Working**
   - Verify WhatsApp group link format
   - Check token expiration
   - Ensure token hasn't been used

3. **Frontend Button Not Showing**
   - Check `hasWhatsappGroup` field in course data
   - Verify user enrollment and payment status
   - Check component props

### Debug Mode

Enable debug logging:

```bash
DEBUG=true node server.js
```

## 📝 Changelog

### Version 1.0.0
- Initial implementation
- Token-based access system
- Frontend integration
- Multi-language support
- Comprehensive testing suite

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the test suite for examples

---

**Note**: This system is designed to be lightweight and secure. It provides a simple way to manage WhatsApp group access without requiring the WhatsApp Business API or complex integrations.
