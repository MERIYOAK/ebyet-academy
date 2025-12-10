const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate admin JWT token
const generateAdminToken = () => {
  return jwt.sign(
    { 
      role: 'admin',
      type: 'admin'
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// Validate admin credentials
const validateAdminCredentials = async (email, password) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    throw new Error('Admin credentials not configured');
  }

  // Check email
  if (email !== adminEmail) {
    return false;
  }

  // Check password using bcrypt
  const isPasswordValid = await bcrypt.compare(password, adminPasswordHash);
  return isPasswordValid;
};

exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address' 
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate admin credentials
    const isValid = await validateAdminCredentials(email, password);
    
    if (!isValid) {
      return res.status(401).json({ 
        message: 'Invalid admin credentials' 
      });
    }

    // Generate admin token
    const adminToken = generateAdminToken();

    res.json({
      success: true,
      message: 'Admin login successful',
      token: adminToken,
      user: {
        email: email,
        role: 'admin',
        type: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      message: 'Internal server error during admin login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 