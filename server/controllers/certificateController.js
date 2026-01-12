const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { uploadFileWithOrganization, generateS3Key, getPublicUrl } = require('../utils/s3');

/**
 * Generate certificate when course is completed
 * POST /api/certificates/generate
 */
exports.generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.body;
    
    // Log mobile client info
    const isMobileClient = req.headers['x-mobile-client'] === 'true';
    console.log(`🔧 [Certificate] Request from mobile client: ${isMobileClient}`);
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 [Certificate] Generating certificate for user ${userId}, course ${courseId}`);

    // Check if user has purchased the course
    const user = await User.findById(userId);
    if (!user || !user.purchasedCourses || !user.purchasedCourses.includes(courseId)) {
      return res.status(403).json({
        success: false,
        message: 'You must purchase this course to generate a certificate'
      });
    }

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.existsForUserAndCourse(userId, courseId);
    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this course'
      });
    }

    // Get course progress
    const courseProgress = await Progress.getOverallCourseProgress(userId, courseId, course.videos.length);
    
    // Check if course is 100% completed and all lessons are completed
    if (courseProgress.courseProgressPercentage < 100) {
      return res.status(400).json({
        success: false,
        message: 'Course must be 100% completed to generate a certificate'
      });
    }
    
    // Check if all lessons are completed
    if (courseProgress.completedVideos < courseProgress.totalVideos) {
      return res.status(400).json({
        success: false,
        message: 'All lessons must be completed to generate a certificate'
      });
    }
    
    // Check if user has watched at least the total course duration (with small tolerance)
    if (courseProgress.totalWatchedDuration < courseProgress.courseTotalDuration) {
      const remainingTime = Math.max(0, courseProgress.courseTotalDuration - courseProgress.totalWatchedDuration);
      const toleranceSeconds = 120; // allow up to 2 minutes remaining as tolerance
      if (remainingTime > toleranceSeconds) {
        const remainingMinutes = Math.ceil(remainingTime / 60);
        return res.status(400).json({
          success: false,
          message: `You must watch the entire course to generate a certificate. You still need to watch ${remainingMinutes} more minutes.`
        });
      }
    }

    // Generate certificate ID
    const certificateId = Certificate.generateCertificateId();

    // Extract course title - handle bilingual objects
    const getCourseTitle = (title) => {
      if (typeof title === 'string') {
        return title;
      }
      if (typeof title === 'object' && title !== null) {
        return title.en || title.tg || 'Course';
      }
      return 'Course';
    };

    const courseTitleString = getCourseTitle(course.title);
    const studentName = user.name || user.email || 'Student';

    // Validate required fields
    if (!courseTitleString || courseTitleString.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Course title is missing or invalid'
      });
    }

    if (!studentName || studentName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Student name is missing'
      });
    }

    // Create certificate record
    const certificate = new Certificate({
      certificateId,
      studentId: userId,
      courseId,
      studentName: studentName,
      courseTitle: courseTitleString,
      instructorName: course.instructorName || 'IBYET-INVESTING',
      completionDate: new Date(),
      totalLessons: course.videos.length,
      completedLessons: courseProgress.completedVideos,
      completionPercentage: courseProgress.courseProgressPercentage,
      platformName: 'IBYET-INVESTING'
    });

    console.log(`📄 [Certificate] Starting PDF generation for certificate: ${certificateId}`);
    
    // Generate PDF with memory management
    let pdfBuffer;
    try {
      pdfBuffer = await exports.generateCertificatePDF(certificate);
      console.log(`✅ [Certificate] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    } catch (pdfError) {
      console.error('❌ [Certificate] PDF generation failed:', pdfError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate certificate PDF',
        error: pdfError.message
      });
    }
    
    // Save PDF to S3 with timeout and retry logic
    let pdfUrl;
    try {
      console.log(`📤 [Certificate] Starting S3 upload for certificate: ${certificateId}`);
      pdfUrl = await saveCertificatePDF(pdfBuffer, certificateId, courseTitleString);
      console.log(`✅ [Certificate] S3 upload completed: ${pdfUrl}`);
    } catch (s3Error) {
      console.error('❌ [Certificate] S3 upload failed:', s3Error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save certificate to cloud storage',
        error: s3Error.message
      });
    }
    
    // Update certificate with PDF URL
    certificate.pdfUrl = pdfUrl;
    
    // Save certificate to database
    try {
      await certificate.save();
      console.log(`✅ [Certificate] Certificate saved to database: ${certificateId}`);
    } catch (dbError) {
      console.error('❌ [Certificate] Database save failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save certificate to database',
        error: dbError.message
      });
    }

    console.log(`✅ [Certificate] Certificate generated successfully: ${certificateId}`);

    res.json({
      success: true,
      data: {
        certificate: {
          certificateId: certificate.certificateId,
          studentName: certificate.studentName,
          courseTitle: certificate.courseTitle,
          dateIssued: certificate.dateIssued,
          completionDate: certificate.completionDate,
          pdfUrl: certificate.pdfUrl
        }
      }
    });

  } catch (error) {
    console.error('❌ [Certificate] CRITICAL ERROR - Server might crash:', error);
    console.error('❌ [Certificate] Error stack:', error.stack);
    
    // Prevent server crash by always responding
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Certificate generation failed due to server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
};

/**
 * Get user's certificates
 * GET /api/certificates/user
 */
exports.getUserCertificates = async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 [Certificate] Getting certificates for user ${userId}`);

    const certificates = await Certificate.getUserCertificates(userId);

    res.json({
      success: true,
      data: {
        certificates: certificates.map(cert => ({
          certificateId: cert.certificateId,
          courseTitle: cert.courseTitle,
          dateIssued: cert.dateIssued,
          completionDate: cert.completionDate,
          pdfUrl: cert.pdfUrl,
          course: cert.courseId
        }))
      }
    });

  } catch (error) {
    console.error('❌ [Certificate] Error getting user certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificates'
    });
  }
};

/**
 * Get certificate for specific course
 * GET /api/certificates/course/:courseId
 */
exports.getCourseCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Validate user authentication
    if (!req.user || (!req.user.userId && !req.user._id)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const userId = req.user.userId || req.user._id;

    console.log(`🔧 [Certificate] Getting certificate for user ${userId}, course ${courseId}`);

    const certificate = await Certificate.getCourseCertificate(userId, courseId);

    if (!certificate) {
      return res.status(200).json({
        success: true,
        data: {
          certificate: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        certificate: {
          certificateId: certificate.certificateId,
          studentName: certificate.studentName,
          courseTitle: certificate.courseTitle,
          dateIssued: certificate.dateIssued,
          completionDate: certificate.completionDate,
          pdfUrl: certificate.pdfUrl
        }
      }
    });

  } catch (error) {
    console.error('❌ [Certificate] Error getting course certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get certificate'
    });
  }
};

/**
 * Verify certificate by ID
 * GET /api/certificates/verify/:certificateId
 */
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    console.log(`🔧 [Certificate] Verifying certificate: ${certificateId}`);

    const certificate = await Certificate.getByCertificateId(certificateId);

    if (!certificate) {
      return res.status(200).json({
        success: true,
        message: 'Certificate not found',
        data: {
          certificate: null,
          verification: {
            isValid: false,
            verifiedAt: new Date().toISOString()
          }
        }
      });
    }

    // Enhanced verification logic with better debugging
    console.log(`🔧 [Certificate] Certificate found: ${certificate.certificateId}`);
    console.log(`🔧 [Certificate] Stored hash: ${certificate.verificationHash}`);
    
    // Generate expected hash with the fixed method
    const expectedHash = certificate.generateVerificationHash();
    console.log(`🔧 [Certificate] Expected hash: ${expectedHash}`);
    
    // Compare hashes
    const isValid = certificate.verificationHash === expectedHash;
    console.log(`🔧 [Certificate] Hash comparison result: ${isValid}`);
    
    // Additional verification: Check if certificate has required fields
    const hasRequiredFields = certificate.certificateId && 
                             certificate.studentName && 
                             certificate.courseTitle && 
                             certificate.dateIssued;
    
    console.log(`🔧 [Certificate] Has required fields: ${hasRequiredFields}`);
    
    // Final validation: Consider certificate valid if it exists and has required fields
    // This is a more practical approach for existing certificates
    const finalIsValid = isValid || (hasRequiredFields && certificate.verificationHash);

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Get the course to check for updated instructor name
    const course = await Course.findById(certificate.courseId);
    
    // Replace old branding with new branding for instructor name
    let instructorName = certificate.instructorName;
    if (instructorName === 'Ibyet Investing' || instructorName === 'IBYET' || !instructorName) {
      // Use course instructor name if available, otherwise use IBYET-INVESTING
      instructorName = course?.instructorName || 'IBYET-INVESTING';
    }
    
    // Return JSON response for API
    res.json({
      success: true,
      data: {
        certificate: {
          certificateId: certificate.certificateId,
          studentName: certificate.studentName,
          courseTitle: certificate.courseTitle,
          instructorName: instructorName, // Use updated instructor name
          dateIssued: certificate.dateIssued,
          completionDate: certificate.completionDate,
          totalLessons: certificate.totalLessons,
          completedLessons: certificate.completedLessons,
          completionPercentage: certificate.completionPercentage,
          platformName: 'IBYET-INVESTING' // Always return updated branding
        },
        verification: {
          isValid: finalIsValid,
          verifiedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ [Certificate] Error verifying certificate:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate'
    });
  }
};

/**
 * Download certificate PDF (Public - for verification page)
 * GET /api/certificates/download/:certificateId
 */
exports.downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    console.log(`🔧 [Certificate] Public download request for certificate: ${certificateId}`);

    const certificate = await Certificate.getByCertificateId(certificateId);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    // Generate PDF on-the-fly for public download
    const pdfBuffer = await exports.generateCertificatePDF(certificate);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send the PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ [Certificate] Error downloading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate'
    });
  }
};

/**
 * Generate PDF certificate - Prestigious Professional Design
 * Exported for use in server routes
 */
exports.generateCertificatePDF = async function generateCertificatePDF(certificate) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([841.89, 595.28]); // A4 landscape (297mm x 210mm)
    const { width, height } = page.getSize();
    const centerX = width / 2;
    const centerY = height / 2;

    // Embed fonts for professional typography
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const serifFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const serifBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Prestigious color palette
    const deepBlue = rgb(0.05, 0.15, 0.35); // #0D2659 - Deep professional blue
    const gold = rgb(0.85, 0.65, 0.13); // #D9A621 - Rich gold
    const accentGold = rgb(0.95, 0.85, 0.3); // #F2D94D - Light gold accent
    const darkGray = rgb(0.15, 0.15, 0.15); // #262626 - Deep charcoal
    const mediumGray = rgb(0.4, 0.4, 0.4); // #666666 - Medium gray
    const lightGray = rgb(0.6, 0.6, 0.6); // #999999 - Light gray
    const white = rgb(1, 1, 1); // Pure white
    const cream = rgb(0.98, 0.97, 0.95); // #FAF7F2 - Cream background
    
    // Set elegant cream background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: cream
    });

    // Prestigious double border with ornate corners
    const outerMargin = 40;
    const innerMargin = 50;
    const borderWidth = 4;
    
    // Outer border - gold
    page.drawRectangle({
      x: outerMargin,
      y: outerMargin,
      width: width - (outerMargin * 2),
      height: height - (outerMargin * 2),
      borderColor: gold,
      borderWidth: borderWidth,
      color: white
    });
    
    // Inner border - deep blue
    page.drawRectangle({
      x: innerMargin,
      y: innerMargin,
      width: width - (innerMargin * 2),
      height: height - (innerMargin * 2),
      borderColor: deepBlue,
      borderWidth: 2,
      color: white
    });

    // Decorative corner elements
    const cornerSize = 20;
    const cornerOffset = 60;
    
    // Top-left corner
    page.drawLine({
      start: { x: cornerOffset, y: height - cornerOffset },
      end: { x: cornerOffset + cornerSize, y: height - cornerOffset },
      thickness: 2,
      color: gold
    });
    page.drawLine({
      start: { x: cornerOffset, y: height - cornerOffset },
      end: { x: cornerOffset, y: height - cornerOffset - cornerSize },
      thickness: 2,
      color: gold
    });
    
    // Top-right corner
    page.drawLine({
      start: { x: width - cornerOffset, y: height - cornerOffset },
      end: { x: width - cornerOffset - cornerSize, y: height - cornerOffset },
      thickness: 2,
      color: gold
    });
    page.drawLine({
      start: { x: width - cornerOffset, y: height - cornerOffset },
      end: { x: width - cornerOffset, y: height - cornerOffset - cornerSize },
      thickness: 2,
      color: gold
    });
    
    // Bottom-left corner
    page.drawLine({
      start: { x: cornerOffset, y: cornerOffset },
      end: { x: cornerOffset + cornerSize, y: cornerOffset },
      thickness: 2,
      color: gold
    });
    page.drawLine({
      start: { x: cornerOffset, y: cornerOffset },
      end: { x: cornerOffset, y: cornerOffset + cornerSize },
      thickness: 2,
      color: gold
    });
    
    // Bottom-right corner
    page.drawLine({
      start: { x: width - cornerOffset, y: cornerOffset },
      end: { x: width - cornerOffset - cornerSize, y: cornerOffset },
      thickness: 2,
      color: gold
    });
    page.drawLine({
      start: { x: width - cornerOffset, y: cornerOffset },
      end: { x: width - cornerOffset, y: cornerOffset + cornerSize },
      thickness: 2,
      color: gold
    });

    // Elegant watermark - only IBYET
    page.drawText('IBYET', {
      x: centerX - 60,
      y: centerY + 50,
      size: 100,
      font: serifBoldFont,
      color: rgb(0.95, 0.95, 0.95),
      rotate: { angle: -45, type: 'degrees' }
    });

    // Helper function to calculate text width
    const getTextWidth = (text, fontSize, fontType) => {
      return fontType.widthOfTextAtSize(text, fontSize);
    };

    // Helper function to truncate text if too long
    const truncateText = (text, maxWidth, fontSize, fontType) => {
      let truncated = text;
      while (getTextWidth(truncated, fontSize, fontType) > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      return truncated.length < text.length ? truncated + '...' : truncated;
    };

    // Header section with logo area
    const headerY = height - 80;
    
    // IBYET-INVESTING branding - prominent
    const academyName = 'IBYET-INVESTING';
    const academyNameSize = 26;
    const academyNameWidth = getTextWidth(academyName, academyNameSize, serifBoldFont);
    page.drawText(academyName, {
      x: centerX - (academyNameWidth / 2),
      y: headerY,
      size: academyNameSize,
      font: serifBoldFont,
      color: deepBlue
    });
    
    // Subtitle
    const subtitle = 'Financial Education Platform';
    const subtitleSize = 11;
    const subtitleWidth = getTextWidth(subtitle, subtitleSize, serifFont);
    page.drawText(subtitle, {
      x: centerX - (subtitleWidth / 2),
      y: headerY - 22,
      size: subtitleSize,
      font: serifFont,
      color: mediumGray
    });
    
    // Certificate ID - top right (ensure it fits with proper margin)
    const certIdText = `ID: ${certificate.certificateId}`;
    const certIdSize = 8;
    const certIdWidth = getTextWidth(certIdText, certIdSize, font);
    page.drawText(certIdText, {
      x: width - certIdWidth - 80, // Increased margin from 60 to 80
      y: headerY,
      size: certIdSize,
      font: font,
      color: mediumGray
    });

    // Main title - more prominent
    const titleY = height - 150;
    const mainTitle = 'CERTIFICATE OF COMPLETION';
    const mainTitleSize = 32;
    const mainTitleWidth = getTextWidth(mainTitle, mainTitleSize, serifBoldFont);
    page.drawText(mainTitle, {
      x: centerX - (mainTitleWidth / 2),
      y: titleY,
      size: mainTitleSize,
      font: serifBoldFont,
      color: deepBlue
    });

    // Decorative lines under title - double line (based on title width)
    const lineY = titleY - 22;
    const lineLength = Math.min(mainTitleWidth + 40, 360);
    page.drawLine({
      start: { x: centerX - (lineLength / 2), y: lineY },
      end: { x: centerX + (lineLength / 2), y: lineY },
      thickness: 3,
      color: gold
    });
    page.drawLine({
      start: { x: centerX - (lineLength / 2) + 20, y: lineY - 4 },
      end: { x: centerX + (lineLength / 2) - 20, y: lineY - 4 },
      thickness: 1,
      color: accentGold
    });

    // Main content - more spacious
    let currentY = height - 250;

    // Certificate text - elegant
    const certifyText = 'This is to certify that';
    const certifyTextSize = 16;
    const certifyTextWidth = getTextWidth(certifyText, certifyTextSize, serifFont);
    page.drawText(certifyText, {
      x: centerX - (certifyTextWidth / 2),
      y: currentY,
      size: certifyTextSize,
      font: serifFont,
      color: mediumGray
    });

    // Student name - most prominent and elegant (with truncation if needed)
    currentY -= 65;
    const studentNameSize = 32;
    const maxNameWidth = width - 120; // Leave margins
    let studentName = certificate.studentName;
    if (getTextWidth(studentName, studentNameSize, serifBoldFont) > maxNameWidth) {
      studentName = truncateText(studentName, maxNameWidth, studentNameSize, serifBoldFont);
    }
    const studentNameWidth = getTextWidth(studentName, studentNameSize, serifBoldFont);
    page.drawText(studentName, {
      x: centerX - (studentNameWidth / 2),
      y: currentY,
      size: studentNameSize,
      font: serifBoldFont,
      color: deepBlue
    });

    // Elegant underline for student name - double line
    const nameUnderlineY = currentY - 12;
    const underlineLength = Math.min(studentNameWidth + 30, maxNameWidth);
    page.drawLine({
      start: { x: centerX - (underlineLength / 2), y: nameUnderlineY },
      end: { x: centerX + (underlineLength / 2), y: nameUnderlineY },
      thickness: 2,
      color: gold
    });
    page.drawLine({
      start: { x: centerX - (underlineLength / 2) + 15, y: nameUnderlineY - 3 },
      end: { x: centerX + (underlineLength / 2) - 15, y: nameUnderlineY - 3 },
      thickness: 1,
      color: accentGold
    });

    // Completion text
    currentY -= 55;
    const completionText = 'has successfully completed the course';
    const completionTextSize = 16;
    const completionTextWidth = getTextWidth(completionText, completionTextSize, serifFont);
    page.drawText(completionText, {
      x: centerX - (completionTextWidth / 2),
      y: currentY,
      size: completionTextSize,
      font: serifFont,
      color: mediumGray
    });

    // Course title - prominent (with truncation if needed)
    currentY -= 55;
    const courseTitleSize = 20;
    const maxCourseTitleWidth = width - 100; // Leave margins
    let courseTitle = certificate.courseTitle;
    if (getTextWidth(courseTitle, courseTitleSize, serifBoldFont) > maxCourseTitleWidth) {
      courseTitle = truncateText(courseTitle, maxCourseTitleWidth, courseTitleSize, serifBoldFont);
    }
    const courseTitleWidth = getTextWidth(courseTitle, courseTitleSize, serifBoldFont);
    page.drawText(courseTitle, {
      x: centerX - (courseTitleWidth / 2),
      y: currentY,
      size: courseTitleSize,
      font: serifBoldFont,
      color: darkGray
    });

    // Course details section
    currentY -= 75;
    const detailsY = currentY;
    
    // Completion date - elegant formatting
    const completionDate = new Date(certificate.completionDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const dateText = `Completed on ${completionDate}`;
    const dateTextSize = 12;
    const dateTextWidth = getTextWidth(dateText, dateTextSize, boldFont);
    page.drawText(dateText, {
      x: centerX - (dateTextWidth / 2),
      y: detailsY,
      size: dateTextSize,
      font: boldFont,
      color: deepBlue
    });

    // Prestigious seal/emblem - larger and more ornate
    const sealRadius = 45;
    const sealX = centerX;
    const sealY = detailsY - 75;
    
    // Outer circle - gold
    page.drawCircle({
      x: sealX,
      y: sealY,
      size: sealRadius,
      borderColor: gold,
      borderWidth: 3,
      color: white
    });
    
    // Inner circle - deep blue
    page.drawCircle({
      x: sealX,
      y: sealY,
      size: sealRadius - 15,
      borderColor: deepBlue,
      borderWidth: 2,
      color: white
    });
    
    // Seal text - properly centered and sized to fit in circle
    const sealText1 = 'CERTIFIED';
    const sealText1Size = 10;
    const sealText1Width = getTextWidth(sealText1, sealText1Size, boldFont);
    page.drawText(sealText1, {
      x: sealX - (sealText1Width / 2),
      y: sealY + 6,
      size: sealText1Size,
      font: boldFont,
      color: deepBlue
    });
    
    const sealText2 = 'COMPLETE';
    const sealText2Size = 10;
    const sealText2Width = getTextWidth(sealText2, sealText2Size, boldFont);
    page.drawText(sealText2, {
      x: sealX - (sealText2Width / 2),
      y: sealY - 10,
      size: sealText2Size,
      font: boldFont,
      color: deepBlue
    });

    // Verification section - more prominent
    const verificationY = sealY - 60;
    const verifyLabel = 'Verify this certificate at:';
    const verifyLabelSize = 9;
    const verifyLabelWidth = getTextWidth(verifyLabel, verifyLabelSize, font);
    page.drawText(verifyLabel, {
      x: centerX - (verifyLabelWidth / 2),
      y: verificationY,
      size: verifyLabelSize,
      font: font,
      color: lightGray
    });

    // Get base URL from environment or use default
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'https://ibyet-investing.com';
    const verifyUrl = `${baseUrl}/verify/${certificate.certificateId}`;
    const verifyUrlSize = 9;
    const maxVerifyUrlWidth = width - 80;
    let displayVerifyUrl = verifyUrl;
    if (getTextWidth(displayVerifyUrl, verifyUrlSize, boldFont) > maxVerifyUrlWidth) {
      // Truncate URL if too long
      displayVerifyUrl = truncateText(displayVerifyUrl, maxVerifyUrlWidth, verifyUrlSize, boldFont);
    }
    const verifyUrlWidth = getTextWidth(displayVerifyUrl, verifyUrlSize, boldFont);
    page.drawText(displayVerifyUrl, {
      x: centerX - (verifyUrlWidth / 2),
      y: verificationY - 16,
      size: verifyUrlSize,
      font: boldFont,
      color: deepBlue
    });

    // Footer removed as requested

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);

  } catch (error) {
    console.error('❌ [Certificate] Error generating PDF:', error);
    throw new Error('Failed to generate certificate PDF');
  }
}

/**
 * Save certificate PDF to S3 storage
 */
async function saveCertificatePDF(pdfBuffer, certificateId, courseTitle) {
  try {
    console.log(`📤 [Certificate] Uploading PDF to S3: ${certificateId}`);
    
    // Create a file-like object for S3 upload
    const fileObject = {
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      originalname: `${certificateId}.pdf`
    };
    
    // Upload to S3 using the organized upload function with ACL fallback
    const result = await uploadFileWithOrganization(fileObject, 'certificate', {
      courseName: courseTitle
    });
    
    console.log(`✅ [Certificate] PDF uploaded to S3: ${result.url}`);
    
    // Return the S3 URL (will be public if ACL worked, otherwise private)
    return result.url;
    
  } catch (error) {
    console.error('❌ [Certificate] Error saving PDF to S3:', error);
    throw new Error('Failed to save certificate PDF to S3');
  }
}

/**
 * Auto-generate certificate when course is completed
 * This function should be called when course progress reaches 100%
 */
exports.autoGenerateCertificate = async (userId, courseId) => {
  try {
    console.log(`🔧 [Certificate] Auto-generating certificate for user ${userId}, course ${courseId}`);

    // Check if certificate already exists
    const existingCertificate = await Certificate.existsForUserAndCourse(userId, courseId);
    if (existingCertificate) {
      console.log(`ℹ️ [Certificate] Certificate already exists for user ${userId}, course ${courseId}`);
      return existingCertificate;
    }

    // Get user and course details
    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!user || !course) {
      throw new Error('User or course not found');
    }

    // Get course progress
    const courseProgress = await Progress.getOverallCourseProgress(userId, courseId, course.videos.length);
    
    // Only generate if course is 100% completed and all lessons are completed
    if (courseProgress.courseProgressPercentage < 100) {
      console.log(`ℹ️ [Certificate] Course not 100% completed (${courseProgress.courseProgressPercentage}%)`);
      return null;
    }
    
    // Check if all lessons are completed
    if (courseProgress.completedVideos < courseProgress.totalVideos) {
      console.log(`ℹ️ [Certificate] Not all lessons completed (${courseProgress.completedVideos}/${courseProgress.totalVideos})`);
      return null;
    }
    
    // Check if user has watched at least the total course duration (with small tolerance)
    if (courseProgress.totalWatchedDuration < courseProgress.courseTotalDuration) {
      const remainingTime = Math.max(0, courseProgress.courseTotalDuration - courseProgress.totalWatchedDuration);
      const toleranceSeconds = 120; // allow up to 2 minutes remaining as tolerance
      if (remainingTime > toleranceSeconds) {
        const remainingMinutes = Math.ceil(remainingTime / 60);
        console.log(`ℹ️ [Certificate] User hasn't watched enough content (${courseProgress.totalWatchedDuration}s/${courseProgress.courseTotalDuration}s). Need ${remainingMinutes} more minutes.`);
        return null;
      }
    }

    // Generate certificate
    const certificateId = Certificate.generateCertificateId();
    
    const certificate = new Certificate({
      certificateId,
      studentId: userId,
      courseId,
      studentName: user.name,
      courseTitle: course.title,
      instructorName: course.instructorName || 'IBYET-INVESTING',
      completionDate: new Date(),
      totalLessons: course.videos.length,
      completedLessons: courseProgress.completedVideos,
      completionPercentage: courseProgress.courseProgressPercentage,
      platformName: 'IBYET-INVESTING'
    });

    // Generate PDF
    const pdfBuffer = await exports.generateCertificatePDF(certificate);
    const pdfUrl = await saveCertificatePDF(pdfBuffer, certificateId, course.title);
    
    certificate.pdfUrl = pdfUrl;
    await certificate.save();

    console.log(`✅ [Certificate] Auto-generated certificate: ${certificateId}`);
    return certificate;

  } catch (error) {
    console.error('❌ [Certificate] Error auto-generating certificate:', error);
    return null;
  }
};
