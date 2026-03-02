/**
 * Version Routes
 * Provides version information for client-side update detection
 */

const express = require('express');
const router = express.Router();

// Get version information
router.get('/', (req, res) => {
  try {
    const versionInfo = {
      version: process.env.APP_VERSION || '1.0.0',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      buildHash: process.env.BUILD_HASH || 'development',
      environment: process.env.NODE_ENV || 'development',
      deployTime: new Date().toISOString()
    };

    res.json({
      success: true,
      data: versionInfo
    });
  } catch (error) {
    console.error('Version endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get version information'
    });
  }
});

module.exports = router;
