/**
 * Test utility for deployment notification system
 * Use this to simulate deployment notifications in development
 */

import deploymentNotificationService from '../services/deploymentNotificationService';

export const testDeploymentNotification = () => {
  console.log('🧪 Testing deployment notification system...');
  
  // Simulate a new deployment by directly triggering the event
  const event = new CustomEvent('deploymentUpdate', {
    detail: {
      message: null // Important: null to trigger translation
    }
  });
  
  window.dispatchEvent(event);
  console.log('🧪 Deployment notification test event dispatched');
};

export const checkDeploymentService = () => {
  console.log('🔍 Checking deployment service status...');
  
  const currentDeployment = deploymentNotificationService.getCurrentDeployment();
  console.log('📋 Current deployment info:', currentDeployment);
  
  // Check if service is running
  console.log('📋 Service methods available:', {
    startCheck: typeof deploymentNotificationService.startDeploymentCheck,
    stopCheck: typeof deploymentNotificationService.stopDeploymentCheck,
    getCurrent: typeof deploymentNotificationService.getCurrentDeployment
  });
  
  // Check current language
  const currentLang = localStorage.getItem('i18nextLng');
  console.log('🌍 Current language:', currentLang);
};

// Add to window for easy testing in browser console
declare global {
  interface Window {
    testDeploymentNotification: typeof testDeploymentNotification;
    checkDeploymentService: typeof checkDeploymentService;
  }
}

// Make available globally for testing
if (typeof window !== 'undefined') {
  window.testDeploymentNotification = testDeploymentNotification;
  window.checkDeploymentService = checkDeploymentService;
  
  console.log('🧪 Deployment notification test utilities loaded');
  console.log('🧪 Run window.testDeploymentNotification() to test');
  console.log('🧪 Run window.checkDeploymentService() to check service status');
}
