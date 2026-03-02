import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { buildApiUrl } from '../config/environment';
import { queryKeys, cachePersister } from '../lib/queryClient';

export interface Certificate {
  _id: string;
  certificateId: string;
  studentId: string;
  courseId: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  dateIssued: string;
  completionDate: string;
  pdfUrl?: string;
  pdfS3Key?: string;
  isVerified: boolean;
  verificationHash: string;
  platformName: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  course?: {
    _id: string;
    title: string;
    description: string;
    thumbnailURL?: string;
  };
}

export interface CertificatesResponse {
  certificates: Certificate[];
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
}

// Hook for fetching user certificates with enhanced caching
export const useCertificates = (): UseQueryResult<CertificatesResponse> => {
  return useQuery({
    queryKey: queryKeys.certificates.list(),
    queryFn: async (): Promise<CertificatesResponse> => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(buildApiUrl('/api/certificates/user'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load certificates');
      }

      const data = await response.json();
      
      // Handle different response formats
      let result: CertificatesResponse;
      if (data.success && data.data) {
        if (Array.isArray(data.data)) {
          result = { certificates: data.data };
        } else if (data.data.certificates) {
          result = {
            certificates: data.data.certificates,
            pagination: data.data.pagination
          };
        } else {
          result = { certificates: [] };
        }
      } else if (Array.isArray(data)) {
        result = { certificates: data };
      } else {
        result = { certificates: [] };
      }

      return result;
    },
    // Enhanced caching for certificates
    staleTime: 30 * 60 * 1000, // 30 minutes - certificates don't change often
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in memory longer
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

// Hook for fetching a single certificate by ID
export const useCertificate = (certificateId: string): UseQueryResult<Certificate> => {
  return useQuery({
    queryKey: queryKeys.certificates.detail(certificateId),
    queryFn: async (): Promise<Certificate> => {
      const response = await fetch(buildApiUrl(`/api/certificates/${certificateId}`));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Certificate not found');
      }

      const data = await response.json();
      
      // Handle different response formats
      let certificate: Certificate;
      if (data.success && data.data && data.data.certificate) {
        certificate = data.data.certificate;
      } else if (data._id) {
        certificate = data;
      } else {
        throw new Error('Invalid certificate data format');
      }

      return certificate;
    },
    enabled: !!certificateId,
    // Enhanced caching for individual certificates
    staleTime: 60 * 60 * 1000, // 1 hour - certificates never change once issued
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory much longer
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

// Hook for verifying a certificate
export const useVerifyCertificate = (certificateId: string): UseQueryResult<{ isValid: boolean; certificate?: Certificate }> => {
  return useQuery({
    queryKey: [...queryKeys.certificates.detail(certificateId), 'verify'],
    queryFn: async (): Promise<{ isValid: boolean; certificate?: Certificate }> => {
      const response = await fetch(buildApiUrl(`/api/certificates/verify/${certificateId}`));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to verify certificate');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Certificate verification failed');
      }

      return {
        isValid: data.data.isValid,
        certificate: data.data.certificate
      };
    },
    enabled: !!certificateId,
    // Enhanced caching for certificate verification
    staleTime: 60 * 60 * 1000, // 1 hour - verification results don't change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory much longer
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
