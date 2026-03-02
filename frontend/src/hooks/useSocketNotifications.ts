/**
 * Hook to integrate Socket.IO with Toast notifications
 * Listens for content updates and displays appropriate toasts
 */

import { useEffect, useRef } from 'react';
import { useToast } from '../components/ui/Toast';
import socketService, { ContentUpdatePayload } from '../services/socketService';
import { queryClient, queryKeys } from '../lib/queryClient';
import { CacheManager } from '../utils/cacheManager';

export const useSocketNotifications = () => {
  const { showContentUpdateToast } = useToast();
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Check if user is admin - if so, don't show notifications
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    
    if (user && user.role === 'admin') {
      console.log('👤 Admin user detected - skipping socket notifications');
      return;
    }

    // Prevent multiple connection attempts
    if (isConnectingRef.current || isConnectedRef.current) {
      console.log('🔌 Socket.IO already connecting or connected - skipping initialization');
      return;
    }

    // Initialize socket connection only for non-admin users
    const initializeSocket = async () => {
      try {
        isConnectingRef.current = true;
        
        // Add production debugging
        console.log('🔍 Environment Info:', {
          isProduction: import.meta.env.PROD,
          mode: import.meta.env.MODE,
          nodeEnv: import.meta.env.NODE_ENV,
          apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
          currentOrigin: window.location.origin,
          hostname: window.location.hostname
        });
        
        await socketService.connect(user ? {
          userId: user.id,
          role: user.role || 'user'
        } : undefined);
        
        isConnectedRef.current = true;
        isConnectingRef.current = false;
        console.log('🔌 Socket.IO initialized successfully in hook');
      } catch (error) {
        isConnectingRef.current = false;
        console.error('🔌 Failed to initialize Socket.IO in hook:', error);
      }
    };
    
    initializeSocket();

    // Listen for content updates
    const handleContentUpdate = (payload: ContentUpdatePayload) => {
      console.log('📢 Received content update:', payload);
      const { type, data } = payload;
      const safeData = data || {};
      
      // Ensure message is always a string, handle localized content
      let message = 'New content is available!';
      if (safeData.message) {
        if (typeof safeData.message === 'string') {
          message = safeData.message;
        } else if (typeof safeData.message === 'object' && safeData.message.en) {
          message = safeData.message.en; // Use English version for localized content
        } else if (safeData.title && typeof safeData.title === 'object' && safeData.title.en) {
          message = `New announcement: ${safeData.title.en}`; // Handle announcement titles
        }
      }
      
      console.log('🔍 Processing content update:', {
        type,
        hasData: !!data,
        message,
        dataKeys: Object.keys(data || {})
      });
      
      // Invalidate relevant cache based on content type
      invalidateCacheForContentType(type, safeData);
      
      // Show appropriate toast notification
      showContentUpdateToast(type, safeData, message);
    };

    // Invalidate cache based on content type
    const invalidateCacheForContentType = (type: string, data: any) => {
      try {
        console.log('🗑️ Invalidating cache for content type:', type);
        
        switch (type) {
          case 'NEW_COURSE':
          case 'COURSE_UPDATED':
            // Invalidate all course-related queries
            console.log('🗑️ Invalidating course cache for:', type);
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.featured() });
            // Also invalidate specific course detail if we have the ID
            // Handle both direct data and nested course data
            const courseId = data.id || data.course?.id;
            if (courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
            }
            // Also clear any persistent course cache
            CacheManager.clearCacheByPattern('course');
            break;
            
          case 'NEW_VIDEO':
          case 'VIDEO_UPDATED':
            // Invalidate course videos if we have courseId
            if (data.courseId) {
              console.log('🗑️ Invalidating video cache for course:', data.courseId);
              queryClient.invalidateQueries({ queryKey: queryKeys.videos.course(data.courseId) });
              // Also invalidate the course itself since video count changed
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
              // Clear video-related persistent cache
              CacheManager.clearCacheByPattern('video');
            }
            break;
            
          case 'NEW_BUNDLE':
          case 'BUNDLE_UPDATED':
            // Invalidate bundle-related queries
            console.log('🗑️ Invalidating bundle cache for:', type);
            CacheManager.clearCacheByPattern('bundle');
            // Also invalidate general content cache
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            break;
            
          case 'NEW_ANNOUNCEMENT':
          case 'ANNOUNCEMENT_UPDATED':
            // Invalidate announcement-related queries
            console.log('🗑️ Invalidating announcement cache for:', type);
            CacheManager.clearCacheByPattern('announcement');
            // Also invalidate general content cache
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            break;
            
          case 'COURSE_MATERIALS_UPDATED':
            // Invalidate course materials
            console.log('🗑️ Invalidating materials cache for course:', data.courseId);
            if (data.courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
              CacheManager.clearCacheByPattern('material');
            }
            break;
            
          case 'WHATSAPP_GROUP_UPDATED':
            // Invalidate course details for WhatsApp group changes
            console.log('🗑️ Invalidating WhatsApp group cache for course:', data.courseId);
            if (data.courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
              CacheManager.clearCacheByPattern('whatsapp');
            }
            break;
            
          case 'REVIEW_APPROVED':
          case 'REVIEW_REJECTED':
          case 'REVIEW_REPLY_ADDED':
            // Invalidate review-related cache
            console.log('🗑️ Invalidating review cache for:', type);
            if (data.courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
            }
            CacheManager.clearCacheByPattern('review');
            break;
            
          default:
            // For unknown types, clear all content cache to be safe
            console.log('🗑️ Clearing all content cache for unknown type:', type);
            CacheManager.clearCacheByPattern('content');
            // Also invalidate general queries to be safe
            queryClient.invalidateQueries();
        }
        
        // Also save updated cache to persistent storage
        import('../lib/queryClient').then(({ saveCacheData }) => {
          saveCacheData();
        });
        
      } catch (error) {
        console.warn('⚠️ Failed to invalidate cache for', type, error);
      }
    };

    // Register event listeners for different content types
    socketService.addEventListener('NEW_COURSE', handleContentUpdate);
    socketService.addEventListener('COURSE_UPDATED', handleContentUpdate);
    socketService.addEventListener('NEW_VIDEO', handleContentUpdate);
    socketService.addEventListener('VIDEO_UPDATED', handleContentUpdate);
    socketService.addEventListener('NEW_BUNDLE', handleContentUpdate);
    socketService.addEventListener('BUNDLE_UPDATED', handleContentUpdate);
    socketService.addEventListener('NEW_ANNOUNCEMENT', handleContentUpdate);
    socketService.addEventListener('ANNOUNCEMENT_UPDATED', handleContentUpdate);
    
    // Review-related events
    socketService.addEventListener('REVIEW_APPROVED', handleContentUpdate);
    socketService.addEventListener('REVIEW_REJECTED', handleContentUpdate);
    socketService.addEventListener('REVIEW_REPLY_ADDED', handleContentUpdate);
    
    // Course materials and WhatsApp group events
    socketService.addEventListener('COURSE_MATERIALS_UPDATED', handleContentUpdate);
    socketService.addEventListener('WHATSAPP_GROUP_UPDATED', handleContentUpdate);

    // Also listen to general content updates
    socketService.addEventListener('contentUpdate', handleContentUpdate);

    // Cleanup function
    return () => {
      socketService.removeEventListener('NEW_COURSE', handleContentUpdate);
      socketService.removeEventListener('COURSE_UPDATED', handleContentUpdate);
      socketService.removeEventListener('NEW_VIDEO', handleContentUpdate);
      socketService.removeEventListener('VIDEO_UPDATED', handleContentUpdate);
      socketService.removeEventListener('NEW_BUNDLE', handleContentUpdate);
      socketService.removeEventListener('BUNDLE_UPDATED', handleContentUpdate);
      socketService.removeEventListener('NEW_ANNOUNCEMENT', handleContentUpdate);
      socketService.removeEventListener('ANNOUNCEMENT_UPDATED', handleContentUpdate);
      
      // Review-related cleanup
      socketService.removeEventListener('REVIEW_APPROVED', handleContentUpdate);
      socketService.removeEventListener('REVIEW_REJECTED', handleContentUpdate);
      socketService.removeEventListener('REVIEW_REPLY_ADDED', handleContentUpdate);
      
      // Course materials and WhatsApp group cleanup
      socketService.removeEventListener('COURSE_MATERIALS_UPDATED', handleContentUpdate);
      socketService.removeEventListener('WHATSAPP_GROUP_UPDATED', handleContentUpdate);
      
      socketService.removeEventListener('contentUpdate', handleContentUpdate);
      
      // Reset connection state
      isConnectingRef.current = false;
      isConnectedRef.current = false;
      
      // Disconnect socket when component unmounts
      socketService.disconnect();
    };
  }, [showContentUpdateToast]);

  return {
    isConnected: socketService.isConnected(),
    connectionStats: socketService.getConnectionStats()
  };
};
