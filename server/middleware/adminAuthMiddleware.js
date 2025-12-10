const jwt = require('jsonwebtoken');

const adminAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'No admin token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Invalid token format' 
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin token
    if (decoded.role !== 'admin' || decoded.type !== 'admin') {
      return res.status(403).json({ 
        message: 'Admin access required' 
      });
    }

    // Add admin info to request
    req.admin = {
      email: process.env.ADMIN_EMAIL,
      role: 'admin',
      type: 'admin'
    };

    // Add user ID for admin operations (using admin email as unique identifier)
    req.user = {
      id: 'admin',
      role: 'admin',
      email: process.env.ADMIN_EMAIL
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid admin token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Admin token expired' 
      });
    }
    return res.status(500).json({ 
      message: 'Token verification failed' 
    });
  }
};

module.exports = adminAuthMiddleware; 