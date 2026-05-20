/**
 * Version Routes
 * Provides version information for client-side deployment change detection.
 *
 * All values are captured once at module load time so they remain stable
 * across requests (buildTime must not change per-request or the frontend
 * will see a false "new deployment" on every poll).
 */

const express = require('express');
const router = express.Router();

const versionInfo = {
  version:     process.env.APP_VERSION    || '1.0.0',
  buildHash:   (process.env.RENDER_GIT_COMMIT || '').slice(0, 7) || process.env.BUILD_HASH || 'development',
  buildTime:   process.env.BUILD_TIME     || new Date().toISOString(),
  environment: process.env.NODE_ENV       || 'development',
};

router.get('/', (req, res) => {
  res.json({ success: true, data: versionInfo });
});

module.exports = router;
