import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized caching configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep unused data in cache for 30 minutes (increased for better UX)
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Custom persistence utilities for enhanced caching
const CACHE_KEY = 'qendiel-cache';
const CACHE_VERSION = 'v1.0.0';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Cache storage interface
interface CacheEntry {
  data: any;
  timestamp: number;
  version: string;
}

// Custom localStorage persister
class CustomCachePersister {
  private storage: Storage;
  private key: string;

  constructor(storage: Storage = localStorage, key: string = CACHE_KEY) {
    this.storage = storage;
    this.key = key;
  }

  // Save data to localStorage
  set(key: string, data: any): void {
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      this.storage.setItem(`${this.key}-${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to save cache data:', error);
    }
  }

  // Get data from localStorage
  get(key: string): any | null {
    try {
      const item = this.storage.getItem(`${this.key}-${key}`);
      if (!item) return null;

      const entry: CacheEntry = JSON.parse(item);
      
      // Check if cache is expired
      if (Date.now() - entry.timestamp > CACHE_MAX_AGE) {
        this.remove(key);
        return null;
      }

      // Check version compatibility
      if (entry.version !== CACHE_VERSION) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve cache data:', error);
      return null;
    }
  }

  // Remove data from localStorage
  remove(key: string): void {
    try {
      this.storage.removeItem(`${this.key}-${key}`);
    } catch (error) {
      console.warn('Failed to remove cache data:', error);
    }
  }

  // Clear all cache data
  clear(): void {
    try {
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith(this.key)) {
          this.storage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache data:', error);
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    try {
      const keys = Object.keys(this.storage).filter(key => key.startsWith(this.key));
      return {
        size: keys.length,
        keys: keys.map(key => key.replace(`${this.key}-`, '')),
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { size: 0, keys: [] };
    }
  }
}

// Create cache persister instance
export const cachePersister = new CustomCachePersister();

// Initialize persistent caching
export const initializePersistentCache = async () => {
  try {
    // Restore cached queries on app startup
    const cachedQueries = cachePersister.get('queries');
    if (cachedQueries) {
      // Restore queries to React Query cache
      Object.entries(cachedQueries).forEach(([key, data]) => {
        queryClient.setQueryData(JSON.parse(key), data);
      });
    }
    console.log('✅ Persistent cache initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize persistent cache:', error);
  }
};

// Save cache data periodically
export const saveCacheData = () => {
  try {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const cacheData: Record<string, any> = {};

    queries.forEach(query => {
      if (query.state.data && query.state.status === 'success') {
        cacheData[JSON.stringify(query.queryKey)] = query.state.data;
      }
    });

    cachePersister.set('queries', cacheData);
  } catch (error) {
    console.warn('Failed to save cache data:', error);
  }
};

// Query keys for consistent caching
export const queryKeys = {
  // Course-related queries
  courses: {
    all: ['courses'] as const,
    lists: () => [...queryKeys.courses.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.courses.lists(), filters] as const,
    details: () => [...queryKeys.courses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
    featured: () => [...queryKeys.courses.all, 'featured'] as const,
  },
  
  // Video-related queries
  videos: {
    all: ['videos'] as const,
    course: (courseId: string, version: number = 1) => [...queryKeys.videos.all, 'course', courseId, version] as const,
    detail: (videoId: string) => [...queryKeys.videos.all, 'detail', videoId] as const,
  },
  
  // User-related queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    dashboard: () => [...queryKeys.user.all, 'dashboard'] as const,
    progress: (courseId?: string) => [...queryKeys.user.all, 'progress', courseId].filter(Boolean) as const,
  },
  
  // Certificate-related queries
  certificates: {
    all: ['certificates'] as const,
    list: () => [...queryKeys.certificates.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.certificates.all, 'detail', id] as const,
  },
} as const;
