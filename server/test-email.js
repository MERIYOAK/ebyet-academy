/**
 * Email System Test Script
 * Tests SendGrid configuration and sends a test email
 */

require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmailSystem() {
  console.log('\n📧 Testing Email System Configuration...\n');
  console.log('='.repeat(60));

  // Check configuration
  console.log('\n1️⃣ Checking Configuration:');
  console.log('-'.repeat(60));
  
  const isConfigured = emailService.isEmailConfigured();
  const useSendGrid = emailService.useSendGrid;
  
  console.log(`✅ Email Service Configured: ${isConfigured ? 'YES' : 'NO'}`);
  console.log(`✅ Using SendGrid: ${useSendGrid ? 'YES (Best for inbox delivery)' : 'NO (Using SMTP fallback)'}`);
  
  if (process.env.SENDGRID_API_KEY) {
    console.log(`✅ SENDGRID_API_KEY: SET (${process.env.SENDGRID_API_KEY.substring(0, 10)}...)`);
  } else {
    console.log(`❌ SENDGRID_API_KEY: NOT SET`);
  }
  
  console.log(`✅ FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET (will use default)'}`);
  console.log(`✅ FROM_NAME: ${process.env.FROM_NAME || 'NOT SET (will use default)'}`);
  console.log(`✅ REPLY_TO_EMAIL: ${process.env.REPLY_TO_EMAIL || 'NOT SET'}`);
  console.log(`✅ CONTACT_FORM_RECIPIENT: ${process.env.CONTACT_FORM_RECIPIENT || 'ibyet.course@gmail.com (default)'}`);

  if (!isConfigured) {
    console.log('\n❌ Email service is not configured!');
    console.log('\n💡 To configure SendGrid:');
    console.log('   1. Add SENDGRID_API_KEY to your .env file');
    console.log('   2. Add FROM_EMAIL="Ibyet Investing <noreply@ibyet.com>" to your .env file');
    console.log('   3. Verify your domain in SendGrid dashboard');
    process.exit(1);
  }

  // Test email sending
  console.log('\n2️⃣ Testing Email Sending:');
  console.log('-'.repeat(60));
  
  const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'ibyet.course@gmail.com';
  console.log(`📨 Sending test email to: ${testEmail}`);
  console.log(`📤 From: ${process.env.FROM_EMAIL || 'noreply@ibyet-investing.com'}`);
  console.log(`🔧 Service: ${useSendGrid ? 'SendGrid' : 'SMTP'}`);
  
  try {
    const result = await emailService.sendTestEmail(testEmail);
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Test email sent successfully!');
      console.log(`   Service: ${result.service}`);
      console.log(`   Message: ${result.message}`);
      console.log('\n📬 Check your inbox (and spam folder if needed)');
      console.log('   If email is in inbox → ✅ SendGrid is working perfectly!');
      console.log('   If email is in spam → ⚠️  Check domain verification in SendGrid');
    } else {
      console.log('\n❌ FAILED to send test email');
      console.log(`   Error: ${result.message}`);
      if (result.error) {
        console.log(`   Details: ${JSON.stringify(result.error, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('\n❌ ERROR sending test email:');
    console.error(error);
  }

  // Check SendGrid domain verification
  if (useSendGrid) {
    console.log('\n3️⃣ SendGrid Domain Verification:');
    console.log('-'.repeat(60));
    console.log('💡 Make sure your domain (ibyet.com) is verified in SendGrid:');
    console.log('   1. Go to: https://app.sendgrid.com');
    console.log('   2. Navigate to: Settings → Sender Authentication');
    console.log('   3. Verify domain authentication is complete');
    console.log('   4. Check that FROM_EMAIL matches verified sender');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Email System Test Complete!\n');
}

// Run the test
testEmailSystem().catch(console.error);


