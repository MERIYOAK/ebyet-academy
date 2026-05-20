import { useRateLimit } from '../hooks/useRateLimit';

interface ApiError {
  status?: number;
  response?: { status?: number; data?: Record<string, unknown> };
  data?: Record<string, unknown>;
}

// Global API error handler for rate limiting
export const useApiErrorHandler = () => {
  const { checkForRateLimit } = useRateLimit();

  const handleApiError = (error: ApiError) => {
    // Check for rate limit errors
    checkForRateLimit(error);
    
    // Log other errors for debugging
    if (error?.status !== 429) {
      console.error('API Error:', error);
    }
  };

  return { handleApiError };
};
