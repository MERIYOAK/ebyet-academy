const mongoose = require('mongoose');
const Certificate = require('./models/Certificate');

async function createTestCertificate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/persi-academy');
    console.log('Connected to database');

    // Create a test certificate
    const testCert = new Certificate({
      certificateId: 'CERT-TEST123',
      studentId: '507f1f77bcf86cd799439011',
      courseId: '507f1f77bcf86cd799439012',
      studentName: 'Test User',
      courseTitle: 'Test Course',
      instructorName: 'Test Instructor',
      completionDate: new Date(),
      totalLessons: 5,
      completedLessons: 5,
      completionPercentage: 100,
      platformName: 'Test Platform'
    });

    await testCert.save();
    console.log('Test certificate created:', testCert.certificateId);
    console.log('Verification hash:', testCert.verificationHash);

    // Test verification
    const foundCert = await Certificate.getByCertificateId('CERT-TEST123');
    console.log('Certificate found:', !!foundCert);
    if (foundCert) {
      console.log('Expected hash:', foundCert.generateVerificationHash());
      console.log('Stored hash:', foundCert.verificationHash);
      console.log('Verification valid:', foundCert.verificationHash === foundCert.generateVerificationHash());
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
  }
}

createTestCertificate();
