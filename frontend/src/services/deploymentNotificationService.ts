/**
 * Deployment Notification Service
 * Only shows notifications when a new version is deployed
 * No UI events, API responses, or manual triggers
 */

import { config } from '../config/environment';

interface DeploymentInfo {
  deploymentId: string;
  buildHash: string;
  deployTime: string;
}

class DeploymentNotificationService {
  private currentDeployment: DeploymentInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 2 * 60 * 1000; // Check every 2 minutes
  private readonly NOTIFIED_DEPLOYMENTS_KEY = 'notifiedDeployments';

  constructor() {
    this.loadCurrentDeployment().catch(console.error);
  }

  /**
   * Load current deployment info from build-time generated file
   */
  private async loadCurrentDeployment(): Promise<void> {
    try {
      const response = await fetch('/version.json');
      if (!response.ok) {
        throw new Error(`Version file not found: ${response.status}`);
      }
      const versionFile = await response.json();
      this.currentDeployment = {
        deploymentId: versionFile.buildHash || versionFile.deploymentId || 'unknown',
        buildHash: versionFile.buildHash || 'unknown',
        deployTime: versionFile.buildTime || versionFile.deployTime || new Date().toISOString()
      };
      console.log('📋 Loaded deployment info:', this.currentDeployment);
    } catch (error) {
      console.warn('⚠️ Could not load deployment info:', error);
      this.currentDeployment = {
        deploymentId: import.meta.env.VITE_BUILD_HASH || 'dev',
        buildHash: import.meta.env.VITE_BUILD_HASH || 'dev',
        deployTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString()
      };
    }
  }

  /**
   * Start deployment checking
   */
  startDeploymentCheck(): void {
    if (this.checkInterval) return;

    console.log('🔍 Starting deployment notification service');
    
    // Wait 30 seconds before first check to avoid showing notification immediately after load
    setTimeout(() => {
      this.checkForNewDeployment();
    }, 30000);
    
    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkForNewDeployment();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop deployment checking
   */
  stopDeploymentCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 Stopped deployment notification service');
    }
  }

  /**
   * Check for new deployments by comparing with server
   */
  private async checkForNewDeployment(): Promise<void> {
    try {
      if (!this.currentDeployment) return;

      // In development, use mock version endpoint for testing
      const versionUrl = import.meta.env.DEV 
        ? '/mock-version.json'
        : `${config.API_BASE_URL}/api/version`;
        
      console.log('🔍 Checking deployment at:', versionUrl);
      
      const response = await fetch(versionUrl);
      if (!response.ok) {
        console.warn('⚠️ Deployment check failed:', response.status);
        return;
      }

      const serverResponse = await response.json();
      const serverDeployment: DeploymentInfo = serverResponse.data || serverResponse;
      
      console.log('📡 Server deployment info:', serverDeployment);
      
      if (this.hasNewDeployment(serverDeployment)) {
        this.handleNewDeployment(serverDeployment);
      }
    } catch (error) {
      console.warn('⚠️ Deployment check failed:', error);
    }
  }

  /**
   * Check if there's a new deployment
   */
  private hasNewDeployment(serverDeployment: DeploymentInfo): boolean {
    if (!this.currentDeployment) return false;
    
    // Use buildHash as primary comparison (more reliable)
    if (serverDeployment.buildHash !== this.currentDeployment.buildHash) {
      console.log('🆕 New build hash detected:', {
        from: this.currentDeployment.buildHash,
        to: serverDeployment.buildHash
      });
      return true;
    }

    // Fallback to deploymentId comparison if both exist
    if (serverDeployment.deploymentId && 
        serverDeployment.deploymentId !== this.currentDeployment.deploymentId) {
      console.log('🆕 New deployment detected:', {
        from: this.currentDeployment.deploymentId,
        to: serverDeployment.deploymentId
      });
      return true;
    }

    console.log('📋 No new deployment detected');
    return false;
  }

  /**
   * Handle new deployment
   */
  private handleNewDeployment(serverDeployment: DeploymentInfo): void {
    console.log('🚀 New deployment detected:', serverDeployment);
    
    // Check if we've already notified about this deployment (use buildHash)
    if (this.hasBeenNotified(serverDeployment.buildHash)) {
      console.log('📋 Deployment already notified, skipping');
      return;
    }

    // Update current deployment
    this.currentDeployment = serverDeployment;
    
    // Mark as notified (use buildHash)
    this.markAsNotified(serverDeployment.buildHash);
    
    // Show simple deployment notification
    this.showDeploymentNotification();
    
    // Clear cache to ensure fresh content
    this.clearCacheOnNewDeployment();
  }

  /**
   * Check if deployment has already been notified
   */
  private hasBeenNotified(buildHash: string): boolean {
    try {
      const notifiedDeployments = JSON.parse(
        localStorage.getItem(this.NOTIFIED_DEPLOYMENTS_KEY) || '[]'
      );
      return notifiedDeployments.includes(buildHash);
    } catch {
      return false;
    }
  }

  /**
   * Mark deployment as notified
   */
  private markAsNotified(buildHash: string): void {
    try {
      const notifiedDeployments = JSON.parse(
        localStorage.getItem(this.NOTIFIED_DEPLOYMENTS_KEY) || '[]'
      );
      
      // Add new build hash
      notifiedDeployments.push(buildHash);
      
      // Keep only last 10 deployments to prevent storage bloat
      const recentDeployments = notifiedDeployments.slice(-10);
      
      localStorage.setItem(this.NOTIFIED_DEPLOYMENTS_KEY, JSON.stringify(recentDeployments));
      console.log('📋 Marked deployment as notified:', buildHash);
    } catch (error) {
      console.warn('⚠️ Failed to mark deployment as notified:', error);
    }
  }

  /**
   * Show simple deployment notification
   */
  private showDeploymentNotification(): void {
    console.log('📢 Showing deployment notification');
    
    // Create custom notification event without message (let Toast component handle translation)
    const event = new CustomEvent('deploymentUpdate', {
      detail: {
        message: null // Don't send hardcoded message, let Toast handle translation
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Clear cache when new deployment is detected
   */
  private clearCacheOnNewDeployment(): void {
    try {
      // Clear React Query cache
      import('../lib/queryClient').then(({ queryClient }) => {
        queryClient.clear();
        console.log('✅ Cache cleared for new deployment');
      });
      
      // Clear service worker cache if available
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }).then(() => {
          console.log('✅ Service worker cache cleared');
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear cache on new deployment:', error);
    }
  }

  /**
   * Get current deployment info
   */
  getCurrentDeployment(): DeploymentInfo | null {
    return this.currentDeployment;
  }
}

// Create singleton instance
const deploymentNotificationService = new DeploymentNotificationService();

export default deploymentNotificationService;
export type { DeploymentInfo };
