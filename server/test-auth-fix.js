const jwt = require('jsonwebtoken');
require('dotenv').config();

// Generate a JWT token for the user who purchased the course
const userId = '68a66a72abb59c388de0a9cf';
const userEmail = 'meronmichaelabrha@gmail.com';

const token = jwt.sign(
  { 
    userId: userId, 
    email: userEmail, 
    role: 'user',
    authProvider: 'local' 
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('🔧 Testing authentication fix...');
console.log(`User ID: ${userId}`);
console.log(`User Email: ${userEmail}`);
console.log(`Token: ${token}`);

console.log('\n🔧 Test the API with authentication:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5000/api/videos/course/68a616a61e7edf6233cc14e7/version/1`);

console.log('\n🔧 Expected behavior:');
console.log('- With token: Should show all videos with access for purchased user');
console.log('- Without token: Should show only free preview videos');
