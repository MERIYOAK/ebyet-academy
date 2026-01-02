import { queryClient, cachePersister } from '../lib/queryClient';

export const CacheInspector = {
  // Check all cached data in React Query
  getReactQueryCache: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return queries.map(query => ({
      queryKey: query.queryKey,
      state: query.state.status,
      dataUpdatedAt: new Date(query.state.dataUpdatedAt || 0).toLocaleString(),
      data: query.state.data,
      staleTime: query.options.staleTime,
      gcTime: query.options.gcTime
    }));
  },

  // Check localStorage cache
  getLocalStorageCache: () => {
    try {
      const cacheData = localStorage.getItem('ibyet-cache') || localStorage.getItem('ebyet-cache'); // Legacy support
      if (!cacheData) return null;

      const parsed = JSON.parse(cacheData);
      return {
        version: parsed.version,
        timestamp: new Date(parsed.timestamp).toLocaleString(),
        data: parsed.data,
        size: JSON.stringify(parsed).length + ' bytes'
      };
    } catch (error) {
      return { error: 'Failed to parse cache data' };
    }
  },

  // Get detailed cache statistics
  getCacheStats: () => {
    const reactQueryCache = CacheInspector.getReactQueryCache();
    const localStorageCache = CacheInspector.getLocalStorageCache();
    
    return {
      reactQuery: {
        totalQueries: reactQueryCache.length,
        successfulQueries: reactQueryCache.filter(q => q.state === 'success').length,
        loadingQueries: reactQueryCache.filter(q => q.state === 'pending').length,
        errorQueries: reactQueryCache.filter(q => q.state === 'error').length,
        queries: reactQueryCache
      },
      localStorage: localStorageCache,
      timestamp: new Date().toLocaleString()
    };
  },

  // Check specific user data cache
  getUserDataCache: () => {
    const cache = queryClient.getQueryCache();
    const userQueries = cache.getAll().filter(query => 
      query.queryKey[0] === 'user' || 
      query.queryKey[0] === 'dashboard' ||
      query.queryKey[0] === 'certificates'
    );
    
    return userQueries.map(query => ({
      type: query.queryKey[0],
      key: query.queryKey,
      lastUpdated: new Date(query.state.dataUpdatedAt || 0).toLocaleString(),
      status: query.state.status,
      hasData: !!query.state.data
    }));
  },

  // Clear specific cache entries
  clearCacheEntry: (queryKey: string[]) => {
    queryClient.removeQueries({ queryKey });
    console.log(`Cleared cache for: ${queryKey.join(' -> ')}`);
  },

  // Clear all cache
  clearAllCache: () => {
    queryClient.clear();
    localStorage.removeItem('ibyet-cache');
    localStorage.removeItem('ebyet-cache'); // Legacy support
    console.log('All cache cleared');
  }
};

// Make it available globally for easy access
(window as any).CacheInspector = CacheInspector;
