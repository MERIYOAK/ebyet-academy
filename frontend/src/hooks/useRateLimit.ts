import { useState, useCallback } from 'react';

interface RateLimitInfo {
  isVisible: boolean;
  resetTime?: string;
  retryAfter?: number;
}

export const useRateLimit = () => {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    isVisible: false
  });

  const checkForRateLimit = useCallback((error: any) => {
    if (error?.status === 429 || error?.response?.status === 429) {
      const data = error?.response?.data || error?.data || {};
      
      setRateLimit({
        isVisible: true,
        resetTime: data.resetTime,
        retryAfter: data.retryAfter || 900 // Default 15 minutes
      });
    }
  }, []);

  const dismissRateLimit = useCallback(() => {
    setRateLimit({ isVisible: false });
  }, []);

  const showRateLimit = useCallback((resetTime?: string, retryAfter?: number) => {
    setRateLimit({
      isVisible: true,
      resetTime,
      retryAfter
    });
  }, []);

  return {
    rateLimit,
    checkForRateLimit,
    dismissRateLimit,
    showRateLimit
  };
};
