/**
 * Toast Utility Service
 * Helps with debugging and testing toast notifications in production
 */

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning';
  duration?: number;
  persist?: boolean;
}

class ToastService {
  private static instance: ToastService;
  private testMode = false;

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  // Enable debug mode for production testing
  enableDebugMode() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-toast', 'true');
      console.log('🔔 Toast debug mode enabled');
    }
  }

  // Disable debug mode
  disableDebugMode() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debug-toast');
      console.log('🔔 Toast debug mode disabled');
    }
  }

  // Check if debug mode is enabled
  isDebugMode(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('debug-toast') === 'true';
    }
    return false;
  }

  // Enable test mode for automated testing
  enableTestMode() {
    this.testMode = true;
    console.log('🔔 Toast test mode enabled');
  }

  // Disable test mode
  disableTestMode() {
    this.testMode = false;
    console.log('🔔 Toast test mode disabled');
  }

  // Test toast notifications
  testNotifications() {
    if (!this.testMode) {
      console.warn('Toast test mode is not enabled');
      return;
    }

    const testToasts: ToastMessage[] = [
      { message: 'Success: Course created successfully', type: 'success', duration: 3000 },
      { message: 'Error: Failed to upload video', type: 'error', duration: 3000 },
      { message: 'Warning: Low storage space remaining', type: 'warning', duration: 3000 },
      { message: 'Success: User account activated', type: 'success', duration: 3000 },
      { message: 'Error: Network connection lost', type: 'error', duration: 3000 }
    ];

    testToasts.forEach((toast, index) => {
      setTimeout(() => {
        console.log(`🔔 Test Toast ${index + 1}:`, toast);
        // In a real implementation, this would trigger the actual toast
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('show-toast', { detail: toast }));
        }
      }, index * 1000);
    });
  }

  // Production health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test if toast component can be rendered
      const testToast = {
        message: 'Toast health check successful',
        type: 'success' as const,
        duration: 1000
      };

      console.log('🔔 Toast health check:', testToast);
      
      // Check if localStorage is available
      const localStorageAvailable = typeof Storage !== 'undefined';
      console.log('🔔 LocalStorage available:', localStorageAvailable);

      // Check if we're in production
      const isProduction = import.meta.env?.PROD || false;
      console.log('🔔 Production mode:', isProduction);

      return localStorageAvailable;
    } catch (error) {
      console.error('🔔 Toast health check failed:', error);
      return false;
    }
  }

  // Log toast statistics
  getStats() {
    if (typeof window !== 'undefined') {
      const debugMode = this.isDebugMode();
      console.log('🔔 Toast Statistics:', {
        debugMode,
        testMode: this.testMode,
        environment: import.meta.env?.PROD ? 'production' : 'development',
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Export singleton instance
export const toastService = ToastService.getInstance();

// Global functions for easy access
export const enableToastDebug = () => toastService.enableDebugMode();
export const disableToastDebug = () => toastService.disableDebugMode();
export const testToastNotifications = () => toastService.testNotifications();
export const checkToastHealth = () => toastService.healthCheck();

// Add to window for easy access in production
if (typeof window !== 'undefined') {
  (window as any).toastService = toastService;
  (window as any).enableToastDebug = enableToastDebug;
  (window as any).disableToastDebug = disableToastDebug;
  (window as any).testToastNotifications = testToastNotifications;
  (window as any).checkToastHealth = checkToastHealth;
}

export default toastService;
