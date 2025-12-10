// Cache testing utility to force cache population
import { queryClient } from '../lib/queryClient';
import { useCourses, useFeaturedCourses, useUserProfile, useUserDashboard } from '../hooks/useCourses';
import { useCertificates } from '../hooks/useCertificates';

export class CacheTester {
  // Force populate cache with test data
  static async populateCache(): Promise<void> {
    try {
      console.log('🧪 Starting cache population test...');

      // Test courses cache
      console.log('📚 Testing courses cache...');
      try {
        const coursesQuery = queryClient.fetchQuery({
          queryKey: ['courses', 'list', {}],
          queryFn: async () => {
            const response = await fetch('/api/courses');
            if (!response.ok) throw new Error('Failed to fetch courses');
            return response.json();
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('✅ Courses cache populated');
      } catch (error) {
        console.warn('⚠️ Failed to populate courses cache:', error);
      }

      // Test featured courses cache
      console.log('⭐ Testing featured courses cache...');
      try {
        const featuredQuery = queryClient.fetchQuery({
          queryKey: ['courses', 'featured'],
          queryFn: async () => {
            const response = await fetch('/api/courses');
            if (!response.ok) throw new Error('Failed to fetch featured courses');
            const data = await response.json();
            return Array.isArray(data) ? data.slice(0, 3) : data.data?.courses?.slice(0, 3) || [];
          },
          staleTime: 15 * 60 * 1000,
        });
        console.log('✅ Featured courses cache populated');
      } catch (error) {
        console.warn('⚠️ Failed to populate featured courses cache:', error);
      }

      // Test user profile cache (if authenticated)
      const token = localStorage.getItem('token');
      if (token) {
        console.log('👤 Testing user profile cache...');
        try {
          const profileQuery = queryClient.fetchQuery({
            queryKey: ['user', 'profile'],
            queryFn: async () => {
              const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('Failed to fetch user profile');
              return response.json();
            },
            staleTime: 30 * 60 * 1000,
          });
          console.log('✅ User profile cache populated');
        } catch (error) {
          console.warn('⚠️ Failed to populate user profile cache:', error);
        }

        // Test dashboard cache
        console.log('📊 Testing dashboard cache...');
        try {
          const dashboardQuery = queryClient.fetchQuery({
            queryKey: ['user', 'dashboard'],
            queryFn: async () => {
              const response = await fetch('/api/progress/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('Failed to fetch dashboard');
              return response.json();
            },
            staleTime: 5 * 60 * 1000,
          });
          console.log('✅ Dashboard cache populated');
        } catch (error) {
          console.warn('⚠️ Failed to populate dashboard cache:', error);
        }

        // Test certificates cache
        console.log('🏆 Testing certificates cache...');
        try {
          const certificatesQuery = queryClient.fetchQuery({
            queryKey: ['certificates', 'list'],
            queryFn: async () => {
              const response = await fetch('/api/certificates', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('Failed to fetch certificates');
              return response.json();
            },
            staleTime: 30 * 60 * 1000,
          });
          console.log('✅ Certificates cache populated');
        } catch (error) {
          console.warn('⚠️ Failed to populate certificates cache:', error);
        }
      } else {
        console.log('ℹ️ No authentication token found, skipping user-specific cache tests');
      }

      console.log('🎉 Cache population test completed!');
      console.log('📊 Current cache state:');
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      console.log(`Total queries in cache: ${queries.length}`);
      queries.forEach((query, index) => {
        console.log(`${index + 1}. ${JSON.stringify(query.queryKey)} - Status: ${query.state.status}`);
      });

    } catch (error) {
      console.error('❌ Cache population test failed:', error);
    }
  }

  // Test cache persistence
  static testCachePersistence(): void {
    try {
      console.log('💾 Testing cache persistence...');
      
      // Check localStorage
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('qendiel-cache')
      );
      
      console.log(`Found ${cacheKeys.length} cache entries in localStorage:`);
      cacheKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            console.log(`- ${key}: ${parsed.data ? 'Has data' : 'Empty'} (${value.length} bytes)`);
          } catch (e) {
            console.log(`- ${key}: Invalid JSON (${value.length} bytes)`);
          }
        }
      });

      // Check React Query cache
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      console.log(`React Query cache has ${queries.length} queries`);
      
    } catch (error) {
      console.error('❌ Cache persistence test failed:', error);
    }
  }

  // Clear all cache and test fresh start
  static async testFreshStart(): Promise<void> {
    try {
      console.log('🔄 Testing fresh cache start...');
      
      // Clear all cache
      queryClient.clear();
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('qendiel-cache')
      );
      cacheKeys.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ All cache cleared');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test cache population
      await this.populateCache();
      
    } catch (error) {
      console.error('❌ Fresh start test failed:', error);
    }
  }
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).CacheTester = CacheTester;
}
