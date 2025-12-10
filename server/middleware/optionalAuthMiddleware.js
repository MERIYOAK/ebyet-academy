const authService = require('../services/authService');

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
        console.log('🔧 [optionalAuth] User authenticated:', {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role
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
