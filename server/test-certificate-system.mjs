import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = null;

// Helper function to make authenticated requests
const makeRequest = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
};

// Test functions
const testLogin = async () => {
  console.log('🔧 Testing login...');
  
  const response = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(testUser)
  });

  if (response.ok) {
    const data = await response.json();
    authToken = data.data.token;
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed');
    return false;
  }
};

const testGetUserCertificates = async () => {
  console.log('🔧 Testing get user certificates...');
  
  const response = await makeRequest('/certificates/user');
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ User certificates retrieved:', data.data.certificates.length);
    return data.data.certificates;
  } else {
    console.log('❌ Failed to get user certificates');
    return [];
  }
};

const testGenerateCertificate = async (courseId) => {
  console.log(`🔧 Testing certificate generation for course ${courseId}...`);
  
  const response = await makeRequest('/certificates/generate', {
    method: 'POST',
    body: JSON.stringify({ courseId })
  });

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Certificate generated:', data.data.certificate.certificateId);
    return data.data.certificate;
  } else {
    const errorData = await response.json();
    console.log('❌ Failed to generate certificate:', errorData.message);
    return null;
  }
};

const testVerifyCertificate = async (certificateId) => {
  console.log(`🔧 Testing certificate verification for ${certificateId}...`);
  
  const response = await fetch(`${BASE_URL}/certificates/verify/${certificateId}`);
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Certificate verified:', data.data.verification.isValid);
    return data.data;
  } else {
    console.log('❌ Failed to verify certificate');
    return null;
  }
};

const testDownloadCertificate = async (certificateId) => {
  console.log(`🔧 Testing certificate download for ${certificateId}...`);
  
  const response = await makeRequest(`/certificates/download/${certificateId}`);
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Certificate download URL:', data.data.downloadUrl);
    return data.data.downloadUrl;
  } else {
    console.log('❌ Failed to download certificate');
    return null;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Certificate System Tests...\n');

  // Test 1: Login
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Test 2: Get user certificates
  const certificates = await testGetUserCertificates();
  console.log(`Found ${certificates.length} certificates\n`);

  // Test 3: Try to generate certificate (this will fail if course is not completed)
  // You'll need to replace 'your-course-id' with an actual course ID that the user has completed
  const testCourseId = 'your-course-id'; // Replace with actual course ID
  const generatedCert = await testGenerateCertificate(testCourseId);
  
  if (generatedCert) {
    // Test 4: Verify the generated certificate
    await testVerifyCertificate(generatedCert.certificateId);
    
    // Test 5: Download the certificate
    await testDownloadCertificate(generatedCert.certificateId);
  }

  console.log('\n✅ Certificate system tests completed!');
};

// Run the tests
runTests().catch(console.error);
