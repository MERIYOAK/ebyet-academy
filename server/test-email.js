const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration() {
  console.log('📧 Testing Email Configuration...\n');

  // Check if SMTP credentials are available
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('❌ SMTP credentials not found in .env file');
    console.log('💡 Please add these to your .env file:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASSWORD=your-app-password');
    return;
  }

  console.log('✅ SMTP credentials found');
  console.log(`   - Host: ${process.env.SMTP_HOST}`);
  console.log(`   - User: ${process.env.SMTP_USER}`);
  console.log(`   - Port: ${process.env.SMTP_PORT || 587}`);

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    // Test connection
    console.log('\n🔍 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    console.log('\n📤 Sending test email...');
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: testEmail,
              subject: 'Test Email - QENDIEL Academy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">QENDIEL Academy</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #374151; margin-bottom: 20px;">Email Configuration Test</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              This is a test email to verify that your SMTP configuration is working correctly.
              If you received this email, your email verification system is ready to use!
            </p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; color: #374151;">
              <p style="margin: 0;"><strong>Test Details:</strong></p>
              <p style="margin: 5px 0;">✅ SMTP Host: ${process.env.SMTP_HOST}</p>
              <p style="margin: 5px 0;">✅ SMTP Port: ${process.env.SMTP_PORT || 587}</p>
              <p style="margin: 5px 0;">✅ Authentication: Successful</p>
              <p style="margin: 5px 0;">✅ Email Delivery: Working</p>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-top: 25px;">
              Your email verification system is now configured and ready to send verification emails to new users.
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                          <p style="margin: 0;">© 2024 QENDIEL Academy. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
        Email Configuration Test - QENDIEL Academy
        
        This is a test email to verify that your SMTP configuration is working correctly.
        If you received this email, your email verification system is ready to use!
        
        Test Details:
        ✅ SMTP Host: ${process.env.SMTP_HOST}
        ✅ SMTP Port: ${process.env.SMTP_PORT || 587}
        ✅ Authentication: Successful
        ✅ Email Delivery: Working
        
        Your email verification system is now configured and ready to send verification emails to new users.
        
        Best regards,
                  The QENDIEL Academy Team
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Test email sent successfully to: ${testEmail}`);
    console.log('📧 Check your inbox for the test email');

    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('💡 Your authentication system can now send verification emails.');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Common solutions:');
      console.log('   1. Make sure 2-Factor Authentication is enabled on your Gmail account');
      console.log('   2. Generate a new App Password (not your regular Gmail password)');
      console.log('   3. Check that the App Password is copied correctly (16 characters)');
      console.log('   4. Ensure your Gmail account allows "less secure app access" or use App Passwords');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Connection issues:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify the SMTP host and port are correct');
      console.log('   3. Make sure your firewall isn\'t blocking the connection');
    }
  }
}

// Run the test
testEmailConfiguration(); 