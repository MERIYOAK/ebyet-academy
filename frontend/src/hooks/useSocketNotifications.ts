/**
 * Hook to integrate Socket.IO with real-time updates
 * Only handles cache invalidation and UI updates - no toast notifications
 */

import { useEffect, useRef } from 'react';
import { queryClient, queryKeys } from '../lib/queryClient';

interface ContentUpdateData {
  id?: string;
  course?: { id?: string; _id?: string };
  courseId?: string;
  video?: { courseId?: string; _id?: string };
}

interface ContentUpdatePayload {
  type: string;
  data: ContentUpdateData;
  message?: string;
}

interface SocketServiceInstance {
  addEventListener: (event: string, handler: (payload: ContentUpdatePayload) => void) => void;
  removeEventListener: (event: string, handler: (payload: ContentUpdatePayload) => void) => void;
  connect: (userData?: { userId: string; role: string }) => Promise<void>;
  disconnect: () => void;
}

export const useSocketNotifications = () => {
  const isConnectingRef = useRef(false);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    // Load current user info if available
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    // NOTE: we intentionally do NOT short-circuit on isConnecting/isConnectedRef here.
    // In React StrictMode the cleanup is async (await import) so the refs aren't
    // reset by the time the second mount runs. socketService.connect() already
    // dedupes connection attempts internally, and listeners MUST be re-registered
    // on every mount (the cleanup removes them).

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
      const { type, data } = payload;
      invalidateCacheForContentType(type, data);
      // Dispatch window event so pages using raw fetch can also react
      window.dispatchEvent(new CustomEvent('socketContentUpdate', { detail: { type, data } }));
    };

    // Invalidate cache based on content type
    const getCourseIdFromData = (data: ContentUpdateData): string | undefined => {
      return (
        data.courseId ||
        data.id ||
        data.course?.id ||
        (data.course as any)?._id
      );
    };

    const invalidateCacheForContentType = (type: string, data: ContentUpdateData) => {
      try {
        // NOTE: do NOT call CacheManager.clearCacheByPattern here. It uses
        // queryClient.removeQueries under the hood, which destroys the active
        // query and prevents the refetch from propagating new data to mounted
        // components. invalidateQueries is what we want — it marks queries
        // stale and triggers refetches for active observers.
        switch (type) {
          case 'NEW_COURSE':
          case 'COURSE_UPDATED': {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.featured() });
            const courseId = getCourseIdFromData(data);
            if (courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
            } else {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.details() });
            }
            break;
          }

          case 'NEW_VIDEO':
          case 'VIDEO_UPDATED': {
            const videoCourseId = data.video?.courseId || data.courseId;
            if (videoCourseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.videos.course(videoCourseId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(videoCourseId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
            }
            break;
          }

          case 'NEW_BUNDLE':
          case 'BUNDLE_UPDATED':
          case 'BUNDLE_DELETED':
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            break;

          case 'NEW_ANNOUNCEMENT':
          case 'ANNOUNCEMENT_UPDATED':
          case 'ANNOUNCEMENT_DELETED':
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            break;

          case 'NEW_REVIEW':
          case 'REVIEW_APPROVED':
          case 'REVIEW_REJECTED':
          case 'REVIEW_REPLY_ADDED':
          case 'REVIEW_DELETED':
            if (data.courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
            }
            break;

          case 'NEW_MATERIAL':
          case 'MATERIAL_UPDATED':
          case 'MATERIAL_DELETED':
          case 'COURSE_MATERIALS_UPDATED':
            if (data.courseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(data.courseId) });
            }
            break;

          case 'VIDEO_DELETED': {
            const deletedVideoCourseId = data.video?.courseId || data.courseId;
            if (deletedVideoCourseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.videos.course(deletedVideoCourseId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(deletedVideoCourseId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
            }
            break;
          }

          case 'COURSE_DELETED':
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.courses.featured() });
            break;

          case 'WHATSAPP_GROUP_UPDATED': {
            const whatsappCourseId = getCourseIdFromData(data);
            if (whatsappCourseId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(whatsappCourseId) });
            }
            break;
          }

          case 'USER_UPDATED':
            // No React Query cache to invalidate for the admin user list
            // (AdminUsersPage uses raw fetch). The window event dispatch below
            // is what drives the live refresh.
            break;

          default:
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
    const registerEventListeners = (socketService: SocketServiceInstance) => {
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

    // Cleanup function — remove event listeners but keep the socket connected.
    // The socket is a singleton that must survive React StrictMode's double-invoke.
    // Disconnecting here races with the immediate re-mount and breaks the connection.
    return () => {
      const cleanup = async () => {
        try {
          const { default: socketService } = await import('../services/socketService');

          // Remove all event listeners registered by this hook instance
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

          // Reset refs so the next mount re-registers listeners
          isConnectedRef.current = false;
          isConnectingRef.current = false;
        } catch (error) {
          console.error('🔌 Failed to cleanup socket listeners:', error);
        }
      };

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
