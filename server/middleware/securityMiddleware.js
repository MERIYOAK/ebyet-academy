const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cdnSecurity = require('../config/cdnSecurity');

/**
 * Security middleware for video content protection
 */
class SecurityMiddleware {
  constructor() {
    this.setupRateLimiting();
    this.setupSecurityHeaders();
  }

  /**
   * Setup rate limiting
   */
  setupRateLimiting() {
    this.rateLimiter = rateLimit(cdnSecurity.getRateLimitConfig());
  }

  /**
   * Setup security headers
   */
  setupSecurityHeaders() {
    this.securityHeaders = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          mediaSrc: ["'self'", "blob:"],
          connectSrc: ["'self'", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true
    });
  }

  /**
   * DRM session validation middleware
   */
  validateDRMSession(req, res, next) {
    try {
      const validation = cdnSecurity.validateCDNRequest(req);
      
      if (!validation.valid) {
        return res.status(403).json({
          success: false,
          message: 'Invalid DRM session',
          reason: validation.reason
        });
      }

      // Add validated data to request
      req.drmSession = {
        sessionId: validation.sessionId,
        userId: validation.userId,
        videoId: validation.videoId
      };

      next();
    } catch (error) {
      console.error('❌ DRM session validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Session validation failed'
      });
    }
  }

  /**
   * Video access control middleware
   */
  async validateVideoAccess(req, res, next) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      const isAdmin = req.user?.role === 'admin';

      if (!videoId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      // Import here to avoid circular dependency
      const { checkVideoAccess } = require('../utils/purchaseUtils');
      const accessInfo = await checkVideoAccess(videoId, userId, isAdmin);

      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this video',
          data: {
            isLocked: true,
            lockReason: accessInfo.lockReason,
            requiresPurchase: accessInfo.lockReason === 'purchase_required'
          }
        });
      }

      req.videoAccess = accessInfo;
      next();
    } catch (error) {
      console.error('❌ Video access validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Access validation failed'
      });
    }
  }

  /**
   * Security monitoring middleware
   */
  securityMonitoring(req, res, next) {
    const config = cdnSecurity.getSecurityMonitoringConfig();
    
    if (config.logSecurityEvents) {
      // Log security-relevant events
      const securityEvent = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.userId || req.user?.id || req.user?._id,
        sessionId: req.headers['x-drm-session'],
        videoId: req.headers['x-video-id'] || req.params.videoId
      };

      // Log to console (in production, this would go to a security monitoring service)
      console.log('🔒 Security Event:', securityEvent);
    }

    next();
  }

  /**
   * Anti-bot protection middleware
   */
  antiBotProtection(req, res, next) {
    const userAgent = req.get('User-Agent');
    
    // Block known bot user agents
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /wget/i,
      /curl/i,
      /python/i,
      /java/i,
      /php/i
    ];

    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    if (isBot) {
      return res.status(403).json({
        success: false,
        message: 'Bot access not allowed'
      });
    }

    next();
  }

  /**
   * Video streaming security middleware
   */
  videoStreamingSecurity(req, res, next) {
    const config = cdnSecurity.getVideoStreamingConfig();
    
    // Add security headers for video streaming
    const securityHeaders = cdnSecurity.getVideoSecurityHeaders(
      req.headers['x-drm-session'],
      req.headers['x-user-id'],
      req.headers['x-video-id']
    );

    Object.entries(securityHeaders).forEach(([key, value]) => {
      // Only set header if value is defined and not null
      if (value !== undefined && value !== null) {
        res.setHeader(key, value);
      }
    });

    // Set additional security measures
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    next();
  }

  /**
   * Session security middleware
   */
  sessionSecurity(req, res, next) {
    // Validate session integrity
    const sessionId = req.headers['x-drm-session'];
    const userId = req.headers['x-user-id'];
    
    if (sessionId && userId) {
      // Check session format
      if (!sessionId.match(/^[a-f0-9-]{36}$/i)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid session format'
        });
      }

      // Check user ID format
      if (!userId.match(/^[a-f0-9]{24}$/i)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }
    }

    next();
  }

  /**
   * Get all security middleware
   */
  getAllMiddleware() {
    return {
      rateLimiter: this.rateLimiter,
      securityHeaders: this.securityHeaders,
      validateDRMSession: this.validateDRMSession.bind(this),
      validateVideoAccess: this.validateVideoAccess.bind(this),
      securityMonitoring: this.securityMonitoring.bind(this),
      antiBotProtection: this.antiBotProtection.bind(this),
      videoStreamingSecurity: this.videoStreamingSecurity.bind(this),
      sessionSecurity: this.sessionSecurity.bind(this)
    };
  }
}

module.exports = new SecurityMiddleware();
