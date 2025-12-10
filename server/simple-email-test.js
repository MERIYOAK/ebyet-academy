const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔧 Simple Email Configuration Test\n');

// Display current configuration
console.log('📋 Current Configuration:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET'}`);
console.log(`   SMTP_FROM: ${process.env.SMTP_FROM}`);
console.log(`   FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}\n`);

// Check for common issues
console.log('🔍 Configuration Issues:');
if (process.env.FROM_EMAIL) {
  console.log('   ⚠️  Found FROM_EMAIL - should be SMTP_FROM');
}
if (!process.env.SMTP_FROM) {
  console.log('   ❌ SMTP_FROM not set');
}
if (process.env.SMTP_PASSWORD && process.env.SMTP_PASSWORD.includes(' ')) {
  console.log('   ❌ SMTP_PASSWORD contains spaces');
}
if (process.env.SMTP_PASSWORD && process.env.SMTP_PASSWORD.length !== 16) {
  console.log(`   ❌ SMTP_PASSWORD should be 16 chars, got ${process.env.SMTP_PASSWORD.length}`);
}

console.log('\n💡 Recommendations:');
console.log('   1. Make sure 2-Factor Authentication is enabled on your Google account');
console.log('   2. Generate a new app password from Google Account settings');
console.log('   3. Use SMTP_FROM instead of FROM_EMAIL');
console.log('   4. Remove all spaces from the app password');
console.log('   5. Make sure the app password is exactly 16 characters');

console.log('\n🔗 Quick Links:');
console.log('   - Google Account Security: https://myaccount.google.com/security');
console.log('   - App Passwords: https://myaccount.google.com/apppasswords');
