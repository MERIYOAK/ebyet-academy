import { useQuery, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../config/environment';
import { queryKeys, cachePersister } from '../lib/queryClient';

export interface ApiCourse {
  _id: string;
  title: string;
  description: string;
  thumbnailURL?: string;
  price: number;
  category?: string;
  level?: string;
  totalEnrollments?: number;
  tags?: string[];
  videos?: Array<{ _id: string; duration?: string }>;
  isPurchased?: boolean;
  // Progress fields for enrolled students
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  lastWatched?: string | null;
  isCompleted?: boolean;
}

export interface CoursesResponse {
  courses: ApiCourse[];
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface CourseFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  level?: string;
  tag?: string;
  priceRange?: string;
}

// Hook for fetching all courses with filters
export const useCourses = (filters: CourseFilters = {}): UseQueryResult<CoursesResponse> => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: queryKeys.courses.list(filters),
    queryFn: async (): Promise<CoursesResponse> => {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.level) queryParams.append('level', filters.level);
      if (filters.tag) queryParams.append('tag', filters.tag);
      if (filters.priceRange) queryParams.append('priceRange', filters.priceRange);

      const url = buildApiUrl(`/api/courses?${queryParams.toString()}`);
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load courses');
      }

      const data = await response.json();
      
      // Handle different response formats
      let result: CoursesResponse;
      if (Array.isArray(data)) {
        result = { courses: data };
      } else if (data.data && Array.isArray(data.data.courses)) {
        result = {
          courses: data.data.courses,
          pagination: data.data.pagination
        };
      } else if (data.success && data.data && Array.isArray(data.data.courses)) {
        result = {
          courses: data.data.courses,
          pagination: data.data.pagination
        };
      } else {
        result = { courses: [] };
      }

      // Cache individual courses for faster access
      result.courses.forEach(course => {
        queryClient.setQueryData(queryKeys.courses.detail(course._id), course);
      });

      return result;
    },
    // Enhanced caching for courses
    staleTime: 10 * 60 * 1000, // 10 minutes - courses don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory longer
    // Background refetch to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Retry with exponential backoff
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for fetching featured courses (max 3 from API)
export const useFeaturedCourses = (): UseQueryResult<ApiCourse[]> => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: queryKeys.courses.featured(),
    queryFn: async (): Promise<ApiCourse[]> => {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl('/api/courses/featured'), { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load featured courses');
      }

      const data = await response.json();
      
      let coursesData: ApiCourse[] = [];
      
      if (Array.isArray(data)) {
        coursesData = data;
      } else if (data.data && Array.isArray(data.data.courses)) {
        coursesData = data.data.courses;
      } else if (data.success && data.data && Array.isArray(data.data.courses)) {
        coursesData = data.data.courses;
      }
      
      // API already returns max 3, but ensure we don't exceed 3
      const featuredCourses = coursesData.slice(0, 3);
      
      // Cache individual featured courses for faster access
      featuredCourses.forEach(course => {
        queryClient.setQueryData(queryKeys.courses.detail(course._id), course);
      });
      
      return featuredCourses;
    },
    // Enhanced caching for featured courses
    staleTime: 15 * 60 * 1000, // 15 minutes - featured courses change less frequently
    gcTime: 45 * 60 * 1000, // 45 minutes - keep in memory longer
    // Background refetch to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Retry with exponential backoff
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for fetching a single course by ID
export const useCourse = (courseId: string): UseQueryResult<ApiCourse> => {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: async (): Promise<ApiCourse> => {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Course not found');
      }

      const data = await response.json();
      
      // Handle different response formats
      let course: ApiCourse;
      if (data.success && data.data && data.data.course) {
        course = data.data.course;
      } else if (data._id) {
        course = data;
      } else {
        throw new Error('Invalid course data format');
      }

      return course;
    },
    enabled: !!courseId,
    // Enhanced caching for individual courses
    staleTime: 20 * 60 * 1000, // 20 minutes - individual courses change rarely
    gcTime: 60 * 60 * 1000, // 1 hour - keep in memory much longer
    // Background refetch to keep data fresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Retry with exponential backoff
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
