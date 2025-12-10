import { queryClient } from '../lib/queryClient';

export const CacheClearer = {
  // Clear all application cache
  clearAllCache: () => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear localStorage cache
    localStorage.removeItem('qendiel-cache');
    
    // Clear any other cache-related items
    localStorage.removeItem('qendiel-cache-version');
    localStorage.removeItem('qendiel-cache-timestamp');
    
    console.log('🧹 All cache cleared successfully');
  },

  // Clear course-specific cache
  clearCourseCache: (courseId: string) => {
    // Clear React Query cache for this course
    queryClient.removeQueries({ queryKey: ['courses', 'detail', courseId] });
    queryClient.removeQueries({ queryKey: ['videos', 'course', courseId] });
    
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['courses'] });
    queryClient.invalidateQueries({ queryKey: ['videos'] });
    
    console.log(`🧹 Cache cleared for course: ${courseId}`);
  },

  // Clear user-specific cache
  clearUserCache: () => {
    queryClient.removeQueries({ queryKey: ['user'] });
    queryClient.removeQueries({ queryKey: ['dashboard'] });
    queryClient.removeQueries({ queryKey: ['certificates'] });
    queryClient.removeQueries({ queryKey: ['progress'] });
    
    console.log('🧹 User cache cleared successfully');
  },

  // Clear video-related cache
  clearVideoCache: () => {
    queryClient.removeQueries({ queryKey: ['videos'] });
    queryClient.removeQueries({ queryKey: ['courses'] });
    
    console.log('🧹 Video cache cleared successfully');
  },

  // Get cache status
  getCacheStatus: () => {
    const reactQueryCache = queryClient.getQueryCache().getAll();
    const localStorageCache = localStorage.getItem('qendiel-cache');
    
    return {
      reactQueryEntries: reactQueryCache.length,
      localStorageSize: localStorageCache ? localStorageCache.length : 0,
      lastUpdated: localStorageCache ? 
        new Date(JSON.parse(localStorageCache).timestamp).toLocaleString() : 
        'No cache found'
    };
  }
};

// Make it available globally for easy access
(window as any).CacheClearer = CacheClearer;
