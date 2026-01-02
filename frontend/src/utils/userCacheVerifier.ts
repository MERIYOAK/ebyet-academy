// User data cache verification and management utility
import { queryClient } from '../lib/queryClient';
import { cachePersister } from '../lib/queryClient';
import { queryKeys } from '../lib/queryClient';

export class UserCacheVerifier {
  // Verify all user data is cached
  static verifyUserDataCache(): {
    isAuthenticated: boolean;
    cachedData: {
      profile: boolean;
      dashboard: boolean;
      certificates: boolean;
      progress: boolean;
    };
    localStorageData: {
      userProfile: boolean;
      userDashboard: boolean;
      certificates: boolean;
    };
    recommendations: string[];
  } {
    try {
      const token = localStorage.getItem('token');
      const isAuthenticated = !!token;

      // Check React Query cache
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      const cachedData = {
        profile: queries.some(q => JSON.stringify(q.queryKey).includes('user') && JSON.stringify(q.queryKey).includes('profile')),
        dashboard: queries.some(q => JSON.stringify(q.queryKey).includes('user') && JSON.stringify(q.queryKey).includes('dashboard')),
        certificates: queries.some(q => JSON.stringify(q.queryKey).includes('certificates')),
        progress: queries.some(q => JSON.stringify(q.queryKey).includes('progress')),
      };

      // Check localStorage cache
      const localStorageData = {
        userProfile: !!(localStorage.getItem('ibyet-cache-user-profile') || localStorage.getItem('ebyet-cache-user-profile')), // Legacy support
        userDashboard: !!(localStorage.getItem('ibyet-cache-user-dashboard') || localStorage.getItem('ebyet-cache-user-dashboard')), // Legacy support
        certificates: !!(localStorage.getItem('ibyet-cache-certificates') || localStorage.getItem('ebyet-cache-certificates')), // Legacy support
      };

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (!isAuthenticated) {
        recommendations.push('User is not authenticated - login to enable user data caching');
      } else {
        if (!cachedData.profile) {
          recommendations.push('Visit profile page to cache user profile data');
        }
        if (!cachedData.dashboard) {
          recommendations.push('Visit dashboard to cache user dashboard data');
        }
        if (!cachedData.certificates) {
          recommendations.push('Visit certificates page to cache certificate data');
        }
        if (!cachedData.progress) {
          recommendations.push('Watch videos to cache progress data');
        }
      }

      return {
        isAuthenticated,
        cachedData,
        localStorageData,
        recommendations
      };

    } catch (error) {
      console.error('Error verifying user data cache:', error);
      return {
        isAuthenticated: false,
        cachedData: { profile: false, dashboard: false, certificates: false, progress: false },
        localStorageData: { userProfile: false, userDashboard: false, certificates: false },
        recommendations: ['Error occurred while checking cache']
      };
    }
  }

  // Force cache user data
  static async forceCacheUserData(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No authentication token found. Please login first.');
        return;
      }

      console.log('🔄 Force caching user data...');

      // Cache user profile
      try {
        await queryClient.fetchQuery({
          queryKey: queryKeys.user.profile(),
          queryFn: async () => {
            const response = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch user profile');
            return response.json();
          },
          staleTime: 30 * 60 * 1000,
        });
        console.log('✅ User profile cached');
      } catch (error) {
        console.warn('⚠️ Failed to cache user profile:', error);
      }

      // Cache user dashboard
      try {
        await queryClient.fetchQuery({
          queryKey: queryKeys.user.dashboard(),
          queryFn: async () => {
            const response = await fetch('/api/progress/dashboard', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard');
            return response.json();
          },
          staleTime: 5 * 60 * 1000,
        });
        console.log('✅ User dashboard cached');
      } catch (error) {
        console.warn('⚠️ Failed to cache user dashboard:', error);
      }

      // Cache certificates
      try {
        await queryClient.fetchQuery({
          queryKey: queryKeys.certificates.list(),
          queryFn: async () => {
            const response = await fetch('/api/certificates/user', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch certificates');
            return response.json();
          },
          staleTime: 30 * 60 * 1000,
        });
        console.log('✅ Certificates cached');
      } catch (error) {
        console.warn('⚠️ Failed to cache certificates:', error);
      }

      console.log('🎉 User data caching completed!');

    } catch (error) {
      console.error('❌ Failed to force cache user data:', error);
    }
  }

  // Get detailed cache information
  static getDetailedCacheInfo(): any {
    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const userQueries = queries.filter(q => 
        JSON.stringify(q.queryKey).includes('user') || 
        JSON.stringify(q.queryKey).includes('certificates') ||
        JSON.stringify(q.queryKey).includes('progress')
      );

      const localStorageKeys = Object.keys(localStorage).filter(key => 
        (key.startsWith('ibyet-cache') || key.startsWith('ebyet-cache')) && ( // Legacy support
          key.includes('user') || 
          key.includes('certificates') || 
          key.includes('progress')
        )
      );

      return {
        reactQuery: {
          totalUserQueries: userQueries.length,
          queries: userQueries.map(q => ({
            key: q.queryKey,
            status: q.state.status,
            hasData: !!q.state.data,
            dataSize: q.state.data ? JSON.stringify(q.state.data).length : 0,
            isStale: q.state.isStale,
            lastUpdated: q.state.dataUpdatedAt ? new Date(q.state.dataUpdatedAt).toLocaleString() : 'Never'
          }))
        },
        localStorage: {
          totalKeys: localStorageKeys.length,
          keys: localStorageKeys.map(key => {
            const value = localStorage.getItem(key);
            let parsedValue = null;
            try {
              parsedValue = value ? JSON.parse(value) : null;
            } catch (e) {
              parsedValue = { error: 'Failed to parse' };
            }
            
            return {
              key,
              size: value ? value.length : 0,
              hasData: !!parsedValue?.data,
              timestamp: parsedValue?.timestamp ? new Date(parsedValue.timestamp).toLocaleString() : 'N/A'
            };
          })
        }
      };

    } catch (error) {
      console.error('Error getting detailed cache info:', error);
      return { error: error.message };
    }
  }

  // Monitor cache changes in real-time
  static startCacheMonitoring(): () => void {
    console.log('🔍 Starting user data cache monitoring...');
    
    const interval = setInterval(() => {
      const verification = this.verifyUserDataCache();
      if (verification.isAuthenticated) {
        console.log('📊 User Cache Status:', {
          memory: verification.cachedData,
          persistent: verification.localStorageData,
          recommendations: verification.recommendations
        });
      }
    }, 10000); // Check every 10 seconds

    // Return cleanup function
    return () => {
      clearInterval(interval);
      console.log('🛑 Cache monitoring stopped');
    };
  }

  // Clear user-specific cache
  static clearUserCache(): void {
    try {
      // Clear React Query cache
      queryClient.removeQueries({ queryKey: queryKeys.user.all });
      queryClient.removeQueries({ queryKey: queryKeys.certificates.all });
      
      // Clear localStorage cache
      const userCacheKeys = Object.keys(localStorage).filter(key => 
        (key.startsWith('ibyet-cache') || key.startsWith('ebyet-cache')) && ( // Legacy support
          key.includes('user') || 
          key.includes('certificates') || 
          key.includes('progress')
        )
      );
      
      userCacheKeys.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ User cache cleared successfully');
      console.log(`Removed ${userCacheKeys.length} cache entries`);
      
    } catch (error) {
      console.error('❌ Failed to clear user cache:', error);
    }
  }
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).UserCacheVerifier = UserCacheVerifier;
}
