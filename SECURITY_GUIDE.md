# Security Guide - Preventing Secret Exposure

## 🚨 CRITICAL: Recent Security Issue Resolved

**Issue**: MongoDB Atlas Database URI with credentials was hardcoded in `server/fix-certificate-hashes.js`

**Status**: ✅ **FIXED** - Updated to use environment variables

**Action Taken**: 
- Replaced hardcoded MongoDB URI with `process.env.MONGODB_URI`
- Added proper error handling for missing environment variables

## 🔐 Security Best Practices

### 1. Environment Variables
**ALWAYS** use environment variables for sensitive data:

```javascript
// ❌ WRONG - Never hardcode credentials
await mongoose.connect('mongodb+srv://username:password@cluster.mongodb.net/database');

// ✅ CORRECT - Use environment variables
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}
await mongoose.connect(MONGODB_URI);
```

### 2. Environment File Setup
Create a `.env` file in the server directory:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AWS
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Git Security Checklist

Before committing code, always check:

- [ ] No hardcoded passwords, API keys, or secrets
- [ ] No database connection strings with credentials
- [ ] No AWS access keys or secret keys
- [ ] No JWT secrets or private keys
- [ ] No OAuth client secrets
- [ ] `.env` files are in `.gitignore`
- [ ] No sensitive data in comments or logs

### 4. Pre-commit Security Scan

Add this to your development workflow:

```bash
# Search for potential secrets in your codebase
grep -r "mongodb+srv://" .
grep -r "sk_" .
grep -r "pk_" .
grep -r "AKIA" .
grep -r "ghp_" .
grep -r "gho_" .
```

### 5. GitHub Security Features

Enable these GitHub features:
- **Dependabot alerts** for vulnerable dependencies
- **Code scanning** with GitHub Advanced Security
- **Secret scanning** to detect exposed secrets
- **Branch protection rules** to prevent direct pushes to main

### 6. Immediate Actions Required

1. **Rotate MongoDB Password**: Change the password for the MongoDB Atlas user
2. **Review Git History**: Check if the secret was exposed in previous commits
3. **Monitor for Unauthorized Access**: Check MongoDB Atlas logs for suspicious activity
4. **Update All Team Members**: Ensure everyone follows these security practices

### 7. Emergency Response Plan

If secrets are exposed:

1. **Immediate Actions**:
   - Revoke/rotate the exposed credentials immediately
   - Remove the secret from git history if possible
   - Check for unauthorized access

2. **Investigation**:
   - Review git logs to see when the secret was exposed
   - Check if the repository was forked or cloned
   - Monitor for suspicious activity

3. **Prevention**:
   - Update security practices
   - Implement automated secret scanning
   - Train team members on security best practices

## 🔍 Current Security Status

### ✅ Properly Configured
- Environment variables used throughout codebase
- `.gitignore` properly excludes `.env` files
- Most files use `process.env.*` for sensitive data

### ⚠️ Areas to Monitor
- Script files (like `fix-certificate-hashes.js`) - ensure they use env vars
- Test files - ensure they don't contain real credentials
- Documentation - ensure examples use placeholder values

### 🛡️ Recommended Tools
- **GitGuardian** or **TruffleHog** for secret scanning
- **Husky** for pre-commit hooks
- **ESLint** rules for detecting hardcoded secrets

## 📞 Emergency Contacts

If you discover a security breach:
1. Immediately rotate all exposed credentials
2. Contact your team lead
3. Document the incident and response
4. Update this security guide with lessons learned

---

**Remember**: Security is everyone's responsibility. When in doubt, ask before committing sensitive data!
