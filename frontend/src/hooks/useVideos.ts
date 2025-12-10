import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { buildApiUrl } from '../config/environment';
import { queryKeys } from '../lib/queryClient';
import { DRMVideoService } from '../services/drmVideoService';

export interface Video {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  url?: string;
  thumbnailUrl?: string;
  isFreePreview?: boolean;
  userHasAccess?: boolean;
}

export interface CourseVideosResponse {
  videos: Video[];
  userHasPurchased: boolean;
  courseId: string;
  version: number;
}

// Hook for fetching course videos with DRM protection
export const useCourseVideos = (
  courseId: string, 
  version: number = 1
): UseQueryResult<CourseVideosResponse> => {
  return useQuery({
    queryKey: queryKeys.videos.course(courseId, version),
    queryFn: async (): Promise<CourseVideosResponse> => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use the existing DRM service
      const drmVideoService = DRMVideoService.getInstance();
      const result = await drmVideoService.getCourseVideosWithDRM(courseId, version);
      
      return {
        videos: result.videos,
        userHasPurchased: result.userHasPurchased,
        courseId,
        version
      };
    },
    enabled: !!courseId,
    // Cache video data for 10 minutes
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // Retry failed requests more aggressively for video data
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

// Hook for fetching course videos without DRM (for public preview)
export const useCourseVideosPublic = (
  courseId: string, 
  version: number = 1
): UseQueryResult<CourseVideosResponse> => {
  return useQuery({
    queryKey: [...queryKeys.videos.course(courseId, version), 'public'],
    queryFn: async (): Promise<CourseVideosResponse> => {
      const response = await fetch(buildApiUrl(`/api/videos/course/${courseId}/version/${version}`));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load course videos');
      }

      const data = await response.json();
      
      return {
        videos: data.data?.videos || [],
        userHasPurchased: data.data?.userHasPurchased || false,
        courseId,
        version
      };
    },
    enabled: !!courseId,
    // Cache public video data for 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
