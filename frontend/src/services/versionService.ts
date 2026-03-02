/**
 * Version Service for handling application updates
 * Detects when new code is deployed and notifies users
 */

interface VersionInfo {
  version: string;
  buildTime: string;
  buildHash: string;
}

class VersionService {
  private currentVersion: VersionInfo | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  constructor() {
    // Set refresh timestamp to prevent immediate notification after refresh
    sessionStorage.setItem('lastPageRefresh', Date.now().toString());
    this.loadCurrentVersion().catch(console.error);
  }

  /**
   * Load current version from build-time generated file
   */
  private async loadCurrentVersion(): Promise<void> {
    try {
      // Try to load from generated version file first
      const response = await fetch('/version.json');
      const versionFile = await response.json();
      this.currentVersion = versionFile;
      console.log('📋 Loaded version from version.json:', this.currentVersion);
    } catch (error) {
      // Fallback to environment variables
      console.warn('⚠️ Could not load version.json, falling back to environment variables');
      this.currentVersion = {
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
        buildHash: import.meta.env.VITE_BUILD_HASH || 'dev'
      };
      console.log('📋 Loaded version from environment variables:', this.currentVersion);
    }
  }

  /**
   * Start version checking
   */
  startVersionCheck(): void {
    if (this.checkInterval) return;

    console.log('🔍 Starting version check service');
    
    // Wait 10 seconds before first check to avoid showing notification immediately after refresh
    setTimeout(() => {
      this.checkForUpdates();
    }, 10000);
    
    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop version checking
   */
  stopVersionCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 Stopped version check service');
    }
  }

  /**
   * Check for updates by comparing with server
   */
  private async checkForUpdates(): Promise<void> {
    try {
      // Skip version check if page was just refreshed (within last 30 seconds)
      const lastRefresh = sessionStorage.getItem('lastPageRefresh');
      const now = Date.now();
      if (lastRefresh && (now - parseInt(lastRefresh)) < 30000) {
        console.log('⏭️ Skipping version check - page recently refreshed');
        return;
      }

      const response = await fetch('/api/version');
      if (!response.ok) return;

      const serverResponse = await response.json();
      console.log('📡 Server version response:', serverResponse);
      
      // Handle wrapped response structure
      const serverVersion: VersionInfo = serverResponse.data || serverResponse;
      
      console.log('📋 Version comparison:', {
        current: this.currentVersion,
        server: serverVersion,
        hashMatch: serverVersion.buildHash === this.currentVersion?.buildHash,
        buildTimeMatch: serverVersion.buildTime === this.currentVersion?.buildTime
      });
      
      if (this.hasVersionChanged(serverVersion)) {
        this.handleVersionUpdate(serverVersion);
      }
    } catch (error) {
      console.warn('⚠️ Version check failed:', error);
    }
  }

  /**
   * Check if version has changed
   */
  private hasVersionChanged(serverVersion: VersionInfo): boolean {
    if (!this.currentVersion) return false;
    
    // Only compare build hashes (most reliable)
    if (serverVersion.buildHash !== this.currentVersion.buildHash) {
      console.log('🆕 Build hash changed:', {
        from: this.currentVersion.buildHash,
        to: serverVersion.buildHash
      });
      return true;
    }

    // Fallback to build time comparison (ignore deployTime)
    if (serverVersion.buildTime !== this.currentVersion.buildTime) {
      console.log('🆕 Build time changed:', {
        from: this.currentVersion.buildTime,
        to: serverVersion.buildTime
      });
      return true;
    }

    // Ignore deployTime - it changes every time in development
    // Only consider actual build identifiers (hash and buildTime)
    console.log('📋 Version comparison - No changes detected');
    return false;
  }

  /**
   * Handle version update
   */
  private handleVersionUpdate(serverVersion: VersionInfo): void {
    console.log('🚀 New version detected:', serverVersion);
    
    // Preserve the original current version for the notification
    const originalCurrentVersion = this.currentVersion;
    
    // Update current version
    this.currentVersion = serverVersion;
    
    // Clear all cache when new version is deployed
    this.clearAllCacheOnUpdate();
    
    // Show update notification with original current version
    this.showUpdateNotification(originalCurrentVersion, serverVersion);
    
    // Optionally auto-refresh after delay
    // this.scheduleAutoRefresh();
  }

  /**
   * Clear all cache when new version is detected
   */
  private clearAllCacheOnUpdate(): void {
    try {
      // Import CacheManager dynamically to avoid circular imports
      import('../utils/cacheManager').then(({ CacheManager }) => {
        console.log('🗑️ Clearing all cache due to new version deployment');
        
        // Use comprehensive cache refresh for major changes
        CacheManager.refreshAllContentCache();
        
        // Also clear React Query cache completely for version updates
        import('../lib/queryClient').then(({ queryClient }) => {
          queryClient.clear();
          console.log('✅ All cache cleared for new version');
        });
      });
    } catch (error) {
      console.warn('⚠️ Failed to clear cache on version update:', error);
    }
  }

  /**
   * Show update notification to user
   */
  private showUpdateNotification(currentVersion: VersionInfo | null, newVersion: VersionInfo): void {
    console.log('📊 Version notification data:', {
      currentVersion,
      newVersion
    });
    
    // Create custom notification event
    const event = new CustomEvent('appUpdateAvailable', {
      detail: {
        currentVersion: currentVersion,
        newVersion: newVersion,
        message: 'A new version of the application is available!'
      }
    });
    
    window.dispatchEvent(event);
  }

  /**
   * Schedule automatic refresh
   */
  private scheduleAutoRefresh(): void {
    console.log('⏰ Scheduling auto-refresh in 30 seconds...');
    
    setTimeout(() => {
      if (confirm('New version available! Refresh now?')) {
        window.location.reload();
      }
    }, 30000);
  }

  /**
   * Force refresh the application
   */
  forceRefresh(): void {
    console.log('🔄 Force refreshing application...');
    window.location.reload();
  }

  /**
   * Get current version info
   */
  getCurrentVersion(): VersionInfo | null {
    return this.currentVersion;
  }
}

// Create singleton instance
const versionService = new VersionService();

export default versionService;
export type { VersionInfo };
