/**
 * Hook to integrate Socket.IO with real-time updates
 * Only handles cache invalidation and UI updates - no toast notifications
 */

import { useEffect, useRef } from 'react';
import { queryClient, queryKeys } from '../lib/queryClient';
import { CacheManager } from '../utils/cacheManager';

interface ContentUpdatePayload {
  type: string;
  data: any;
  message?: string;
}

export const useSocketNotifications = () => {
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Check if user is admin - if so, don't connect
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
        
        // Dynamic import to avoid SSR issues
        const { default: socketService } = await import('../services/socketService');
        
        await socketService.connect(user ? {
          userId: user.id,
          role: user.role || 'user'
        } : undefined);
        
        isConnectedRef.current = true;
        console.log('🔌 Socket.IO initialized successfully for real-time updates');
        
      } catch (error) {
        console.error('🔌 Failed to initialize Socket.IO:', error);
      } finally {
        isConnectingRef.current = false;
      }
    };

    initializeSocket();

    // Listen for content updates (no toast notifications)
    const handleContentUpdate = (payload: ContentUpdatePayload) => {
      console.log('📢 Received content update:', payload);
      const { type, data } = payload;
      
      // Invalidate relevant cache based on content type
      invalidateCacheForContentType(type, data);
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
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            // Clear bundle-related persistent cache
            CacheManager.clearCacheByPattern('bundle');
            break;
            
          case 'NEW_ANNOUNCEMENT':
          case 'ANNOUNCEMENT_UPDATED':
            // Invalidate announcement-related queries
            console.log('🗑️ Invalidating announcement cache for:', type);
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            // Clear announcement-related persistent cache
            CacheManager.clearCacheByPattern('announcement');
            break;
            
          case 'REVIEW_APPROVED':
          case 'REVIEW_REJECTED':
          case 'REVIEW_REPLY_ADDED':
            // Invalidate review-related cache
            if (data.courseId) {
              console.log('🗑️ Invalidating review cache for course:', data.courseId);
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
            }
            // Clear review-related persistent cache
            CacheManager.clearCacheByPattern('review');
            break;
            
          case 'COURSE_MATERIALS_UPDATED':
            // Invalidate course materials
            if (data.courseId) {
              console.log('🗑️ Invalidating materials cache for course:', data.courseId);
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
            }
            // Clear materials-related persistent cache
            CacheManager.clearCacheByPattern('material');
            break;
            
          case 'WHATSAPP_GROUP_UPDATED':
            // Invalidate WhatsApp group info
            if (data.courseId) {
              console.log('🗑️ Invalidating WhatsApp cache for course:', data.courseId);
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
            }
            // Clear WhatsApp-related persistent cache
            CacheManager.clearCacheByPattern('whatsapp');
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
    const registerEventListeners = (socketService: any) => {
      // Course-related events
      socketService.addEventListener('NEW_COURSE', handleContentUpdate);
      socketService.addEventListener('COURSE_UPDATED', handleContentUpdate);
      
      // Video-related events
      socketService.addEventListener('NEW_VIDEO', handleContentUpdate);
      socketService.addEventListener('VIDEO_UPDATED', handleContentUpdate);
      
      // Bundle-related events
      socketService.addEventListener('NEW_BUNDLE', handleContentUpdate);
      socketService.addEventListener('BUNDLE_UPDATED', handleContentUpdate);
      
      // Announcement-related events
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
    };

    // Dynamic import and setup
    const setupEventListeners = async () => {
      try {
        const { default: socketService } = await import('../services/socketService');
        registerEventListeners(socketService);
      } catch (error) {
        console.error('🔌 Failed to setup socket event listeners:', error);
      }
    };

    setupEventListeners();

    // Cleanup function
    return () => {
      const cleanup = async () => {
        try {
          const { default: socketService } = await import('../services/socketService');
          
          // Remove all event listeners
          socketService.removeEventListener('NEW_COURSE', handleContentUpdate);
          socketService.removeEventListener('COURSE_UPDATED', handleContentUpdate);
          socketService.removeEventListener('NEW_VIDEO', handleContentUpdate);
          socketService.removeEventListener('VIDEO_UPDATED', handleContentUpdate);
          socketService.removeEventListener('NEW_BUNDLE', handleContentUpdate);
          socketService.removeEventListener('BUNDLE_UPDATED', handleContentUpdate);
          socketService.removeEventListener('NEW_ANNOUNCEMENT', handleContentUpdate);
          socketService.removeEventListener('ANNOUNCEMENT_UPDATED', handleContentUpdate);
          socketService.removeEventListener('REVIEW_APPROVED', handleContentUpdate);
          socketService.removeEventListener('REVIEW_REJECTED', handleContentUpdate);
          socketService.removeEventListener('REVIEW_REPLY_ADDED', handleContentUpdate);
          socketService.removeEventListener('COURSE_MATERIALS_UPDATED', handleContentUpdate);
          socketService.removeEventListener('WHATSAPP_GROUP_UPDATED', handleContentUpdate);
          socketService.removeEventListener('contentUpdate', handleContentUpdate);
          
          // Disconnect socket
          socketService.disconnect();
          
          // Reset connection state
          isConnectedRef.current = false;
          isConnectingRef.current = false;
          
          console.log('🔌 Socket.IO disconnected and cleaned up');
        } catch (error) {
          console.error('🔌 Failed to cleanup socket:', error);
        }
      };

      // Execute cleanup
      cleanup();
    };
  }, []); // Empty dependency array - run once on mount

  return {
    isConnected: () => isConnectedRef.current,
    connectionStats: () => ({
      isConnecting: isConnectingRef.current,
      isConnected: isConnectedRef.current
    })
  };
};
