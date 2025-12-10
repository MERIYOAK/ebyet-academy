import { queryClient } from '../lib/queryClient';

export const CacheClearer = {
  // Clear all application cache
  clearAllCache: () => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear localStorage cache
    localStorage.removeItem('ibyet-cache');
    localStorage.removeItem('ebyet-cache'); // Legacy support
    localStorage.removeItem('qendiel-cache'); // Legacy support
    
    // Clear any other cache-related items
    localStorage.removeItem('ibyet-cache-version');
    localStorage.removeItem('ibyet-cache-timestamp');
    localStorage.removeItem('ebyet-cache-version'); // Legacy support
    localStorage.removeItem('ebyet-cache-timestamp'); // Legacy support
    localStorage.removeItem('qendiel-cache-version'); // Legacy support
    localStorage.removeItem('qendiel-cache-timestamp'); // Legacy support
    
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
    const localStorageCache = localStorage.getItem('ibyet-cache') || localStorage.getItem('ebyet-cache') || localStorage.getItem('qendiel-cache'); // Legacy support
    
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
