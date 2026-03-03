/**
 * Simple test script to simulate deployment notifications
 * Run with: node test-deployment.js
 */

const fs = require('fs');
const path = require('path');

// Create a new mock version file with different deployment ID
const newVersion = {
  deploymentId: `dev-test-${Date.now()}`,
  buildHash: `xyz789${Math.random().toString(36).substr(2, 6)}`,
  deployTime: new Date().toISOString()
};

// Write to mock-version.json
const mockVersionPath = path.join(__dirname, 'public', 'mock-version.json');
fs.writeFileSync(mockVersionPath, JSON.stringify(newVersion, null, 2));

console.log('✅ Mock version updated:', newVersion);
console.log('🧪 Now refresh your browser to see the deployment notification!');
console.log('📋 Deployment ID changed to:', newVersion.deploymentId);
console.log('');
console.log('💡 Testing instructions:');
console.log('1. Start your dev server');
console.log('2. Open browser console');
console.log('3. Run: window.testDeploymentNotification()');
console.log('4. Or run this script again to simulate new deployment');
