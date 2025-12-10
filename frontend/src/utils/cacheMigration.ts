// Cache migration utility to clean up old cache entries
import { cachePersister } from '../lib/queryClient';

export class CacheMigration {
  // Migrate from old cache keys to new ones
  static migrateFromOldCache(): void {
    try {
      // List of old cache keys to remove
      const oldCacheKeys = [
        'kandel-academy-cache-queries',
        'kandel-academy-cache-user-profile',
        'kandel-academy-cache-user-dashboard',
        'kandel-academy-cache-certificates',
        'kandel-academy-cache-progress-',
        'kandel-academy-cache'
      ];

      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Find and remove old cache keys
      const removedKeys: string[] = [];
      allKeys.forEach(key => {
        // Check if key matches any old cache pattern
        const shouldRemove = oldCacheKeys.some(oldKey => 
          key.startsWith(oldKey) || key.includes(oldKey)
        );
        
        if (shouldRemove) {
          localStorage.removeItem(key);
          removedKeys.push(key);
        }
      });

      if (removedKeys.length > 0) {
        console.log('✅ Migrated cache keys:', removedKeys);
        console.log('🔄 Old cache entries removed successfully');
      } else {
        console.log('ℹ️ No old cache entries found to migrate');
      }

    } catch (error) {
      console.warn('⚠️ Failed to migrate cache:', error);
    }
  }

  // Clean up any orphaned cache entries
  static cleanupOrphanedCache(): void {
    try {
      const allKeys = Object.keys(localStorage);
      const validCacheKeys = [
        'ibyet-cache-',
        'ebyet-cache-', // Legacy support
        'qendiel-cache-', // Legacy support
        'videoUrlCache',
        'i18nextLng',
        'theme',
        'token',
        'cookie_consent',
        'TanstackQueryDevtools.open'
      ];

      const orphanedKeys: string[] = [];
      allKeys.forEach(key => {
        const isValid = validCacheKeys.some(validKey => 
          key.startsWith(validKey) || key === validKey
        );
        
        if (!isValid && (key.includes('cache') || key.includes('kandel'))) {
          orphanedKeys.push(key);
        }
      });

      if (orphanedKeys.length > 0) {
        console.log('🧹 Found orphaned cache keys:', orphanedKeys);
        orphanedKeys.forEach(key => localStorage.removeItem(key));
        console.log('✅ Orphaned cache entries cleaned up');
      }

    } catch (error) {
      console.warn('⚠️ Failed to cleanup orphaned cache:', error);
    }
  }

  // Get current cache status
  static getCacheStatus(): {
    totalKeys: number;
    cacheKeys: string[];
    otherKeys: string[];
    cacheSize: number;
  } {
    try {
      const allKeys = Object.keys(localStorage);
      const cacheKeys = allKeys.filter(key => key.startsWith('ibyet-cache') || key.startsWith('ebyet-cache') || key.startsWith('qendiel-cache')); // Include legacy
      const otherKeys = allKeys.filter(key => !key.startsWith('ibyet-cache') && !key.startsWith('ebyet-cache') && !key.startsWith('qendiel-cache'));
      
      // Calculate approximate cache size
      let cacheSize = 0;
      cacheKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          cacheSize += value.length;
        }
      });

      return {
        totalKeys: allKeys.length,
        cacheKeys,
        otherKeys,
        cacheSize
      };
    } catch (error) {
      console.warn('⚠️ Failed to get cache status:', error);
      return {
        totalKeys: 0,
        cacheKeys: [],
        otherKeys: [],
        cacheSize: 0
      };
    }
  }

  // Force cache refresh (useful for testing)
  static forceCacheRefresh(): void {
    try {
      // Clear all cache (both new and legacy)
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('ibyet-cache') || key.startsWith('ebyet-cache') || key.startsWith('qendiel-cache')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('🔄 Cache refreshed - all cache entries cleared');
    } catch (error) {
      console.warn('⚠️ Failed to refresh cache:', error);
    }
  }
}

// Auto-migrate on import (for development)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  CacheMigration.migrateFromOldCache();
  CacheMigration.cleanupOrphanedCache();
}
