const jwt = require('jsonwebtoken');
const User = require('../models/User');
const s3Service = require('./s3Service');
const emailService = require('./emailService');

class AuthService {
  /**
   * Generate JWT token
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role,
        authProvider: user.authProvider,
        tokenVersion: user.tokenVersion || 1
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Generate verification token (1 hour expiry)
   * @param {string} userId - User ID
   * @returns {string} - JWT verification token
   */
  generateVerificationToken(userId) {
    return jwt.sign(
      { userId, type: 'verification' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Generate password reset token (1 hour expiry)
   * @param {string} userId - User ID
   * @returns {string} - JWT password reset token
   */
  generatePasswordResetToken(userId) {
    return jwt.sign(
      { userId, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Register new user with local authentication (requires email verification)
   * @param {Object} userData - User registration data
   * @param {Object} profilePhoto - Profile photo file
   * @returns {Object} - User object and verification status
   */
  async registerLocal(userData, profilePhoto = null) {
    try {
      // Check if user already exists with any authentication method
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        // Check if the existing user is a Google OAuth user
        if (existingUser.authProvider === 'google') {
          throw new Error('This email is already registered with Google. Please sign in with Google instead.');
        } else {
          throw new Error('User with this email already exists. Please sign in or use a different email.');
        }
      }

      // Create new user with isVerified: false
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        authProvider: 'local',
        isVerified: false, // Email verification required
      });

      // Handle profile photo upload if provided
      if (profilePhoto) {
        try {
          s3Service.validateProfilePhoto(profilePhoto);
          if (s3Service.isConfigured()) {
            const profilePhotoKey = await s3Service.uploadProfilePhoto(
              profilePhoto.buffer,
              profilePhoto.originalname,
              user._id.toString()
            );
            user.profilePhotoKey = profilePhotoKey;
          } else {
            console.log('⚠️  S3 not configured - skipping profile photo upload');
          }
        } catch (error) {
          console.warn('⚠️  Profile photo upload failed:', error.message);
          // Continue registration without profile photo
        }
      }

      await user.save();

      // Generate verification token
      const verificationToken = this.generateVerificationToken(user._id);

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken
      );

      console.log(`✅ User registered successfully: ${user.email} (verification required)`);

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePhotoKey: user.profilePhotoKey,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        verificationRequired: true,
        emailSent,
        message: emailSent 
          ? 'Registration successful! Please check your email to verify your account.'
          : 'Registration successful! Please contact support to verify your account.'
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   * @param {string} verificationToken - JWT verification token
   * @returns {Object} - User object and auth token
   */
  async verifyEmail(verificationToken) {
    try {
      // Verify the token
      const decoded = this.verifyToken(verificationToken);
      
      if (decoded.type !== 'verification') {
        throw new Error('Invalid verification token');
      }

      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if already verified
      if (user.isVerified) {
        throw new Error('Email is already verified');
      }

      // Mark user as verified
      user.isVerified = true;
      await user.save();

      // Generate auth token for automatic login
      const authToken = this.generateToken(user);

      // Send welcome email
      await emailService.sendWelcomeEmail(user.email, user.name);

      console.log(`✅ Email verified successfully: ${user.email}`);

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePhotoKey: user.profilePhotoKey,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token: authToken,
        message: 'Email verified successfully! You are now logged in.'
      };
    } catch (error) {
      console.error('❌ Email verification error:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   * @param {string} email - User's email address
   * @returns {Object} - Success status and message
   */
  async resendVerificationEmail(email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isVerified) {
        throw new Error('Email is already verified');
      }

      if (user.authProvider !== 'local') {
        throw new Error('Email verification is not required for this account type');
      }

      // Generate new verification token
      const verificationToken = this.generateVerificationToken(user._id);

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken
      );

      console.log(`✅ Verification email resent to: ${user.email}`);

      return {
        success: true,
        emailSent,
        message: emailSent 
          ? 'Verification email sent! Please check your inbox.'
          : 'Failed to send verification email. Please contact support.'
      };
    } catch (error) {
      console.error('❌ Resend verification email error:', error);
      throw error;
    }
  }

  /**
   * Login user with local authentication
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} - User object and token
   */
  async loginLocal(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user uses local authentication
      if (user.authProvider !== 'local') {
        throw new Error(`This account was created using ${user.authProvider} authentication`);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Check if user is verified (for local accounts)
      if (!user.isVerified) {
        throw new Error('Please verify your email address before logging in. Check your inbox for a verification link.');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('Account is not active');
      }

      // Generate token
      const token = this.generateToken(user);

      console.log(`✅ User logged in successfully: ${user.email}`);

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePhotoKey: user.profilePhotoKey,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  /**
   * Check if email is available for registration
   * @param {string} email - Email to check
   * @returns {Object} - Availability status and details
   */
  async checkEmailAvailability(email) {
    try {
      const existingUser = await User.findOne({ email: email });
      
      if (!existingUser) {
        return {
          available: true,
          message: 'Email is available for registration'
        };
      }
      
      if (existingUser.authProvider === 'google') {
        return {
          available: false,
          message: 'This email is already registered with Google. Please sign in with Google instead.',
          authProvider: 'google'
        };
      } else {
        return {
          available: false,
          message: 'This email is already registered. Please sign in or use a different email.',
          authProvider: 'local'
        };
      }
    } catch (error) {
      console.error('❌ Email availability check error:', error);
      throw error;
    }
  }

  /**
   * Handle Google OAuth authentication (no email verification required)
   * @param {Object} profile - Google profile data
   * @returns {Object} - User object and token
   */
  async handleGoogleAuth(profile) {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link existing local account to Google OAuth
          if (user.authProvider === 'local') {
            console.log(`🔗 Linking existing local account to Google OAuth: ${user.email}`);
            user.googleId = profile.id;
            user.authProvider = 'google';
            user.name = profile.displayName;
            user.isVerified = true; // Google users are automatically verified
            
            // Handle Google profile photo
            if (profile.photos && profile.photos[0]) {
              try {
                console.log(`📸 Processing Google profile photo for linking user: ${user.email}`);
                const profilePhotoKey = await s3Service.uploadGoogleProfilePhoto(
                  profile.photos[0].value,
                  user._id.toString()
                );
                if (profilePhotoKey) {
                  user.profilePhotoKey = profilePhotoKey;
                  console.log(`✅ Google profile photo uploaded successfully: ${profilePhotoKey}`);
                } else {
                  console.log('⚠️  Google profile photo upload returned null');
                }
              } catch (error) {
                console.error('❌ Failed to upload Google profile photo:', error.message);
                // Continue without profile photo - don't fail the entire linking
              }
            } else {
              console.log('ℹ️  No Google profile photo available for linking user');
            }
            
            await user.save();
          } else {
            // User already exists with Google OAuth but different Google ID
            console.log(`🔄 Updating Google OAuth account: ${user.email}`);
            user.googleId = profile.id;
            user.name = profile.displayName;
            user.isVerified = true;
            
            // Handle Google profile photo
            if (profile.photos && profile.photos[0]) {
              try {
                console.log(`📸 Processing Google profile photo for updating user: ${user.email}`);
                const profilePhotoKey = await s3Service.uploadGoogleProfilePhoto(
                  profile.photos[0].value,
                  user._id.toString()
                );
                if (profilePhotoKey) {
                  user.profilePhotoKey = profilePhotoKey;
                  console.log(`✅ Google profile photo uploaded successfully: ${profilePhotoKey}`);
                } else {
                  console.log('⚠️  Google profile photo upload returned null');
                }
              } catch (error) {
                console.error('❌ Failed to upload Google profile photo:', error.message);
                // Continue without profile photo - don't fail the entire update
              }
            } else {
              console.log('ℹ️  No Google profile photo available for updating user');
            }
            
            await user.save();
          }
        } else {
          // Create new Google OAuth user
          console.log(`🆕 Creating new Google OAuth user: ${profile.emails[0].value}`);
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            authProvider: 'google',
            isVerified: true, // Google users are automatically verified
          });

          // Handle Google profile photo
          if (profile.photos && profile.photos[0]) {
            try {
              console.log(`📸 Processing Google profile photo for user: ${user.email}`);
              const profilePhotoKey = await s3Service.uploadGoogleProfilePhoto(
                profile.photos[0].value,
                user._id.toString()
              );
              if (profilePhotoKey) {
                user.profilePhotoKey = profilePhotoKey;
                console.log(`✅ Google profile photo uploaded successfully: ${profilePhotoKey}`);
              } else {
                console.log('⚠️  Google profile photo upload returned null');
              }
            } catch (error) {
              console.error('❌ Failed to upload Google profile photo:', error.message);
              // Continue without profile photo - don't fail the entire registration
            }
          } else {
            console.log('ℹ️  No Google profile photo available for user');
          }

          await user.save();
          
          // Return special status indicating phone number is required
          return {
            user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              authProvider: user.authProvider,
              profilePhotoKey: user.profilePhotoKey,
              isVerified: user.isVerified,
              phoneNumber: user.phoneNumber,
              createdAt: user.createdAt,
            },
            phoneNumberRequired: true,
            message: 'Phone number required to complete registration'
          };
        }
      }

      // Generate token for existing/updated users
      const token = this.generateToken(user);

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePhotoKey: user.profilePhotoKey,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        token,
      };
    } catch (error) {
      console.error('❌ Google auth error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} - User object
   */
  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('❌ Get user error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @param {Object} profilePhoto - New profile photo
   * @returns {Object} - Updated user object
   */
  async updateProfile(userId, updateData, profilePhoto = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update basic fields
      if (updateData.name) user.name = updateData.name;
      if (updateData.email) {
        // Check if email is already taken
        const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
        if (existingUser) {
          throw new Error('Email is already taken');
        }
        user.email = updateData.email;
      }

      // Update extended profile fields
      if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
      if (updateData.age !== undefined) user.age = updateData.age;
      if (updateData.sex !== undefined) user.sex = updateData.sex;
      if (updateData.address !== undefined) user.address = updateData.address;
      if (updateData.phoneNumber !== undefined) user.phoneNumber = updateData.phoneNumber;
      if (updateData.country !== undefined) user.country = updateData.country;
      if (updateData.city !== undefined) user.city = updateData.city;

      // Ensure phone number is not removed (required field)
      if (!user.phoneNumber) {
        throw new Error('Phone number is required and cannot be removed');
      }

      // Handle profile photo update
      if (profilePhoto) {
        console.log('🔧 [AuthService] Processing profile photo update:', {
          fileName: profilePhoto.originalname,
          fileSize: profilePhoto.size,
          mimeType: profilePhoto.mimetype,
          userId: user._id.toString()
        });

        try {
          // Validate the profile photo
          s3Service.validateProfilePhoto(profilePhoto);
          console.log('✅ [AuthService] Profile photo validation passed');
          
          if (s3Service.isConfigured()) {
            console.log('✅ [AuthService] S3 is configured, proceeding with upload');
            
            // Delete old profile photo if exists
            if (user.profilePhotoKey) {
              console.log('🗑️ [AuthService] Deleting old profile photo:', user.profilePhotoKey);
              try {
                await s3Service.deleteProfilePhoto(user.profilePhotoKey);
                console.log('✅ [AuthService] Old profile photo deleted successfully');
              } catch (deleteError) {
                console.warn('⚠️ [AuthService] Failed to delete old profile photo:', deleteError.message);
                // Continue with upload even if deletion fails
              }
            }

            // Upload new profile photo
            console.log('📤 [AuthService] Uploading new profile photo...');
            const profilePhotoKey = await s3Service.uploadProfilePhoto(
              profilePhoto.buffer,
              profilePhoto.originalname,
              user._id.toString()
            );
            
            if (profilePhotoKey) {
              user.profilePhotoKey = profilePhotoKey;
              console.log('✅ [AuthService] Profile photo uploaded successfully:', profilePhotoKey);
            } else {
              console.error('❌ [AuthService] Profile photo upload returned null');
              throw new Error('Profile photo upload failed - no key returned');
            }
          } else {
            console.log('⚠️  S3 not configured - skipping profile photo update');
            throw new Error('S3 is not configured for profile photo uploads');
          }
        } catch (error) {
          console.error('❌ [AuthService] Profile photo update failed:', error.message);
          console.error('❌ [AuthService] Profile photo error details:', error);
          // Continue update without profile photo - don't fail the entire profile update
        }
      }

      await user.save();

      console.log(`✅ User profile updated: ${user.email}`);

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: user.authProvider,
        profilePhotoKey: user.profilePhotoKey,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        // Extended profile fields
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        sex: user.sex,
        address: user.address,
        phoneNumber: user.phoneNumber,
        country: user.country,
        city: user.city
      };
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }

  /**
   * Change password (for local users only)
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} - Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.authProvider !== 'local') {
        throw new Error('Password change is only available for local accounts');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      console.log(`✅ Password changed successfully for user: ${user.email}`);

      return true;
    } catch (error) {
      console.error('❌ Change password error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Object} - Success status and message
   */
  async sendPasswordResetEmail(email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not for security
        console.log(`⚠️  Password reset requested for non-existent email: ${email}`);
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      if (user.authProvider !== 'local') {
        console.log(`⚠️  Password reset requested for Google OAuth user: ${email}`);
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      // Generate password reset token
      const resetToken = this.generatePasswordResetToken(user._id);

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

      console.log(`✅ Password reset email sent to: ${email}`);

      return {
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('❌ Send password reset email error:', error);
      throw error;
    }
  }

  /**
   * Delete user profile photo
   * @param {string} userId - User ID
   * @returns {Object} - Success status and message
   */
  async deleteProfilePhoto(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.profilePhotoKey) {
        console.log(`ℹ️  User ${user.email} has no profile photo to delete`);
        return {
          success: true,
          message: 'No profile photo to delete'
        };
      }

      console.log(`🗑️  [AuthService] Deleting profile photo for user: ${user.email}`);
      console.log(`🗑️  [AuthService] Profile photo key: ${user.profilePhotoKey}`);

      if (s3Service.isConfigured()) {
        try {
          await s3Service.deleteProfilePhoto(user.profilePhotoKey);
          console.log('✅ [AuthService] Profile photo deleted from S3 successfully');
        } catch (deleteError) {
          console.error('❌ [AuthService] Failed to delete profile photo from S3:', deleteError.message);
          // Continue with database update even if S3 deletion fails
        }
      } else {
        console.log('⚠️  S3 not configured - skipping S3 deletion');
      }

      // Remove profile photo key from user
      user.profilePhotoKey = null;
      await user.save();

      console.log(`✅ Profile photo deleted successfully for user: ${user.email}`);

      return {
        success: true,
        message: 'Profile photo deleted successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePhotoKey: user.profilePhotoKey,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          // Extended profile fields
          firstName: user.firstName,
          lastName: user.lastName,
          age: user.age,
          sex: user.sex,
          address: user.address,
          phoneNumber: user.phoneNumber,
          country: user.country,
          city: user.city
        }
      };
    } catch (error) {
      console.error('❌ Delete profile photo error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Password reset token
   * @param {string} newPassword - New password
   * @returns {Object} - Success status and message
   */
  async resetPassword(token, newPassword) {
    try {
      // Verify token
      const decoded = this.verifyToken(token);
      
      if (decoded.type !== 'password-reset') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.authProvider !== 'local') {
        throw new Error('Password reset is only available for local accounts');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      console.log(`✅ Password reset successfully for user: ${user.email}`);

      return {
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      };
    } catch (error) {
      console.error('❌ Reset password error:', error);
      
      if (error.message.includes('jwt expired')) {
        throw new Error('Password reset link has expired. Please request a new one.');
      }
      
      if (error.message.includes('invalid signature')) {
        throw new Error('Invalid password reset link.');
      }
      
      throw error;
    }
  }

  /**
   * Complete Google OAuth registration
   * @param {string} userId - User ID
   * @returns {Object} - User object and auth token
   */
  async completeGoogleRegistration(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.authProvider !== 'google') {
        throw new Error('This endpoint is only for Google OAuth users');
      }

      // Generate auth token
      const token = this.generateToken(user);

      console.log(`✅ Google OAuth registration completed for user: ${user.email}`);

      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
          profilePhotoKey: user.profilePhotoKey,
          isVerified: user.isVerified,
          phoneNumber: user.phoneNumber,
          createdAt: user.createdAt,
        },
        token,
        message: 'Registration completed successfully!'
      };
    } catch (error) {
      console.error('❌ Complete Google registration error:', error);
      throw error;
    }
  }
  /**
   * Update profile photo only (no other profile data)
   * @param {string} userId - User ID
   * @param {Object} profilePhoto - Profile photo file
   * @returns {Object} - Updated user object
   */
  async updateProfilePhotoOnly(userId, profilePhoto) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      console.log('🔧 [AuthService] Processing profile photo update only:', {
        fileName: profilePhoto.originalname,
        fileSize: profilePhoto.size,
        mimeType: profilePhoto.mimetype,
        userId: user._id.toString()
      });

      try {
        // Validate profile photo
        s3Service.validateProfilePhoto(profilePhoto);
        
        if (s3Service.isConfigured()) {
          // Upload new profile photo to S3
          const profilePhotoKey = await s3Service.uploadProfilePhoto(
            profilePhoto.buffer,
            profilePhoto.originalname,
            user._id.toString()
          );
          
          // Delete old profile photo if it exists
          if (user.profilePhotoKey) {
            try {
              await s3Service.deleteProfilePhoto(user.profilePhotoKey);
              console.log(`🗑️  Old profile photo deleted: ${user.profilePhotoKey}`);
            } catch (deleteError) {
              console.warn('⚠️  Failed to delete old profile photo:', deleteError.message);
              // Continue with update even if old photo deletion fails
            }
          }
          
          // Update user with new profile photo key
          user.profilePhotoKey = profilePhotoKey;
          await user.save();
          
          console.log(`✅ Profile photo updated successfully: ${profilePhotoKey}`);
        } else {
          console.log('⚠️  S3 not configured - skipping profile photo upload');
          throw new Error('Profile photo upload not available');
        }
      } catch (error) {
        console.error('❌ Profile photo upload failed:', error.message);
        throw new Error(`Profile photo upload failed: ${error.message}`);
      }

      return user;
    } catch (error) {
      console.error('❌ Update profile photo only error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService(); 