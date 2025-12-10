const bcrypt = require('bcryptjs');

/**
 * Utility script to generate bcrypt hash for admin password
 * Run this script to generate a hash for your admin password
 * 
 * Usage: node utils/generateAdminPassword.js <your-password>
 */

const generateHash = async (password) => {
  try {
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('\n=== Admin Password Hash Generated ===');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nAdd this to your .env file:');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\n=====================================\n');
  } catch (error) {
    console.error('Error generating hash:', error);
  }
};

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.log('Usage: node utils/generateAdminPassword.js <your-password>');
  console.log('Example: node utils/generateAdminPassword.js mySecurePassword123');
  process.exit(1);
}

if (password.length < 6) {
  console.log('Password must be at least 6 characters long');
  process.exit(1);
}

generateHash(password); 