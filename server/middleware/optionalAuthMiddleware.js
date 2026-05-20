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
      } catch (error) {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error('âŒ Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;