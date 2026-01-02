const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    // Check if email configuration is available
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
          rejectUnauthorized: false // Allow self-signed certificates
        }
      });

      this.isConfigured = true;
      console.log('✅ Email service configured with SMTP');
    } else {
      console.log('⚠️  Email service not configured - missing SMTP credentials');
      console.log('💡 To enable email verification, add these to your .env file:');
      console.log('   SMTP_HOST=smtp.gmail.com');
      console.log('   SMTP_USER=your-email@gmail.com');
      console.log('   SMTP_PASSWORD=your-app-password');
    }
  }

  /**
   * Send verification email
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {string} verificationToken - JWT verification token
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(email, name, verificationToken) {
    try {
      if (!this.isConfigured || !this.transporter) {
        console.log('⚠️  Email service not configured - skipping verification email');
        return false;
      }

      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: email,
        subject: 'Verify Your Email - Ibyet Investing',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Ibyet Investing</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Welcome, ${name}!</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                Thank you for registering with Ibyet Investing. To complete your registration, 
                please verify your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #dc2626; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; display: inline-block; 
                          font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 15px;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              
              <p style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; 
                         word-break: break-all; color: #374151; font-size: 14px;">
                ${verificationUrl}
              </p>
              
              <p style="color: #6b7280; line-height: 1.6; margin-top: 25px; font-size: 14px;">
                This verification link will expire in 1 hour. If you didn't create an account, 
                you can safely ignore this email.
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Ibyet Investing. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `
          Welcome to Ibyet Investing!
          
          Hi ${name},
          
          Thank you for registering with Ibyet Investing. To complete your registration, 
          please verify your email address by clicking the link below:
          
          ${verificationUrl}
          
          This verification link will expire in 1 hour.
          
          If you didn't create an account, you can safely ignore this email.
          
          Best regards,
          The Ibyet Investing Team
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to: ${email}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(email, name, resetToken) {
    try {
      if (!this.isConfigured || !this.transporter) {
        console.log('⚠️  Email service not configured - skipping password reset email');
        return false;
      }

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: email,
        subject: 'Reset Your Password - Ibyet Investing',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Ibyet Investing</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Password Reset Request</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                Hi ${name}, we received a request to reset your password. Click the button below 
                to create a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #dc2626; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; display: inline-block; 
                          font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 15px;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              
              <p style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; 
                         word-break: break-all; color: #374151; font-size: 14px;">
                ${resetUrl}
              </p>
              
              <p style="color: #6b7280; line-height: 1.6; margin-top: 25px; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request a password reset, 
                you can safely ignore this email.
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Ibyet Investing. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `
          Password Reset Request - Ibyet Investing
          
          Hi ${name},
          
          We received a request to reset your password. Click the link below to create a new password:
          
          ${resetUrl}
          
          This link will expire in 1 hour.
          
          If you didn't request a password reset, you can safely ignore this email.
          
          Best regards,
          The Ibyet Investing Team
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to: ${email}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   * @param {string} email - User's email address
   * @param {string} name - User's name
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(email, name) {
    try {
      if (!this.isConfigured || !this.transporter) {
        console.log('⚠️  Email service not configured - skipping welcome email');
        return false;
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: email,
        subject: 'Welcome to Ibyet Investing!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Ibyet Investing</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">Welcome to Ibyet Investing!</h2>
              
              <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                Hi ${name}, welcome to Ibyet Investing! Your account has been successfully 
                created and verified. You can now start exploring our courses and learning resources.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses" 
                   style="background-color: #dc2626; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; display: inline-block; 
                          font-weight: bold;">
                  Explore Courses
                </a>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-top: 25px;">
                If you have any questions or need assistance, feel free to contact our support team.
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Ibyet Investing. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `
          Welcome to Ibyet Investing!
          
          Hi ${name},
          
          Welcome to Ibyet Investing! Your account has been successfully created and verified. 
          You can now start exploring our courses and learning resources.
          
          Visit our platform: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses
          
          If you have any questions or need assistance, feel free to contact our support team.
          
          Best regards,
          The Ibyet Investing Team
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to: ${email}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Send contact form email
   * @param {Object} formData - Contact form data
   * @param {string} formData.name - User's name
   * @param {string} formData.email - User's email
   * @param {string} formData.subject - Email subject
   * @param {string} formData.message - Email message
   * @returns {Promise<boolean>} - Success status
   */
  async sendContactFormEmail(formData) {
    try {
      if (!this.isConfigured || !this.transporter) {
        console.log('⚠️  Email service not configured - skipping contact form email');
        return false;
      }

      const { name, email, subject, message } = formData;
      const recipientEmail = 'philiweb123@gmail.com'; // The email that will receive contact form submissions

      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: recipientEmail,
        subject: `Contact Form: ${subject}`,
        replyTo: email, // Allow replying directly to the user
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Ibyet Investing - Contact Form</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #374151; margin-bottom: 20px;">New Contact Form Submission</h2>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                <h3 style="color: #374151; margin-top: 0;">Contact Details</h3>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Name:</strong> ${name}</p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #dc2626;">${email}</a></p>
                <p style="margin: 5px 0; color: #6b7280;"><strong>Subject:</strong> ${subject}</p>
              </div>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
                <h3 style="color: #374151; margin-top: 0;">Message</h3>
                <p style="color: #6b7280; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:${email}" 
                   style="background-color: #dc2626; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; display: inline-block; 
                          font-weight: bold;">
                  Reply to ${name}
                </a>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin-top: 25px; font-size: 14px;">
                This email was sent from the Ibyet Investing contact form. You can reply directly to this email to respond to ${name}.
              </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Ibyet Investing. All rights reserved.</p>
            </div>
          </div>
        `,
        text: `
          Ibyet Investing - Contact Form Submission
          
          New contact form submission received:
          
          Name: ${name}
          Email: ${email}
          Subject: ${subject}
          
          Message:
          ${message}
          
          You can reply directly to this email to respond to ${name}.
          
          Best regards,
          Ibyet Investing Contact System
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Contact form email sent to: ${recipientEmail} from: ${email}`);
      return true;

    } catch (error) {
      console.error('❌ Error sending contact form email:', error);
      return false;
    }
  }

  /**
   * Check if email service is configured
   * @returns {boolean} - Whether email service is available
   */
  isEmailConfigured() {
    return this.isConfigured && !!this.transporter;
  }
}

module.exports = new EmailService(); 