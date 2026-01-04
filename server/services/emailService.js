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
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="x-ua-compatible" content="ie=edge">
            <title>Verify Your Email - Ibyet Investing</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: #f8fafc;">
            
            <div style="max-width: 600px; margin: 0 auto; background: white;">
              
              <!-- Responsive header with cyan gradient -->
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center; position: relative; overflow: hidden;">
                <!-- Animated background elements -->
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; display: none;"></div>
                <div style="position: absolute; bottom: -20px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; display: none;"></div>
                
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; position: relative; z-index: 1; line-height: 1.2;">
                  Ibyet Investing
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; position: relative; z-index: 1;">
                  Welcome to Your Investment Journey
                </p>
              </div>
              
              <!-- Main content -->
              <div style="padding: 30px 20px; background: white; color: #1f2937;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600; line-height: 1.3;">
                    Welcome, ${name}!
                  </h2>
                </div>
                
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                  Thank you for registering with Ibyet Investing. To complete your registration and access your account, 
                  please verify your email address by clicking the button below.
                </p>
                
                <!-- Responsive verification button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" 
                     style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                            color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 8px; display: inline-block; 
                            font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
                            transition: all 0.3s ease; position: relative; overflow: hidden; min-width: 200px;">
                    <span style="position: relative; z-index: 1;">Verify Email Address</span>
                  </a>
                </div>
                
                <!-- Responsive backup link -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin: 25px 0;">
                  <p style="color: #64748b; line-height: 1.5; margin: 0 0 10px 0; font-size: 13px; font-weight: 500;">
                    If the button doesn't work, you can copy and paste this link into your browser:
                  </p>
                  <p style="background: white; padding: 10px; border-radius: 6px; 
                             word-break: break-all; color: #06b6d4; font-size: 12px; font-family: 'Courier New', monospace; margin: 0;">
                    ${verificationUrl}
                  </p>
                </div>
                
                <!-- Responsive security notice -->
                <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); padding: 20px; border-radius: 8px; border: 1px solid #06b6d4/20; margin-top: 25px;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="color: #06b6d4; margin-right: 8px;">⚠️</span>
                    <strong style="color: #0f172a; font-size: 13px;">Security Notice:</strong>
                  </div>
                  <p style="color: #475569; line-height: 1.5; margin: 0; font-size: 13px;">
                    This verification link will expire in <strong style="color: #06b6d4;">1 hour</strong> for your security. 
                    If you didn't create an account, you can safely ignore this email.
                  </p>
                </div>
              </div>
              
              <!-- Responsive footer -->
              <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                <div style="margin-bottom: 12px;">
                  <strong style="color: #06b6d4; font-size: 15px;">Ibyet Investing</strong>
                </div>
                <p style="margin: 0 0 8px 0;">
                  Your trusted partner in investment education
                </p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
                </p>
              </div>
            </div>
            
          </body>
          </html>
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
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="x-ua-compatible" content="ie=edge">
            <title>Reset Your Password - Ibyet Investing</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: #f8fafc;">
            
            <div style="max-width: 600px; margin: 0 auto; background: white;">
              
              <!-- Responsive header with cyan gradient -->
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center; position: relative; overflow: hidden;">
                <!-- Animated background elements -->
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; display: none;"></div>
                <div style="position: absolute; bottom: -20px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; display: none;"></div>
                
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; position: relative; z-index: 1; line-height: 1.2;">
                  Ibyet Investing
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; position: relative; z-index: 1;">
                  Password Reset Request
                </p>
              </div>
              
              <!-- Main content -->
              <div style="padding: 30px 20px; background: white; color: #1f2937;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                  </div>
                  <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600; line-height: 1.3;">
                    Password Reset Request
                  </h2>
                </div>
                
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                  Hi ${name}, we received a request to reset your password. Click the button below 
                  to create a new password.
                </p>
                
                <!-- Responsive reset button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                            color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 8px; display: inline-block; 
                            font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
                            transition: all 0.3s ease; position: relative; overflow: hidden; min-width: 200px;">
                    <span style="position: relative; z-index: 1;">Reset Password</span>
                  </a>
                </div>
                
                <!-- Responsive backup link -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin: 25px 0;">
                  <p style="color: #64748b; line-height: 1.5; margin: 0 0 10px 0; font-size: 13px; font-weight: 500;">
                    If the button doesn't work, you can copy and paste this link into your browser:
                  </p>
                  <p style="background: white; padding: 10px; border-radius: 6px; 
                             word-break: break-all; color: #06b6d4; font-size: 12px; font-family: 'Courier New', monospace; margin: 0;">
                    ${resetUrl}
                  </p>
                </div>
                
                <!-- Responsive security notice -->
                <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%); padding: 20px; border-radius: 8px; border: 1px solid #06b6d4/20; margin-top: 25px;">
                  <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <span style="color: #06b6d4; margin-right: 8px;">⚠️</span>
                    <strong style="color: #0f172a; font-size: 13px;">Security Notice:</strong>
                  </div>
                  <p style="color: #475569; line-height: 1.5; margin: 0; font-size: 13px;">
                    This link will expire in <strong style="color: #06b6d4;">1 hour</strong> for your security. 
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </div>
              </div>
              
              <!-- Responsive footer -->
              <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                <div style="margin-bottom: 12px;">
                  <strong style="color: #06b6d4; font-size: 15px;">Ibyet Investing</strong>
                </div>
                <p style="margin: 0 0 8px 0;">
                  Your trusted partner in investment education
                </p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
                </p>
              </div>
            </div>
            
          </body>
          </html>
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
          <!DOCTYPE html>
          <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="x-ua-compatible" content="ie=edge">
            <title>Welcome to Ibyet Investing!</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background: #f8fafc;">
            
            <div style="max-width: 600px; margin: 0 auto; background: white;">
              
              <!-- Responsive header with cyan gradient -->
              <div style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); color: white; padding: 30px 20px; text-align: center; position: relative; overflow: hidden;">
                <!-- Animated background elements -->
                <div style="position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; display: none;"></div>
                <div style="position: absolute; bottom: -20px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; display: none;"></div>
                
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; position: relative; z-index: 1; line-height: 1.2;">
                  Ibyet Investing
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; position: relative; z-index: 1;">
                  Your Investment Journey Begins!
                </p>
              </div>
              
              <!-- Main content -->
              <div style="padding: 30px 20px; background: white; color: #1f2937;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                    </svg>
                  </div>
                  <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 22px; font-weight: 600; line-height: 1.3;">
                    Welcome to Ibyet Investing!
                  </h2>
                </div>
                
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px; font-size: 15px;">
                  Hi ${name}, welcome to Ibyet Investing! Your account has been successfully 
                  created and verified. You can now start exploring our courses and learning resources.
                </p>
                
                <!-- Responsive explore button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses" 
                     style="background: linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #0284c7 100%); 
                            color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 8px; display: inline-block; 
                            font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
                            transition: all 0.3s ease; position: relative; overflow: hidden; min-width: 200px;">
                    <span style="position: relative; z-index: 1;">Explore Courses</span>
                  </a>
                </div>
                
                <!-- Welcome message section -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4; margin: 25px 0;">
                  <p style="color: #64748b; line-height: 1.5; margin: 0; font-size: 13px;">
                    <strong style="color: #06b6d4;">What's Next?</strong><br>
                    • Browse our comprehensive course library<br>
                    • Learn from expert instructors<br>
                    • Join our community of investors<br>
                    • Start your investment education journey today!
                  </p>
                </div>
                
                <!-- Support information -->
                <p style="color: #6b7280; line-height: 1.5; margin-top: 25px; font-size: 13px; text-align: center;">
                  If you have any questions or need assistance, feel free to contact our support team.
                </p>
              </div>
              
              <!-- Responsive footer -->
              <div style="background: #f8fafc; padding: 25px 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
                <div style="margin-bottom: 12px;">
                  <strong style="color: #06b6d4; font-size: 15px;">Ibyet Investing</strong>
                </div>
                <p style="margin: 0 0 8px 0;">
                  Your trusted partner in investment education
                </p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Ibyet Investing. All rights reserved.
                </p>
              </div>
            </div>
            
          </body>
          </html>
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