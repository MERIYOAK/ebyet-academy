/**
 * CDN Security Configuration for Video Content Protection
 * This module provides security headers and configurations for CDN integration
 */

class CDNSecurityConfig {
  constructor() {
    this.securityHeaders = {
      // Prevent caching of sensitive content
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      
      // Security headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Content protection
      'X-Download-Disabled': 'true',
      'X-Recording-Disabled': 'true',
      'X-Content-Protection': 'DRM',
      'X-DRM-Enabled': 'true',
      
      // CORS headers for secure cross-origin requests
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      
      // Additional security
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' blob:; connect-src 'self' https:;"
    };
  }

  /**
   * Get security headers for video content
   */
  getVideoSecurityHeaders(sessionId, userId, videoId) {
    const headers = {
      ...this.securityHeaders,
      'X-Content-Type': 'video/mp4',
      'X-Disposition': 'inline',
      'X-Allow-Download': 'false',
      'X-Allow-Recording': 'false',
      'X-Allow-Screenshot': 'false'
    };

    // Only add headers if values are defined
    if (sessionId) {
      headers['X-DRM-Session'] = sessionId;
    }
    if (userId) {
      headers['X-User-ID'] = userId;
    }
    if (videoId) {
      headers['X-Video-ID'] = videoId;
    }

    return headers;
  }

  /**
   * Get security headers for API responses
   */
  getAPISecurityHeaders() {
    return {
      ...this.securityHeaders,
      'Content-Type': 'application/json',
      'X-API-Version': '1.0',
      'X-Security-Level': 'high'
    };
  }

  /**
   * Get CORS configuration for CDN
   */
  getCORSConfig() {
    return {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        process.env.CLIENT_URL || 'http://localhost:5173'
      ].filter(Boolean),
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-DRM-Session',
        'X-User-ID',
        'X-Video-ID'
      ]
    };
  }

  /**
   * Validate CDN request
   */
  validateCDNRequest(req) {
    const requiredHeaders = ['authorization', 'x-drm-session', 'x-user-id', 'x-video-id'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
    
    if (missingHeaders.length > 0) {
      return {
        valid: false,
        reason: `Missing required headers: ${missingHeaders.join(', ')}`
      };
    }

    // Validate session
    const sessionId = req.headers['x-drm-session'];
    const userId = req.headers['x-user-id'];
    const videoId = req.headers['x-video-id'];

    if (!sessionId || !userId || !videoId) {
      return {
        valid: false,
        reason: 'Invalid session or user data'
      };
    }

    return {
      valid: true,
      sessionId,
      userId,
      videoId
    };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More lenient in development
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for admin users and development
        if (process.env.NODE_ENV === 'development') {
          return true;
        }
        return req.user && req.user.role === 'admin';
      }
    };
  }

  /**
   * Get video streaming security configuration
   */
  getVideoStreamingConfig() {
    return {
      // Maximum video file size (in bytes)
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
      
      // Allowed video formats
      allowedFormats: ['video/mp4', 'video/webm', 'video/ogg'],
      
      // Streaming chunk size
      chunkSize: 64 * 1024, // 64KB
      
      // Maximum concurrent streams per user
      maxConcurrentStreams: 3,
      
      // Session timeout (in milliseconds)
      sessionTimeout: 60 * 60 * 1000, // 1 hour
      
      // Watermark settings
      watermark: {
        enabled: true,
        opacity: 0.1,
        fontSize: 24,
        position: 'center'
      }
    };
  }

  /**
   * Get CDN cache configuration
   */
  getCDNCacheConfig() {
    return {
      // Cache static assets for 1 year
      staticAssets: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      
      // Don't cache video content
      videoContent: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      
      // Cache API responses for 5 minutes
      apiResponses: {
        'Cache-Control': 'private, max-age=300'
      }
    };
  }

  /**
   * Get security monitoring configuration
   */
  getSecurityMonitoringConfig() {
    return {
      // Log security events
      logSecurityEvents: true,
      
      // Monitor for suspicious activity
      monitorSuspiciousActivity: true,
      
      // Alert thresholds
      alertThresholds: {
        failedAttempts: 5,
        suspiciousDownloads: 3,
        concurrentSessions: 5
      },
      
      // Security event types to monitor
      eventTypes: [
        'unauthorized_access',
        'suspicious_download',
        'session_abuse',
        'rate_limit_exceeded',
        'invalid_session'
      ]
    };
  }
}

module.exports = new CDNSecurityConfig();
