import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { buildApiUrl } from '../config/environment';
import { queryKeys, cachePersister } from '../lib/queryClient';

export interface User {
  _id: string;
  name: string;
  email: string;
  age?: number;
  sex?: string;
  address?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  profilePhotoKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  user: User;
  photoUrl?: string;
}

export interface DashboardCourse {
  _id: string;
  title: string;
  description: string;
  thumbnailURL?: string;
  progress: number;
  isCompleted: boolean;
  lastWatchedAt?: string;
  totalVideos: number;
  watchedVideos: number;
}

export interface DashboardData {
  user: User;
  courses: DashboardCourse[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    notStartedCourses: number;
    averageProgress: number;
  };
}

// Hook for fetching user profile
export const useUserProfile = (): UseQueryResult<UserProfile> => {
  return useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async (): Promise<UserProfile> => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // Fetch user data
      const userResponse = await fetch(buildApiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user profile');
      }

      const userResult = await userResponse.json();
      const user = userResult?.data?.user || userResult?.data || userResult;

      // Fetch profile photo if available
      let photoUrl: string | undefined;
      if (user.profilePhotoKey) {
        try {
          const photoResponse = await fetch(buildApiUrl('/api/users/me/photo'), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (photoResponse.ok) {
            const photoResult = await photoResponse.json();
            photoUrl = photoResult.data.photoUrl;
          }
        } catch (photoError) {
          console.log('Profile photo not available');
        }
      }

      return {
        user,
        photoUrl
      };
    },
    // Enhanced caching for user profile
    staleTime: 30 * 60 * 1000, // 30 minutes - user profile doesn't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in memory longer
    // Background refetch to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Don't retry on authentication errors
    retry: (failureCount, error) => {
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for fetching user dashboard data
export const useUserDashboard = (): UseQueryResult<DashboardData> => {
  return useQuery({
    queryKey: queryKeys.user.dashboard(),
    queryFn: async (): Promise<DashboardData> => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // Fetch user data
      const userResponse = await fetch(buildApiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user data');
      }

      const userResult = await userResponse.json();
      const user = userResult?.data?.user || userResult?.data || userResult;

      // Fetch dashboard progress data
      const progressResponse = await fetch(buildApiUrl('/api/progress/dashboard'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!progressResponse.ok) {
        const errorData = await progressResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch dashboard data');
      }

      const progressResult = await progressResponse.json();
      const courses = Array.isArray(progressResult?.data?.courses) ? progressResult.data.courses : [];

      // Calculate dashboard statistics
      const totalCourses = courses.length;
      const completedCourses = courses.filter(course => course.isCompleted || course.progress >= 90).length;
      const inProgressCourses = courses.filter(course => course.progress > 0 && !(course.isCompleted || course.progress >= 90)).length;
      const notStartedCourses = courses.filter(course => course.progress === 0).length;
      const averageProgress = totalCourses > 0 
        ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / totalCourses)
        : 0;

      return {
        user,
        courses,
        stats: {
          totalCourses,
          completedCourses,
          inProgressCourses,
          notStartedCourses,
          averageProgress
        }
      };
    },
    // Enhanced caching for dashboard data
    staleTime: 5 * 60 * 1000, // 5 minutes - dashboard data changes more frequently
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in memory for quick access
    // Background refetch to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Don't retry on authentication errors
    retry: (failureCount, error) => {
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
