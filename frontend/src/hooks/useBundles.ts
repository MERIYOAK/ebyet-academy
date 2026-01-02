import { useQuery, UseQueryResult, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../config/environment';
import { queryKeys, cachePersister } from '../lib/queryClient';

export interface ApiBundle {
  _id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
  longDescription?: string | { en: string; tg: string };
  price: number;
  originalValue?: number;
  courseIds: Array<{
    _id: string;
    title: string;
    description: string;
    thumbnailURL?: string;
    price: number;
    category?: string;
    level?: string;
    tags?: string[];
    totalEnrollments?: number;
    videos?: Array<{ _id: string; duration?: string }>;
  }>;
  thumbnailURL?: string;
  category?: string;
  featured?: boolean;
  tags?: string[];
  totalEnrollments?: number;
  maxEnrollments?: number;
  hasReachedMaxEnrollments?: boolean;
  slug?: string;
  isPurchased?: boolean;
}

export interface BundlesResponse {
  bundles: ApiBundle[];
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}

export interface BundleFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  featured?: boolean;
}

// Hook for fetching all bundles with filters
export const useBundles = (filters: BundleFilters = {}): UseQueryResult<BundlesResponse> => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['bundles', 'list', filters],
    queryFn: async (): Promise<BundlesResponse> => {
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
      if (filters.featured) queryParams.append('featured', 'true');

      const url = buildApiUrl(`/api/bundles?${queryParams.toString()}`);
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load bundles');
      }

      const data = await response.json();
      
      // Handle different response formats
      let result: BundlesResponse;
      if (data.success && data.data && data.data.bundles) {
        result = {
          bundles: data.data.bundles,
          pagination: data.data.pagination
        };
      } else if (Array.isArray(data)) {
        result = { bundles: data };
      } else {
        result = { bundles: [] };
      }

      // Cache individual bundles for faster access
      result.bundles.forEach(bundle => {
        queryClient.setQueryData(['bundles', 'detail', bundle._id], bundle);
      });

      return result;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for fetching featured bundles
export const useFeaturedBundles = (): UseQueryResult<ApiBundle[]> => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['bundles', 'featured'],
    queryFn: async (): Promise<ApiBundle[]> => {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl('/api/bundles/featured'), { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load featured bundles');
      }

      const data = await response.json();
      
      let bundlesData: ApiBundle[] = [];
      
      if (data.success && data.data && Array.isArray(data.data.bundles)) {
        bundlesData = data.data.bundles;
      } else if (Array.isArray(data)) {
        bundlesData = data;
      }
      
      // Cache individual featured bundles for faster access
      bundlesData.forEach(bundle => {
        queryClient.setQueryData(['bundles', 'detail', bundle._id], bundle);
      });
      
      return bundlesData;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 45 * 60 * 1000, // 45 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for fetching a single bundle by ID
export const useBundle = (bundleId: string): UseQueryResult<ApiBundle & { userHasPurchased?: boolean }> => {
  return useQuery({
    queryKey: ['bundles', 'detail', bundleId],
    queryFn: async (): Promise<ApiBundle & { userHasPurchased?: boolean }> => {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(buildApiUrl(`/api/bundles/${bundleId}`), { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Bundle not found');
      }

      const data = await response.json();
      
      // Handle different response formats
      let bundle: ApiBundle & { userHasPurchased?: boolean; isPurchased?: boolean };
      if (data.success && data.data && data.data.bundle) {
        bundle = {
          ...data.data.bundle,
          userHasPurchased: data.data.userHasPurchased || data.data.bundle.isPurchased || false,
          isPurchased: data.data.isPurchased || data.data.bundle.isPurchased || false
        };
      } else if (data._id) {
        bundle = {
          ...data,
          userHasPurchased: data.userHasPurchased || data.isPurchased || false,
          isPurchased: data.isPurchased || false
        };
      } else {
        throw new Error('Invalid bundle data format');
      }

      return bundle;
    },
    enabled: !!bundleId,
    staleTime: 20 * 60 * 1000, // 20 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook for fetching user's purchased bundles
export const useMyBundles = (filters: BundleFilters = {}): UseQueryResult<BundlesResponse> => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['bundles', 'my-bundles', filters],
    queryFn: async (): Promise<BundlesResponse> => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`
      };

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const url = buildApiUrl(`/api/bundles/my-bundles?${queryParams.toString()}`);
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load purchased bundles');
      }

      const data = await response.json();
      
      // Handle different response formats
      let result: BundlesResponse;
      if (data.success && data.data && data.data.bundles) {
        result = {
          bundles: data.data.bundles,
          pagination: data.data.pagination
        };
      } else if (Array.isArray(data)) {
        result = { bundles: data };
      } else {
        result = { bundles: [] };
      }

      // Cache individual bundles for faster access
      result.bundles.forEach(bundle => {
        queryClient.setQueryData(['bundles', 'detail', bundle._id], bundle);
      });

      return result;
    },
    enabled: !!localStorage.getItem('token'), // Only fetch if user is authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      if (failureCount < 3) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
