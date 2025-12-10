console.log('🔍 Checking Environment Configuration...');
console.log('');

// Check required environment variables
const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'SESSION_SECRET',
  'PORT',
  'NODE_ENV'
];

const optionalVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

console.log('📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
  }
});

console.log('');
console.log('📋 Optional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== 'your_aws_access_key_id' && value !== 'your_aws_secret_access_key') {
    console.log(`   ✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
  } else if (value && (value === 'your_aws_access_key_id' || value === 'your_aws_secret_access_key')) {
    console.log(`   ⚠️  ${varName}: SET TO DEFAULT VALUE (needs real credentials)`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
  }
});

console.log('');
console.log('🔍 S3 Configuration Status:');
const hasAwsKey = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== 'your_aws_access_key_id';
const hasAwsSecret = process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY !== 'your_aws_secret_access_key';
const hasAwsBucket = process.env.AWS_S3_BUCKET;

if (hasAwsKey && hasAwsSecret && hasAwsBucket) {
  console.log('   ✅ AWS S3 is fully configured');
  console.log('   📸 Profile photo uploads should work');
} else if (hasAwsBucket) {
  console.log('   ⚠️  AWS S3 partially configured');
  console.log('   ❌ Missing AWS credentials');
  console.log('   📸 Profile photo uploads will fail');
} else {
  console.log('   ❌ AWS S3 not configured');
  console.log('   📸 Profile photo uploads will fail');
  console.log('   💡 To fix: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET');
}

console.log('');
console.log('🎯 Summary:');
if (!hasAwsKey || !hasAwsSecret) {
  console.log('   ❌ Profile image uploads will NOT work');
  console.log('   💡 Missing AWS credentials in environment variables');
  console.log('   💡 Create a .env file in the server directory with real AWS credentials');
} else {
  console.log('   ✅ Profile image uploads should work');
}

console.log('');
console.log('💡 To fix profile image uploads:');
console.log('   1. Create a .env file in the server directory');
console.log('   2. Add your real AWS credentials:');
console.log('      AWS_ACCESS_KEY_ID=your_real_access_key');
console.log('      AWS_SECRET_ACCESS_KEY=your_real_secret_key');
console.log('      AWS_S3_BUCKET=persi-edu-platform');
console.log('      AWS_REGION=us-east-1');
console.log('   3. Restart the server');
