const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

/**
 * Email Service with SendGrid for maximum inbox deliverability
 * 
 * SendGrid is used as PRIMARY method (best deliverability, goes to inbox)
 * SMTP is used as FALLBACK if SendGrid is not configured
 * 
 * To use SendGrid (RECOMMENDED for inbox delivery):
 * 1. Sign up at https://sendgrid.com (Free: 100 emails/day)
 * 2. Create API Key in SendGrid Dashboard
 * 3. Verify your sender email/domain in SendGrid
 * 4. Add to .env: SENDGRID_API_KEY=your-api-key
 * 5. Add to .env: FROM_EMAIL="Ibyet Investing <noreply@yourdomain.com>"
 * 
 * SendGrid automatically handles:
 * - SPF, DKIM, DMARC authentication
 * - Reputation management
 * - Bounce handling
 * - Better inbox delivery rates
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.useSendGrid = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter - SendGrid first, then SMTP fallback
   */
  initializeTransporter() {
    // Priority 1: Try SendGrid (best deliverability)
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.useSendGrid = true;
      this.isConfigured = true;
      console.log('✅ Email service configured with SendGrid (best inbox delivery)');
      return;
    }

    // Priority 2: Fallback to SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 3
      });

      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:', error);
        } else {
          console.log('✅ Email service configured with SMTP (fallback)');
        }
      });

      this.isConfigured = true;
      this.useSendGrid = false;
    } else {
      console.log('⚠️  Email service not configured');
      console.log('💡 RECOMMENDED: Use SendGrid for best inbox delivery');
      console.log('   Add to .env: SENDGRID_API_KEY=your-api-key');
      console.log('   Sign up free at: https://sendgrid.com (100 emails/day)');
      console.log('');
      console.log('💡 ALTERNATIVE: Use SMTP');
      console.log('   Add to .env: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }
  }

  /**
   * Send email using SendGrid or SMTP
   */
  async sendEmail(options) {
    if (!this.isConfigured) {
      console.log('⚠️  Email service not configured - skipping email');
      return false;
    }

    try {
      if (this.useSendGrid) {
        // Use SendGrid for better deliverability
        const msg = {
          to: options.to,
          from: options.from || process.env.FROM_EMAIL || 'noreply@ibyet-investing.com',
          subject: options.subject,
          text: options.text,
          html: options.html,
          replyTo: options.replyTo,
          // SendGrid handles all authentication automatically
        };

        await sgMail.send(msg);
        return true;
      } else {
        // Fallback to SMTP
        await this.transporter.sendMail(options);
        return true;
      }
    } catch (error) {
      console.error('❌ Error sending email:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, name, verificationToken) {
    try {
      if (!this.isConfigured) {
        console.log('⚠️  Email service not configured - skipping verification email');
        return false;
      }

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
      
      // Format from address
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ibyet-investing.com';
      const fromName = process.env.FROM_NAME || 'Ibyet Investing';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `"${fromName}" <${fromEmail}>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="x-ua-compatible" content="ie=edge">
          <title>Verify Your Email - Ibyet Investing</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">Ibyet Investing</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Welcome to Your Investment Journey</p>
            </div>
            
            <div style="padding: 30px 20px; background: white; color: #1f2937;">
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600;">Welcome, ${name}!</h2>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                Thank you for registering with Ibyet Investing. To complete your registration and access your account, 
                please verify your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                          color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; 
                          font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);">
                  Verify Email Address
                </a>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin: 25px 0;">
                <p style="color: #64748b; line-height: 1.5; margin: 0 0 10px 0; font-size: 13px; font-weight: 500;">
                  If the button doesn't work, copy and paste this link:
                </p>
                <p style="background: white; padding: 10px; border-radius: 6px; word-break: break-all; color: #06b6d4; font-size: 12px; font-family: 'Courier New', monospace; margin: 0;">
                  ${verificationUrl}
                </p>
              </div>
              
              <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); padding: 20px; border-radius: 8px; border: 1px solid rgba(6, 182, 212, 0.2); margin-top: 25px;">
                <p style="color: #475569; line-height: 1.5; margin: 0; font-size: 13px;">
                  This verification link expires in <strong style="color: #06b6d4;">1 hour</strong>. 
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <div style="margin-bottom: 12px;">
                <strong style="color: #06b6d4; font-size: 15px;">Ibyet Investing</strong>
              </div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `Welcome to Ibyet Investing!

Hi ${name},

Thank you for registering with Ibyet Investing. To complete your registration, 
please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 1 hour.

If you didn't create an account, you can safely ignore this email.

Best regards,
The Ibyet Investing Team`;

      const emailOptions = {
        from: formattedFrom,
        to: email,
        subject: 'Verify Your Email - Ibyet Investing',
        html: htmlContent,
        text: textContent,
        replyTo: process.env.REPLY_TO_EMAIL || fromEmail
      };

      // Add SMTP-specific headers only if not using SendGrid
      if (!this.useSendGrid) {
        emailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high',
          'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@ibyet-investing.com>`,
        };
      }

      const success = await this.sendEmail(emailOptions);
      
      if (success) {
        console.log(`✅ Verification email sent to: ${email} (${this.useSendGrid ? 'SendGrid' : 'SMTP'})`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, name, resetToken) {
    try {
      if (!this.isConfigured) {
        console.log('⚠️  Email service not configured - skipping password reset email');
        return false;
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ibyet-investing.com';
      const fromName = process.env.FROM_NAME || 'Ibyet Investing';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `"${fromName}" <${fromEmail}>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - Ibyet Investing</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Ibyet Investing</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Password Reset Request</p>
            </div>
            
            <div style="padding: 30px 20px; background: white; color: #1f2937;">
              <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600;">Password Reset Request</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                Hi ${name}, we received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                          color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; 
                          font-weight: 600; font-size: 15px;">
                  Reset Password
                </a>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin: 25px 0;">
                <p style="color: #64748b; line-height: 1.5; margin: 0 0 10px 0; font-size: 13px;">
                  If the button doesn't work, copy and paste this link:
                </p>
                <p style="background: white; padding: 10px; border-radius: 6px; word-break: break-all; color: #06b6d4; font-size: 12px; font-family: 'Courier New', monospace; margin: 0;">
                  ${resetUrl}
                </p>
              </div>
              
              <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); padding: 20px; border-radius: 8px; margin-top: 25px;">
                <p style="color: #475569; line-height: 1.5; margin: 0; font-size: 13px;">
                  This link expires in <strong style="color: #06b6d4;">1 hour</strong>. 
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `Password Reset Request - Ibyet Investing

Hi ${name},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
The Ibyet Investing Team`;

      const emailOptions = {
        from: formattedFrom,
        to: email,
        subject: 'Reset Your Password - Ibyet Investing',
        html: htmlContent,
        text: textContent,
        replyTo: process.env.REPLY_TO_EMAIL || fromEmail
      };

      if (!this.useSendGrid) {
        emailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high',
        };
      }

      const success = await this.sendEmail(emailOptions);
      
      if (success) {
        console.log(`✅ Password reset email sent to: ${email} (${this.useSendGrid ? 'SendGrid' : 'SMTP'})`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, name) {
    try {
      if (!this.isConfigured) {
        console.log('⚠️  Email service not configured - skipping welcome email');
        return false;
      }

      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ibyet-investing.com';
      const fromName = process.env.FROM_NAME || 'Ibyet Investing';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `"${fromName}" <${fromEmail}>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Ibyet Investing!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Ibyet Investing</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Your Investment Journey Begins!</p>
            </div>
            
            <div style="padding: 30px 20px; background: white; color: #1f2937;">
              <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600;">Welcome to Ibyet Investing!</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                Hi ${name}, welcome to Ibyet Investing! Your account has been successfully 
                created and verified. You can now start exploring our courses and learning resources.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses" 
                   style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                          color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; 
                          font-weight: 600; font-size: 15px;">
                  Explore Courses
                </a>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `Welcome to Ibyet Investing!

Hi ${name},

Welcome to Ibyet Investing! Your account has been successfully created and verified. 
You can now start exploring our courses and learning resources.

Visit our platform: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses

Best regards,
The Ibyet Investing Team`;

      const emailOptions = {
        from: formattedFrom,
        to: email,
        subject: 'Welcome to Ibyet Investing!',
        html: htmlContent,
        text: textContent,
        replyTo: process.env.REPLY_TO_EMAIL || fromEmail
      };

      if (!this.useSendGrid) {
        emailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high',
        };
      }

      const success = await this.sendEmail(emailOptions);
      
      if (success) {
        console.log(`✅ Welcome email sent to: ${email} (${this.useSendGrid ? 'SendGrid' : 'SMTP'})`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send contact form email
   */
  async sendContactFormEmail(formData) {
    try {
      if (!this.isConfigured) {
        console.log('⚠️  Email service not configured - skipping contact form email');
        return false;
      }

      const { name, email, subject, message } = formData;
      const recipientEmail = process.env.CONTACT_FORM_RECIPIENT || 'ibyet.course@gmail.com';

      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ibyet-investing.com';
      const fromName = process.env.FROM_NAME || 'Ibyet Investing';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `"${fromName}" <${fromEmail}>`;

      // Escape HTML to prevent XSS and improve deliverability
      const escapeHtml = (text) => {
        if (!text) return '';
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeSubject = escapeHtml(subject);
      const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>New Contact Form Submission - Ibyet Investing</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; line-height: 1.2;">Ibyet Investing</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">New Contact Form Submission</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px 20px; background: white; color: #1f2937;">
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                You have received a new message from the contact form on your website.
              </p>
              
              <!-- Contact Details -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #06b6d4;">
                <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px; font-weight: 600;">Contact Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 80px;">Name:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${safeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                    <td style="padding: 8px 0;">
                      <a href="mailto:${safeEmail}" style="color: #06b6d4; text-decoration: none;">${safeEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Subject:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${safeSubject}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Message -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4;">
                <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 15px; font-size: 18px; font-weight: 600;">Message</h3>
                <div style="color: #374151; line-height: 1.6; font-size: 15px; white-space: pre-wrap;">${safeMessage}</div>
              </div>
              
              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:${safeEmail}?subject=Re: ${safeSubject}" 
                   style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                          color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; 
                          font-weight: 600; font-size: 14px;">
                  Reply to ${safeName}
                </a>
              </div>
              
              <!-- Footer Note -->
              <div style="background: #f0fdfa; padding: 15px; border-radius: 8px; margin-top: 25px; border: 1px solid rgba(6, 182, 212, 0.2);">
                <p style="color: #475569; line-height: 1.5; margin: 0; font-size: 13px;">
                  <strong style="color: #06b6d4;">Note:</strong> You can reply directly to this email to respond to ${safeName}. 
                  The reply will be sent to ${safeEmail}.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">
                This email was sent from the contact form on your website.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `Ibyet Investing - New Contact Form Submission

You have received a new message from the contact form on your website.

Contact Information:
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
You can reply directly to this email to respond to ${name}.
The reply will be sent to ${email}.

© ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
This email was sent from the contact form on your website.`;

      const emailOptions = {
        from: formattedFrom,
        to: recipientEmail,
        subject: `Contact Form: ${subject}`,
        html: htmlContent,
        text: textContent,
        replyTo: email
      };

      if (!this.useSendGrid) {
        emailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high',
        };
      }

      const success = await this.sendEmail(emailOptions);
      
      if (success) {
        console.log(`✅ Contact form email sent to: ${recipientEmail} from: ${email} (${this.useSendGrid ? 'SendGrid' : 'SMTP'})`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ Error sending contact form email:', error);
      return false;
    }
  }

  /**
   * Send password change notification email
   */
  async sendPasswordChangeNotification(email, name) {
    try {
      if (!this.isConfigured) {
        console.log('⚠️  Email service not configured - skipping password change notification');
        return false;
      }

      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ibyet-investing.com';
      const fromName = process.env.FROM_NAME || 'Ibyet Investing';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `"${fromName}" <${fromEmail}>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>Password Changed - Ibyet Investing</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">Ibyet Investing</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Password Changed Successfully</p>
            </div>
            
            <div style="padding: 30px 20px; background: white; color: #1f2937;">
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
                <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600;">Password Changed Successfully</h2>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                Hi ${name}, your password has been successfully changed.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); padding: 20px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); margin: 25px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="color: #10b981; margin-right: 8px;">🔒</span>
                  <strong style="color: #0f172a; font-size: 13px;">Security Notice:</strong>
                </div>
                <p style="color: #475569; line-height: 1.5; margin: 0; font-size: 13px;">
                  If you did not make this change, please contact our support team immediately. 
                  Your account security is important to us.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile" 
                   style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                          color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 8px; display: inline-block; 
                          font-weight: 600; font-size: 15px;">
                  Go to Profile
                </a>
              </div>
            </div>
            
            <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <div style="margin-bottom: 12px;">
                <strong style="color: #06b6d4; font-size: 15px;">Ibyet Investing</strong>
              </div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `Password Changed Successfully - Ibyet Investing

Hi ${name},

Your password has been successfully changed.

If you did not make this change, please contact our support team immediately. 
Your account security is important to us.

Visit your profile: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile

Best regards,
The Ibyet Investing Team`;

      const emailOptions = {
        from: formattedFrom,
        to: email,
        subject: 'Password Changed - Ibyet Investing',
        html: htmlContent,
        text: textContent,
        replyTo: process.env.REPLY_TO_EMAIL || fromEmail
      };

      if (!this.useSendGrid) {
        emailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high',
        };
      }

      const success = await this.sendEmail(emailOptions);
      
      if (success) {
        console.log(`✅ Password change notification sent to: ${email} (${this.useSendGrid ? 'SendGrid' : 'SMTP'})`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ Error sending password change notification:', error);
      return false;
    }
  }

  /**
   * Send a test email (for development/testing)
   */
  async sendTestEmail(toEmail) {
    try {
      if (!this.isConfigured) {
        console.log('⚠️  Email service not configured - cannot send test email');
        return { success: false, message: 'Email service not configured' };
      }

      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@ibyet-investing.com';
      const fromName = process.env.FROM_NAME || 'Ibyet Investing';
      const formattedFrom = fromEmail.includes('<') ? fromEmail : `"${fromName}" <${fromEmail}>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SendGrid Test Email - Ibyet Investing</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Ibyet Investing</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">SendGrid Test Email</p>
            </div>
            
            <div style="padding: 30px 20px; background: white; color: #1f2937;">
              <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600;">✅ SendGrid is Working!</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                Congratulations! Your SendGrid email service is properly configured and working.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); padding: 20px; border-radius: 8px; margin-top: 25px;">
                <p style="color: #475569; line-height: 1.5; margin: 0 0 10px 0; font-size: 13px; font-weight: 600;">
                  Email Service Details:
                </p>
                <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 13px;">
                  <li>Service: ${this.useSendGrid ? 'SendGrid (Recommended)' : 'SMTP (Fallback)'}</li>
                  <li>From: ${formattedFrom}</li>
                  <li>To: ${toEmail}</li>
                  <li>Time: ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-top: 25px; font-size: 15px;">
                If you received this email in your <strong>inbox</strong> (not spam), your SendGrid configuration is perfect! 🎉
              </p>
            </div>
            
            <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `SendGrid Test Email - Ibyet Investing

✅ SendGrid is Working!

Congratulations! Your SendGrid email service is properly configured and working.

Email Service Details:
- Service: ${this.useSendGrid ? 'SendGrid (Recommended)' : 'SMTP (Fallback)'}
- From: ${formattedFrom}
- To: ${toEmail}
- Time: ${new Date().toLocaleString()}

If you received this email in your inbox (not spam), your SendGrid configuration is perfect! 🎉

Best regards,
The Ibyet Investing Team`;

      const emailOptions = {
        from: formattedFrom,
        to: toEmail,
        subject: '✅ SendGrid Test Email - Ibyet Investing',
        html: htmlContent,
        text: textContent,
        replyTo: process.env.REPLY_TO_EMAIL || fromEmail
      };

      if (!this.useSendGrid) {
        emailOptions.headers = {
          'X-Priority': '1',
          'Importance': 'high',
        };
      }

      const success = await this.sendEmail(emailOptions);
      
      if (success) {
        console.log(`✅ Test email sent successfully to: ${toEmail} (${this.useSendGrid ? 'SendGrid' : 'SMTP'})`);
        return { 
          success: true, 
          message: `Test email sent successfully to ${toEmail}`,
          service: this.useSendGrid ? 'SendGrid' : 'SMTP'
        };
      } else {
        return { 
          success: false, 
          message: 'Failed to send test email' 
        };
      }

    } catch (error) {
      console.error('❌ Error sending test email:', error);
      if (error.response) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      }
      return { 
        success: false, 
        message: error.message || 'Error sending test email',
        error: error.response?.body || error.message
      };
    }
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured() {
    return this.isConfigured;
  }
}

module.exports = new EmailService();
