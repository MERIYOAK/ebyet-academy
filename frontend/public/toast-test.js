/**
 * Production Toast Testing Script
 * Run this in the browser console to test toast notifications in production
 */

// Function to test toast notifications in production
function testToastNotifications() {
  console.log('🔔 Starting Toast Production Test...');
  
  // Check if toast service is available
  if (typeof window.toastService === 'undefined') {
    console.error('❌ Toast service not available');
    return false;
  }
  
  // Enable debug mode
  window.toastService.enableDebugMode();
  
  // Test different toast types
  const testToasts = [
    { message: '✅ Success: Course created successfully', type: 'success', duration: 3000 },
    { message: '❌ Error: Failed to upload video', type: 'error', duration: 3000 },
    { message: '⚠️ Warning: Low storage space', type: 'warning', duration: 3000 },
    { message: '🔄 Info: Dashboard updated', type: 'success', duration: 2000 },
    { message: '🎉 Welcome to Admin Dashboard', type: 'success', duration: 4000 }
  ];
  
  // Dispatch toast events
  testToasts.forEach((toast, index) => {
    setTimeout(() => {
      console.log(`🔔 Sending toast ${index + 1}:`, toast);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: toast }));
    }, index * 1000);
  });
  
  // Test persistent toast
  setTimeout(() => {
    const persistentToast = {
      message: '🔧 Debug: This toast persists for testing',
      type: 'warning',
      persist: true
    };
    console.log('🔔 Sending persistent toast:', persistentToast);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: persistentToast }));
  }, 6000);
  
  console.log('✅ Toast test completed. Check for notifications in the UI.');
  return true;
}

// Function to check toast health
function checkToastHealth() {
  console.log('🔔 Checking Toast Health...');
  
  const healthChecks = {
    localStorage: typeof Storage !== 'undefined',
    customEvents: typeof CustomEvent !== 'undefined',
    toastService: typeof window.toastService !== 'undefined',
    debugMode: window.localStorage.getItem('debug-toast') === 'true',
    environment: import.meta.env?.PROD ? 'production' : 'development'
  };
  
  console.log('🔔 Toast Health Check Results:', healthChecks);
  
  const allHealthy = Object.values(healthChecks).every(check => check === true);
  console.log(`🔔 Overall Health: ${allHealthy ? '✅ Healthy' : '⚠️ Issues detected'}`);
  
  return healthChecks;
}

// Function to enable/disable debug mode
function toggleDebugMode() {
  const isCurrentlyEnabled = window.localStorage.getItem('debug-toast') === 'true';
  
  if (isCurrentlyEnabled) {
    window.toastService.disableDebugMode();
    console.log('🔔 Debug mode disabled');
  } else {
    window.toastService.enableDebugMode();
    console.log('🔔 Debug mode enabled');
  }
  
  return !isCurrentlyEnabled;
}

// Function to simulate real-world toast scenarios
function simulateRealWorldScenarios() {
  console.log('🔔 Simulating Real-World Toast Scenarios...');
  
  const scenarios = [
    // Course creation success
    { message: 'Course "Introduction to Investing" created successfully', type: 'success', duration: 4000 },
    
    // Video upload error
    { message: 'Failed to upload video: File size too large', type: 'error', duration: 5000 },
    
    // User management
    { message: 'User account activated successfully', type: 'success', duration: 3000 },
    
    // Bundle operations
    { message: 'Bundle pricing updated', type: 'success', duration: 3000 },
    
    // Network issues
    { message: 'Connection lost. Retrying...', type: 'warning', duration: 3000 },
    
    // Admin operations
    { message: 'Dashboard statistics refreshed', type: 'success', duration: 2000 }
  ];
  
  scenarios.forEach((scenario, index) => {
    setTimeout(() => {
      console.log(`🔔 Scenario ${index + 1}:`, scenario);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: scenario }));
    }, index * 1500);
  });
  
  console.log('✅ Real-world scenarios test initiated');
}

// Make functions globally available
window.testToastNotifications = testToastNotifications;
window.checkToastHealth = checkToastHealth;
window.toggleDebugMode = toggleDebugMode;
window.simulateRealWorldScenarios = simulateRealWorldScenarios;

// Auto-run health check when script loads
console.log('🔔 Toast Production Testing Script Loaded');
console.log('🔔 Available commands:');
console.log('  - testToastNotifications()');
console.log('  - checkToastHealth()');
console.log('  - toggleDebugMode()');
console.log('  - simulateRealWorldScenarios()');

// Auto-check health
setTimeout(() => {
  checkToastHealth();
}, 1000);
