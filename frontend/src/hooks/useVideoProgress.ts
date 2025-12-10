import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { buildApiUrl } from '../config/environment';
import { queryKeys, cachePersister } from '../lib/queryClient';

export interface VideoProgress {
  watchedDuration: number;
  totalDuration: number;
  watchedPercentage: number;
  completionPercentage: number;
  isCompleted: boolean;
  lastPosition: number;
  lastWatchedAt: string | null;
}

export interface CourseProgress {
  course: {
    _id: string;
    title: string;
    totalVideos: number;
  };
  videos: Array<{
    _id: string;
    title: string;
    duration: string;
    order: number;
    videoUrl: string;
    progress: VideoProgress;
  }>;
  overallProgress: {
    totalVideos: number;
    completedVideos: number;
    totalProgress: number;
    lastWatchedVideo: string | null;
    lastWatchedPosition: number;
    courseProgressPercentage: number;
    totalWatchedDuration: number;
    courseTotalDuration: number;
  };
}

export interface ProgressUpdateData {
  courseId: string;
  videoId: string;
  watchedDuration: number;
  totalDuration: number;
  timestamp?: number;
}

// Hook for fetching course progress with enhanced caching
export const useCourseProgress = (courseId: string): UseQueryResult<CourseProgress> => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: queryKeys.user.progress(courseId),
    queryFn: async (): Promise<CourseProgress> => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl(`/api/progress/course/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load course progress');
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid progress data format');
      }

      return data.data;
    },
    enabled: !!courseId,
    // Enhanced caching for video progress
    staleTime: 2 * 60 * 1000, // 2 minutes - progress changes frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory for quick access
    // Background refetch to keep progress fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Retry with exponential backoff
    retry: (failureCount, error) => {
      if (failureCount < 2) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Cache progress data persistently
    onSuccess: (data) => {
      // Save to persistent cache for offline access
      cachePersister.set(`progress-${courseId}`, data);
    },
  });
};

// Hook for updating video progress with optimistic updates
export const useUpdateVideoProgress = (): UseMutationResult<any, Error, ProgressUpdateData> => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ProgressUpdateData): Promise<any> => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl('/api/progress/update'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update progress');
      }

      return response.json();
    },
    // Optimistic update for better UX
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.user.progress(data.courseId) });
      
      // Snapshot previous value
      const previousProgress = queryClient.getQueryData<CourseProgress>(queryKeys.user.progress(data.courseId));
      
      // Optimistically update progress
      if (previousProgress) {
        const updatedProgress = {
          ...previousProgress,
          videos: previousProgress.videos.map(video => {
            if (video._id === data.videoId) {
              const watchedPercentage = data.totalDuration > 0 
                ? Math.min(100, Math.round((data.watchedDuration / data.totalDuration) * 100))
                : 0;
              
              return {
                ...video,
                progress: {
                  ...video.progress,
                  watchedDuration: data.watchedDuration,
                  totalDuration: data.totalDuration,
                  watchedPercentage,
                  completionPercentage: watchedPercentage,
                  isCompleted: watchedPercentage >= 90,
                  lastPosition: data.watchedDuration,
                  lastWatchedAt: new Date().toISOString(),
                }
              };
            }
            return video;
          })
        };
        
        queryClient.setQueryData(queryKeys.user.progress(data.courseId), updatedProgress);
      }
      
      return { previousProgress };
    },
    // Rollback on error
    onError: (err, data, context) => {
      if (context?.previousProgress) {
        queryClient.setQueryData(queryKeys.user.progress(data.courseId), context.previousProgress);
      }
    },
    // Refetch after successful update
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.progress(variables.courseId) });
    },
  });
};

// Hook for getting user dashboard progress
export const useDashboardProgress = (): UseQueryResult<any> => {
  return useQuery({
    queryKey: queryKeys.user.dashboard(),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl('/api/progress/dashboard'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load dashboard progress');
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('Invalid dashboard data format');
      }

      return data.data;
    },
    // Enhanced caching for dashboard
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    // Background refetch to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Retry with exponential backoff
    retry: (failureCount, error) => {
      if (failureCount < 2) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};
