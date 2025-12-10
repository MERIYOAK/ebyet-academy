// Enhanced cache persistence system
import { queryClient } from '../lib/queryClient';
import { cachePersister } from '../lib/queryClient';

export class CachePersistence {
  // Save specific query data to persistent cache
  static saveQueryToPersistentCache(queryKey: any[], data: any): void {
    try {
      const key = this.getCacheKey(queryKey);
      cachePersister.set(key, data);
      console.log(`💾 Saved to persistent cache: ${key}`);
    } catch (error) {
      console.warn('Failed to save to persistent cache:', error);
    }
  }

  // Get cache key from query key
  private static getCacheKey(queryKey: any[]): string {
    if (queryKey.includes('user') && queryKey.includes('profile')) {
      return 'user-profile';
    } else if (queryKey.includes('user') && queryKey.includes('dashboard')) {
      return 'user-dashboard';
    } else if (queryKey.includes('certificates')) {
      return 'certificates';
    } else if (queryKey.includes('progress')) {
      const courseId = queryKey.find(key => typeof key === 'string' && key.length > 20);
      return courseId ? `progress-${courseId}` : 'progress';
    } else if (queryKey.includes('courses')) {
      return 'courses';
    }
    return 'general';
  }

  // Monitor and save cache changes
  static startCacheMonitoring(): () => void {
    console.log('🔍 Starting cache persistence monitoring...');
    
    const interval = setInterval(() => {
      try {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        
        queries.forEach(query => {
          if (query.state.status === 'success' && query.state.data) {
            const key = this.getCacheKey(query.queryKey);
            cachePersister.set(key, query.state.data);
          }
        });
        
        // Also save the main queries cache
        const allQueriesData: Record<string, any> = {};
        queries.forEach(query => {
          if (query.state.status === 'success' && query.state.data) {
            allQueriesData[JSON.stringify(query.queryKey)] = query.state.data;
          }
        });
        cachePersister.set('queries', allQueriesData);
        
      } catch (error) {
        console.warn('Cache monitoring error:', error);
      }
    }, 30000); // Save every 30 seconds

    // Return cleanup function
    return () => {
      clearInterval(interval);
      console.log('🛑 Cache persistence monitoring stopped');
    };
  }

  // Force save all current cache data
  static forceSaveAllCache(): void {
    try {
      console.log('💾 Force saving all cache data...');
      
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      let savedCount = 0;
      queries.forEach(query => {
        if (query.state.status === 'success' && query.state.data) {
          const key = this.getCacheKey(query.queryKey);
          cachePersister.set(key, query.state.data);
          savedCount++;
        }
      });
      
      // Save main queries cache
      const allQueriesData: Record<string, any> = {};
      queries.forEach(query => {
        if (query.state.status === 'success' && query.state.data) {
          allQueriesData[JSON.stringify(query.queryKey)] = query.state.data;
        }
      });
      cachePersister.set('queries', allQueriesData);
      
      console.log(`✅ Saved ${savedCount} cache entries to persistent storage`);
      
    } catch (error) {
      console.error('Failed to force save cache:', error);
    }
  }

  // Get persistent cache status
  static getPersistentCacheStatus(): {
    totalEntries: number;
    entries: Array<{
      key: string;
      size: number;
      hasData: boolean;
      timestamp: string;
    }>;
  } {
    try {
      const allKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('qendiel-cache')
      );
      
      const entries = allKeys.map(key => {
        const value = localStorage.getItem(key);
        let parsedValue = null;
        try {
          parsedValue = value ? JSON.parse(value) : null;
        } catch (e) {
          parsedValue = { error: 'Failed to parse' };
        }
        
        return {
          key: key.replace('qendiel-cache-', ''),
          size: value ? value.length : 0,
          hasData: !!parsedValue?.data,
          timestamp: parsedValue?.timestamp ? new Date(parsedValue.timestamp).toLocaleString() : 'N/A'
        };
      });
      
      return {
        totalEntries: entries.length,
        entries
      };
      
    } catch (error) {
      console.error('Failed to get persistent cache status:', error);
      return { totalEntries: 0, entries: [] };
    }
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).CachePersistence = CachePersistence;
}
