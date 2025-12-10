import { queryClient, cachePersister, queryKeys } from '../lib/queryClient';

// Cache management utilities for enhanced performance
export class CacheManager {
  // Clear all cache data
  static clearAllCache(): void {
    try {
      // Clear React Query cache
      queryClient.clear();
      
      // Clear persistent cache
      cachePersister.clear();
      
      console.log('✅ All cache cleared successfully');
    } catch (error) {
      console.warn('⚠️ Failed to clear cache:', error);
    }
  }

  // Clear specific cache by key pattern
  static clearCacheByPattern(pattern: string): void {
    try {
      // Clear React Query cache by pattern
      queryClient.removeQueries({ predicate: (query) => 
        JSON.stringify(query.queryKey).includes(pattern)
      });
      
      console.log(`✅ Cache cleared for pattern: ${pattern}`);
    } catch (error) {
      console.warn('⚠️ Failed to clear cache by pattern:', error);
    }
  }

  // Clear user-specific cache (useful for logout)
  static clearUserCache(): void {
    try {
      // Clear user-related queries
      queryClient.removeQueries({ queryKey: queryKeys.user.all });
      queryClient.removeQueries({ queryKey: queryKeys.certificates.all });
      
      // Clear persistent user data
      cachePersister.remove('user-profile');
      cachePersister.remove('user-dashboard');
      cachePersister.remove('certificates');
      
      console.log('✅ User cache cleared successfully');
    } catch (error) {
      console.warn('⚠️ Failed to clear user cache:', error);
    }
  }

  // Clear course-related cache
  static clearCourseCache(): void {
    try {
      queryClient.removeQueries({ queryKey: queryKeys.courses.all });
      console.log('✅ Course cache cleared successfully');
    } catch (error) {
      console.warn('⚠️ Failed to clear course cache:', error);
    }
  }

  // Clear video progress cache
  static clearProgressCache(): void {
    try {
      queryClient.removeQueries({ queryKey: queryKeys.user.progress() });
      console.log('✅ Progress cache cleared successfully');
    } catch (error) {
      console.warn('⚠️ Failed to clear progress cache:', error);
    }
  }

  // Preload critical data for better performance
  static async preloadCriticalData(): Promise<void> {
    try {
      // Preload user profile if authenticated
      const token = localStorage.getItem('token');
      if (token) {
        // Preload user profile
        await queryClient.prefetchQuery({
          queryKey: queryKeys.user.profile(),
          staleTime: 30 * 60 * 1000,
        });

        // Preload dashboard data
        await queryClient.prefetchQuery({
          queryKey: queryKeys.user.dashboard(),
          staleTime: 5 * 60 * 1000,
        });

        // Preload certificates
        await queryClient.prefetchQuery({
          queryKey: queryKeys.certificates.list(),
          staleTime: 30 * 60 * 1000,
        });
      }

      // Always preload featured courses
      await queryClient.prefetchQuery({
        queryKey: queryKeys.courses.featured(),
        staleTime: 15 * 60 * 1000,
      });

      console.log('✅ Critical data preloaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to preload critical data:', error);
    }
  }

  // Get cache statistics
  static getCacheStats(): {
    memoryCache: { size: number; queries: string[] };
    persistentCache: { size: number; keys: string[] };
  } {
    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      return {
        memoryCache: {
          size: queries.length,
          queries: queries.map(q => JSON.stringify(q.queryKey))
        },
        persistentCache: cachePersister.getStats()
      };
    } catch (error) {
      console.warn('⚠️ Failed to get cache stats:', error);
      return {
        memoryCache: { size: 0, queries: [] },
        persistentCache: { size: 0, keys: [] }
      };
    }
  }

  // Invalidate specific cache entries
  static invalidateCache(queryKey: any[]): void {
    try {
      queryClient.invalidateQueries({ queryKey });
      console.log('✅ Cache invalidated for:', JSON.stringify(queryKey));
    } catch (error) {
      console.warn('⚠️ Failed to invalidate cache:', error);
    }
  }

  // Set cache data manually (useful for optimistic updates)
  static setCacheData(queryKey: any[], data: any): void {
    try {
      queryClient.setQueryData(queryKey, data);
      console.log('✅ Cache data set for:', JSON.stringify(queryKey));
    } catch (error) {
      console.warn('⚠️ Failed to set cache data:', error);
    }
  }

  // Get cached data
  static getCacheData(queryKey: any[]): any {
    try {
      return queryClient.getQueryData(queryKey);
    } catch (error) {
      console.warn('⚠️ Failed to get cache data:', error);
      return undefined;
    }
  }

  // Check if data is cached and fresh
  static isDataCached(queryKey: any[]): boolean {
    try {
      const query = queryClient.getQueryState(queryKey);
      return query?.status === 'success' && !query.isStale;
    } catch (error) {
      console.warn('⚠️ Failed to check cache status:', error);
      return false;
    }
  }

  // Force refetch of specific data
  static async refetchData(queryKey: any[]): Promise<void> {
    try {
      await queryClient.refetchQueries({ queryKey });
      console.log('✅ Data refetched for:', JSON.stringify(queryKey));
    } catch (error) {
      console.warn('⚠️ Failed to refetch data:', error);
    }
  }

  // Optimize cache for offline usage
  static optimizeForOffline(): void {
    try {
      // Increase cache times for offline usage
      queryClient.setDefaultOptions({
        queries: {
          staleTime: 60 * 60 * 1000, // 1 hour
          gcTime: 24 * 60 * 60 * 1000, // 24 hours
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        }
      });
      
      console.log('✅ Cache optimized for offline usage');
    } catch (error) {
      console.warn('⚠️ Failed to optimize cache for offline:', error);
    }
  }

  // Restore normal cache settings
  static restoreNormalCache(): void {
    try {
      // Restore normal cache times
      queryClient.setDefaultOptions({
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 30 * 60 * 1000, // 30 minutes
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
        }
      });
      
      console.log('✅ Normal cache settings restored');
    } catch (error) {
      console.warn('⚠️ Failed to restore normal cache settings:', error);
    }
  }
}

// Export individual functions for convenience
export const {
  clearAllCache,
  clearUserCache,
  clearCourseCache,
  clearProgressCache,
  preloadCriticalData,
  getCacheStats,
  invalidateCache,
  setCacheData,
  getCacheData,
  isDataCached,
  refetchData,
  optimizeForOffline,
  restoreNormalCache
} = CacheManager;
