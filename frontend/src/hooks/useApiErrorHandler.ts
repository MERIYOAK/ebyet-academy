import { useRateLimit } from '../hooks/useRateLimit';

// Global API error handler for rate limiting
export const useApiErrorHandler = () => {
  const { checkForRateLimit } = useRateLimit();

  const handleApiError = (error: any) => {
    // Check for rate limit errors
    checkForRateLimit(error);
    
    // Log other errors for debugging
    if (error?.status !== 429) {
      console.error('API Error:', error);
    }
  };

  return { handleApiError };
};
