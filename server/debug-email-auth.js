const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔧 Gmail Authentication Diagnostic Tool\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || '❌ NOT SET'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '❌ NOT SET'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || '❌ NOT SET'}`);
console.log(`   SMTP_PASSWORD: ${process.env.SMTP_PASSWORD ? '✅ SET (' + process.env.SMTP_PASSWORD.length + ' chars)' : '❌ NOT SET'}`);
console.log(`   SMTP_FROM: ${process.env.SMTP_FROM || '❌ NOT SET'}`);
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ NOT SET'}\n`);

// Check if all required variables are set
const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\n💡 To fix this, create a .env file in the server directory with:');
  console.log(`
# =============================================================================
# EMAIL CONFIGURATION (GMAIL SMTP)
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_character_app_password_here
SMTP_FROM=your_email@gmail.com
FRONTEND_URL=http://localhost:5173
  `);
  process.exit(1);
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

console.log('🔍 Email Format Validation:');
if (!isValidEmail(process.env.SMTP_USER)) {
  console.log(`   ❌ Invalid email format: ${process.env.SMTP_USER}`);
  console.log('   💡 Please use a valid Gmail address (e.g., yourname@gmail.com)');
  process.exit(1);
} else {
  console.log(`   ✅ Valid email format: ${process.env.SMTP_USER}`);
}

// Check if it's a Gmail address
if (!process.env.SMTP_USER.endsWith('@gmail.com')) {
  console.log(`   ⚠️  Not a Gmail address: ${process.env.SMTP_USER}`);
  console.log('   💡 This tool is designed for Gmail. For other providers, check their SMTP settings.');
}

// Validate app password format
console.log('\n🔑 App Password Validation:');
const appPassword = process.env.SMTP_PASSWORD;
if (appPassword.length !== 16) {
  console.log(`   ❌ App password should be 16 characters, got ${appPassword.length}`);
  console.log('   💡 Gmail app passwords are exactly 16 characters');
  console.log('   💡 Make sure you copied the entire password without spaces');
} else {
  console.log(`   ✅ App password length correct: ${appPassword.length} characters`);
}

// Check for spaces in app password
if (appPassword.includes(' ')) {
  console.log('   ❌ App password contains spaces');
  console.log('   💡 Remove all spaces from the app password');
  console.log(`   💡 Current: "${appPassword}"`);
  console.log(`   💡 Should be: "${appPassword.replace(/\s/g, '')}"`);
} else {
  console.log('   ✅ App password has no spaces');
}

// Test SMTP connection with detailed error handling
async function testSMTPConnection() {
  console.log('\n🧪 Testing SMTP Connection...');
  
  try {
         const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      debug: true, // Enable debug output
      logger: true // Log to console
    });

    console.log('   🔍 Attempting to verify connection...');
    
    // Verify connection configuration
    await transporter.verify();
    console.log('   ✅ SMTP connection successful!');
    
    // Test sending a simple email
    console.log('   📧 Testing email sending...');
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: testEmail,
              subject: 'Test Email - QENDIEL Academy',
      text: 'This is a test email to verify SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QENDIEL Academy</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151; margin-bottom: 20px;">SMTP Test Successful!</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              This email confirms that your SMTP configuration is working correctly.
              Password reset emails will now be sent properly.
            </p>
            <p style="color: #6b7280; line-height: 1.6;">
              <strong>Configuration Details:</strong><br>
              Host: ${process.env.SMTP_HOST}<br>
              Port: ${process.env.SMTP_PORT || 587}<br>
              User: ${process.env.SMTP_USER}
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('   ✅ Test email sent successfully!');
    console.log(`   📧 Message ID: ${info.messageId}`);
    console.log(`   📧 Sent to: ${testEmail}`);
    
    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('   Password reset emails will now be sent properly.');
    
  } catch (error) {
    console.error('   ❌ SMTP Test Failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔑 Gmail Authentication Error:');
      console.log('   This error means Gmail rejected your credentials.');
      console.log('\n💡 Common causes and solutions:');
      console.log('\n   1. 2-Factor Authentication not enabled:');
      console.log('      - Go to your Google Account settings');
      console.log('      - Enable 2-Factor Authentication');
      console.log('      - This is required for app passwords');
      
      console.log('\n   2. App password not generated:');
      console.log('      - Go to Google Account → Security → 2-Step Verification');
      console.log('      - Scroll down to "App passwords"');
      console.log('      - Click "Generate new app password"');
      console.log('      - Select "Mail" as the app');
      console.log('      - Copy the 16-character password');
      
      console.log('\n   3. Wrong email address:');
      console.log(`      - Current email: ${process.env.SMTP_USER}`);
      console.log('      - Make sure this is the same email where you generated the app password');
      
      console.log('\n   4. App password format issues:');
      console.log('      - Remove all spaces from the app password');
      console.log('      - Make sure it\'s exactly 16 characters');
      console.log(`      - Current password length: ${process.env.SMTP_PASSWORD.length}`);
      
      console.log('\n   5. Account security settings:');
      console.log('      - Check if "Less secure app access" is enabled (not recommended)');
      console.log('      - Use app passwords instead of your regular password');
      
      console.log('\n🔧 Step-by-step fix:');
      console.log('   1. Go to https://myaccount.google.com/security');
      console.log('   2. Enable 2-Step Verification if not enabled');
      console.log('   3. Go to "App passwords"');
      console.log('   4. Generate a new app password for "Mail"');
      console.log('   5. Copy the 16-character password (no spaces)');
      console.log('   6. Update your .env file with the new password');
      console.log('   7. Restart your server');
      
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🌐 Network Error:');
      console.log('   Check your internet connection and SMTP host settings');
    } else {
      console.log('\n❓ Unknown Error:');
      console.log('   Please check your SMTP configuration and try again');
      console.log('   Error details:', error);
    }
  }
}

// Run the test
testSMTPConnection();
