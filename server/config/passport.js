const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Configure Google OAuth Strategy only if environment variables are set
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {

      // Store the profile in the request for the callback controller
      return done(null, profile);
    } catch (error) {
      console.error('âŒ Google OAuth strategy error:', error);
      return done(error, null);
    }
  }));

} else {
}

// Serialize user for session (not used in stateless JWT)
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session (not used in stateless JWT)
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport; 