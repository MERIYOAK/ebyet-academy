const crypto = require('crypto');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../utils/s3Enhanced').s3Client;

class DRMService {
  constructor() {
    this.encryptionKey = process.env.DRM_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.activeSessions = new Map();
    this.sessionTimeout = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Generate DRM session for video access
   */
  async generateDRMSession(userId, videoId, courseId) {
    try {
      const sessionId = crypto.randomUUID();
      const sessionKey = crypto.randomBytes(32);
      const watermarkData = this.generateWatermarkData(userId, videoId);
      
      const session = {
        sessionId,
        userId,
        videoId,
        courseId,
        sessionKey: sessionKey.toString('hex'),
        watermarkData,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.sessionTimeout,
        accessCount: 0,
        maxAccessCount: 100 // Limit access attempts
      };

      this.activeSessions.set(sessionId, session);

      // Clean up expired sessions
      this.cleanupExpiredSessions();

      console.log(`🔒 DRM Session created: ${sessionId} for user ${userId}`);
      return session;
    } catch (error) {
      console.error('❌ Failed to generate DRM session:', error);
      throw error;
    }
  }

  /**
   * Validate DRM session
   */
  validateDRMSession(sessionId, userId, videoId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (session.expiresAt < Date.now()) {
      this.activeSessions.delete(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    if (session.userId !== userId || session.videoId !== videoId) {
      return { valid: false, reason: 'Session mismatch' };
    }

    if (session.accessCount >= session.maxAccessCount) {
      return { valid: false, reason: 'Access limit exceeded' };
    }

    // Increment access count
    session.accessCount++;
    this.activeSessions.set(sessionId, session);

    return { valid: true, session };
  }

  /**
   * Generate encrypted video URL with DRM protection
   */
  async generateEncryptedVideoUrl(videoS3Key, sessionId, userId, videoId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid DRM session');
      }

      // Check if S3 client is available
      if (!s3Client) {
        console.error('❌ S3 client not available for DRM video URL generation');
        throw new Error('S3 client not configured');
      }

      // Get bucket name (handle both environment variable names)
      const bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET;
      if (!bucketName) {
        throw new Error('AWS S3 bucket name not configured');
      }

      // Generate short-lived signed URL (5 minutes)
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: videoS3Key,
        ResponseContentDisposition: 'inline', // Prevent download
        ResponseContentType: 'video/mp4'
      });

      const signedUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 300 // 5 minutes
      });

      // Encrypt the URL with session key
      const encryptedUrl = this.encryptUrl(signedUrl, session.sessionKey);

      // Add security headers
      const securityHeaders = {
        'X-DRM-Session': sessionId,
        'X-User-ID': userId,
        'X-Video-ID': videoId,
        'X-Watermark': session.watermarkData,
        'X-Content-Type': 'video/mp4',
        'X-Disposition': 'inline'
      };

      return {
        encryptedUrl,
        securityHeaders,
        expiresIn: 300,
        watermarkData: session.watermarkData
      };
    } catch (error) {
      console.error('❌ Failed to generate encrypted video URL:', error);
      throw error;
    }
  }

  /**
   * Generate forensic watermark data
   */
  generateForensicWatermark(userId, videoId, sessionId) {
    const timestamp = Date.now();
    const userHash = crypto.createHash('sha256')
      .update(userId + videoId + sessionId + timestamp)
      .digest('hex')
      .substring(0, 16);
    
    return {
      userId: userId.substring(0, 8),
      videoId: videoId.substring(0, 8),
      sessionId: sessionId.substring(0, 8),
      timestamp,
      hash: userHash,
      watermark: `${userId.substring(0, 4)}-${userHash}`
    };
  }

  /**
   * Generate user-specific watermark data
   */
  generateWatermarkData(userId, videoId) {
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256')
      .update(userId + videoId + timestamp)
      .digest('hex')
      .substring(0, 12);
    
    return `${userId.substring(0, 4)}-${hash}`;
  }

  /**
   * Encrypt URL with session key
   */
  encryptUrl(url, sessionKey) {
    // Create a proper key and IV from the session key
    const key = crypto.createHash('sha256').update(sessionKey).digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt URL with session key
   */
  decryptUrl(encryptedUrl, sessionKey) {
    try {
      // Split IV and encrypted data
      const parts = encryptedUrl.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted URL format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create the same key used for encryption
      const key = crypto.createHash('sha256').update(sessionKey).digest();
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('❌ Failed to decrypt URL:', error);
      throw new Error('Failed to decrypt URL');
    }
  }

  /**
   * Generate session-based access token
   */
  generateSessionToken(userId, videoId, sessionId) {
    const payload = {
      userId,
      videoId,
      sessionId,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.sessionTimeout
    };

    const token = crypto.createHmac('sha256', this.encryptionKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return {
      token,
      payload: Buffer.from(JSON.stringify(payload)).toString('base64')
    };
  }

  /**
   * Validate session token
   */
  validateSessionToken(token, payload) {
    try {
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
      
      if (decodedPayload.expiresAt < Date.now()) {
        return { valid: false, reason: 'Token expired' };
      }

      const expectedToken = crypto.createHmac('sha256', this.encryptionKey)
        .update(JSON.stringify(decodedPayload))
        .digest('hex');

      if (token !== expectedToken) {
        return { valid: false, reason: 'Invalid token' };
      }

      return { valid: true, payload: decodedPayload };
    } catch (error) {
      return { valid: false, reason: 'Invalid token format' };
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
        console.log(`🧹 Cleaned up expired DRM session: ${sessionId}`);
      }
    }
  }

  /**
   * Get DRM session by ID
   */
  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      this.activeSessions.delete(sessionId);
      return null;
    }
    
    return session;
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const now = Date.now();
    const activeSessions = Array.from(this.activeSessions.values())
      .filter(session => session.expiresAt > now);

    return {
      totalSessions: this.activeSessions.size,
      activeSessions: activeSessions.length,
      expiredSessions: this.activeSessions.size - activeSessions.length
    };
  }

  /**
   * Revoke DRM session
   */
  revokeSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      this.activeSessions.delete(sessionId);
      console.log(`🚫 DRM session revoked: ${sessionId}`);
      return true;
    }
    return false;
  }

  /**
   * Generate CDN security headers
   */
  generateCDNSecurityHeaders(sessionId, userId, videoId) {
    return {
      'X-DRM-Enabled': 'true',
      'X-Session-ID': sessionId,
      'X-User-ID': userId,
      'X-Video-ID': videoId,
      'X-Content-Protection': 'DRM',
      'X-Download-Disabled': 'true',
      'X-Recording-Disabled': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }
}

module.exports = new DRMService();
