const authService = require('../services/authService');

const auth = async (req, res, next) => {
  try {
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = authService.verifyToken(token);
    
    // Check if this is an admin token (different structure)
    if (decoded.role === 'admin' && decoded.type === 'admin') {
      // For admin tokens, just pass through - adminAuth middleware will handle validation
      req.user = decoded;
      return next();
    }
    
    // For user tokens, check token version and user status
    const User = require('../models/User');
    const user = await User.findById(decoded.userId);
    
    console.log('🔍 Auth middleware debug:', {
      decodedUserId: decoded.userId,
      foundUser: user ? 'yes' : 'no',
      userStatus: user?.status,
      tokenVersion: decoded.tokenVersion,
      userTokenVersion: user?.tokenVersion
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if token version matches current user token version
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please log in again.'
      });
    }
    
    // Check if user is still active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }
    
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      ...decoded
    };
    
    console.log('✅ Auth middleware success - req.user set:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = auth;