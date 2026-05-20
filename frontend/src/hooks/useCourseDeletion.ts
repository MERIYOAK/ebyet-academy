import { useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/environment';

interface UseCourseDeletionReturn {
  deleteCourse: (courseId: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const useCourseDeletion = (): UseCourseDeletionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCourse = async (courseId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin authentication required');
      }

      const response = await axios.delete(
        buildApiUrl(`/api/courses/${courseId}`),
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to delete course');
      }
    } catch (err) {
      const apiErr = err as { response?: { status?: number; data?: { message?: string } }; request?: unknown; message?: string };
      let errorMessage = 'Failed to delete course';

      if (apiErr.response) {
        // Server responded with error status
        if (apiErr.response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (apiErr.response.status === 403) {
          errorMessage = 'Access denied. Admin privileges required.';
        } else if (apiErr.response.status === 404) {
          errorMessage = 'Course not found.';
        } else if (apiErr.response.data?.message) {
          errorMessage = apiErr.response.data.message;
        }
      } else if (apiErr.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection.';
      } else if (apiErr.message) {
        // Other error
        errorMessage = apiErr.message;
      }

      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deleteCourse,
    isLoading,
    error
  };
};

export default useCourseDeletion; 