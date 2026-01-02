const authService = require('../services/authService');

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
        // Ensure userId is set from any possible field
        if (!req.user.userId && req.user.id) {
          req.user.userId = req.user.id;
        } else if (!req.user.userId && req.user._id) {
          req.user.userId = req.user._id;
        }
        console.log('🔧 [optionalAuth] User authenticated:', {
          userId: req.user.userId || req.user.id || req.user._id,
          email: decoded.email,
          role: decoded.role,
          decodedKeys: Object.keys(decoded)
        });
      } catch (error) {
        console.log('⚠️ [optionalAuth] Invalid token provided, continuing as public user');
        req.user = null;
      }
    } else {
      console.log('🔧 [optionalAuth] No token provided, continuing as public user');
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error('❌ Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
