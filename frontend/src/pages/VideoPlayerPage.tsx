import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle } from 'lucide-react';
import VideoPlaylist from '../components/VideoPlaylist';
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';
import WhatsAppGroupButton from '../components/WhatsAppGroupButton';
import { buildApiUrl } from '../config/environment';
import DRMVideoService from '../services/drmVideoService';

interface Video {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  completed?: boolean;
  locked?: boolean;
  hasAccess?: boolean;
  isFreePreview?: boolean;
  requiresPurchase?: boolean;
  progress?: {
    watchedDuration: number;
    totalDuration: number;
    watchedPercentage: number;
    completionPercentage: number;
    isCompleted: boolean;
    lastPosition?: number;
  };
  drm?: {
    enabled: boolean;
    sessionId?: string;
    watermarkData?: string;
    encryptedUrl?: string;
  };
}

interface CourseData {
  title: string;
  videos: Video[];
  overallProgress?: {
    totalVideos: number;
    completedVideos: number;
    totalProgress: number;
    lastWatchedVideo: string | null;
    lastWatchedPosition: number;
  };
  userHasPurchased?: boolean;
  hasWhatsappGroup?: boolean;
}

const VideoPlayerPage = () => {
  const { t } = useTranslation();
  const { id, videoId } = useParams<{ id: string; videoId: string }>();
  const navigate = useNavigate();
  const [currentVideoId, setCurrentVideoId] = useState(videoId || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // DRM and Security states
  const [forensicWatermark] = useState<any>(null);
  const [showPlaylist, setShowPlaylist] = useState(true); // Always show playlist by default
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [, setControlsVisible] = useState(true);

  const [videoLoading] = useState(false);
  const [loadingProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [, setCurrentVideoPercentage] = useState(0); // Track actual video percentage
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false); // Track URL refresh state
  const [isSwitchingVideo, setIsSwitchingVideo] = useState(false); // Track video switching state
  const [currentVideo, setCurrentVideo] = useState<Video | undefined>(undefined); // Track current video object
  const [isDecryptingUrl, setIsDecryptingUrl] = useState(false); // Track URL decryption state
  
  // Udemy-style progress tracking: Request deduplication and batching
  const pendingProgressRequest = useRef<AbortController | null>(null);
  const progressUpdateTimeout = useRef<number | null>(null);
  const lastProgressUpdate = useRef(0);
  const PROGRESS_UPDATE_INTERVAL = 30000; // 30 seconds minimum between updates
  
  // Note: videoRef is no longer needed as EnhancedVideoPlayer handles video element internally

  // Handle window resize for playlist visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint - desktop
        setShowPlaylist(true); // Always show on desktop
      } else {
        setShowPlaylist(false); // Hide on mobile by default
      }
    };

    // Set initial state based on current screen size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // DRM URL decryption function
  const decryptVideoUrl = async (encryptedUrl: string, sessionId: string): Promise<string> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔓 [Frontend] Decrypting URL with:', {
        encryptedUrl: encryptedUrl ? 'Present' : 'Missing',
        sessionId: sessionId ? 'Present' : 'Missing',
        token: token ? 'Present' : 'Missing'
      });

      const response = await fetch(buildApiUrl('/api/drm/decrypt-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          encryptedUrl,
          sessionId
        })
      });

      console.log('🔓 [Frontend] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [Frontend] Server error response:', errorData);
        throw new Error(errorData.message || 'Failed to decrypt video URL');
      }

      const result = await response.json();
      console.log('✅ [Frontend] Decryption successful');
      return result.data.decryptedUrl;
    } catch (error) {
      console.error('❌ Failed to decrypt video URL:', error);
      throw error;
    }
  };

  // Enhanced error handling functions
  const getVideoErrorDetails = (error: any): { type: string; message: string; userMessage: string } => {
    const video = error?.target as HTMLVideoElement;
    const errorCode = video?.error?.code;
    
    // If no video element is available, return a generic error
    if (!video) {
      return {
        type: 'UNKNOWN',
        message: error?.message || 'Unknown video error',
        userMessage: 'An error occurred while loading the video. Please try again.'
      };
    }
    
    console.log('🔍 [VideoPlayer] Error details:', {
      errorCode,
      networkState: video?.networkState,
      readyState: video?.readyState,
      src: video?.src,
      error: video?.error,
      originalError: error
    });

    // Check for 403 Forbidden errors in the video source URL
    const is403Error = video?.src && (
      video.src.includes('403') || 
      video.src.includes('Forbidden') ||
      video.networkState === 2 // NETWORK_NO_SOURCE
    );

    if (is403Error) {
      return {
        type: 'FORBIDDEN',
        message: 'Video access denied (403 Forbidden)',
        userMessage: 'Video access expired. Refreshing video link...'
      };
    }

    switch (errorCode) {
      case 1: // MEDIA_ERR_ABORTED
        return {
          type: 'ABORTED',
          message: 'Video loading was aborted',
          userMessage: 'Video loading was interrupted. Please try again.'
        };
      case 2: // MEDIA_ERR_NETWORK
        return {
          type: 'NETWORK',
          message: 'Network error occurred while loading video',
          userMessage: 'Network error. Please check your internet connection and try again.'
        };
      case 3: // MEDIA_ERR_DECODE
        return {
          type: 'DECODE',
          message: 'Video decoding error',
          userMessage: 'Video format not supported. Please try a different browser.'
        };
      case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
        return {
          type: 'SRC_NOT_SUPPORTED',
          message: 'Video source not supported',
          userMessage: 'This video format is not supported. Please contact support.'
        };
      default:
        return {
          type: 'UNKNOWN',
          message: 'Unknown video error occurred',
          userMessage: 'An unexpected error occurred. Please try refreshing the page.'
        };
    }
  };



  // Check if presigned URL is expired or will expire soon (within 5 minutes)
  const isPresignedUrlExpired = (url: string): boolean => {
    try {
      if (!url || url === 'undefined' || url === '') {
        return true; // Consider empty/invalid URLs as expired
      }
      
      const urlObj = new URL(url);
      
      // Check for AWS presigned URL parameters
      const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
      const dateParam = urlObj.searchParams.get('X-Amz-Date');
      
      if (expiresParam && dateParam) {
        // Parse the date parameter (format: YYYYMMDDTHHMMSSZ)
        const year = parseInt(dateParam.substring(0, 4));
        const month = parseInt(dateParam.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateParam.substring(6, 8));
        const hour = parseInt(dateParam.substring(9, 11));
        const minute = parseInt(dateParam.substring(11, 13));
        const second = parseInt(dateParam.substring(13, 15));
        
        const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
        const expiresInSeconds = parseInt(expiresParam);
        const expiryTime = signedDate.getTime() / 1000 + expiresInSeconds;
        
        const currentTime = Math.floor(Date.now() / 1000);
        const fiveMinutesFromNow = currentTime + (5 * 60); // 5 minutes buffer
        
        const isExpired = fiveMinutesFromNow > expiryTime;
        // Only log URL expiry check occasionally to reduce console spam
        if (Math.random() < 0.05) { // Only log 5% of the time
          console.log('🔍 [VideoPlayer] URL expiry check:', {
            signedDate: signedDate.toISOString(),
            expiresInSeconds,
            expiryTime: new Date(expiryTime * 1000).toISOString(),
            currentTime: new Date(currentTime * 1000).toISOString(),
            fiveMinutesFromNow: new Date(fiveMinutesFromNow * 1000).toISOString(),
            isExpired
          });
        }
        
        return isExpired;
      }
      
      // If we can't parse the expiry, assume it's not expired
      // Could not parse presigned URL expiry parameters
      return false;
    } catch (error) {
      // Could not parse presigned URL for expiry check
      return false;
    }
  };

  // Refresh presigned URL for a specific video
  const refreshVideoUrl = async (videoId: string): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ [VideoPlayer] No authentication token for URL refresh');
        return null;
      }

      // Refreshing presigned URL for video
      setIsRefreshingUrl(true);
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(buildApiUrl(`/api/videos/${videoId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json();
        
        // Check the correct data structure from the backend
        const videoData = responseData?.data?.video;
        
        if (videoData && videoData.videoUrl) {
          // Successfully refreshed presigned URL
          // Cache the new URL
          cacheVideoUrl(videoId, videoData.videoUrl);
          setIsRefreshingUrl(false);
          return videoData.videoUrl;
        } else {
          console.error('❌ [VideoPlayer] No video data found for URL refresh:', {
            hasResponseData: !!responseData,
            hasData: !!responseData?.data,
            hasVideo: !!responseData?.data?.video,
            hasVideoUrl: !!responseData?.data?.video?.videoUrl,
            responseStructure: Object.keys(responseData || {})
          });
          setIsRefreshingUrl(false);
          return null;
        }
      } else {
        console.error('❌ [VideoPlayer] Failed to refresh presigned URL:', response.status);
        setIsRefreshingUrl(false);
        return null;
      }
    } catch (error) {
      console.error('❌ [VideoPlayer] Error refreshing presigned URL:', error);
      setIsRefreshingUrl(false);
      return null;
    }
  };

  const retryVideoLoad = async () => {
    if (!currentVideo || retryCount >= 3) {
      console.log('❌ [VideoPlayer] Max retries reached or no current video');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setVideoError(null);

    console.log(`🔄 [VideoPlayer] Retrying video load (attempt ${retryCount + 1}/3)`);

    try {
      // Wait a moment before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to refresh the presigned URL
      const freshVideoUrl = await refreshVideoUrl(currentVideoId);
      
      if (freshVideoUrl) {
        // Got fresh presigned URL, retrying...
        
        // Validate the video URL before setting it
        const videoUrl = freshVideoUrl.trim();
        if (videoUrl && videoUrl !== '' && videoUrl !== window.location.href) {
          // Update the course data with the fresh URL
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => 
                video.id === currentVideoId 
                  ? { ...video, videoUrl: freshVideoUrl }
                  : video
              )
            };
          });
        } else {
          console.error('❌ [VideoPlayer] Invalid presigned URL received:', {
            videoUrl,
            isEmpty: videoUrl === '',
            isPageUrl: videoUrl === window.location.href
          });
          throw new Error('Invalid presigned URL received from server');
        }
      } else {
        throw new Error('Could not refresh presigned URL');
      }
    } catch (error) {
      console.error('❌ [VideoPlayer] Retry failed:', error);
      setVideoError('Failed to load video. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleVideoError = (error: any) => {
    console.error('❌ [VideoPlayer] Video error occurred:', error);

    // Get detailed error information
    const errorDetails = getVideoErrorDetails(error);
    console.log('🔍 [VideoPlayer] Error details:', errorDetails);

    // Check if this is a 403 error (expired presigned URL)
    if (errorDetails.type === 'FORBIDDEN' || 
        errorDetails.type === 'MEDIA_ERR_SRC_NOT_SUPPORTED' || 
        errorDetails.message.includes('403') || 
        errorDetails.message.includes('Forbidden')) {
      // Detected 403/expired URL error, refreshing video URL...
      
      if (currentVideo?.id) {
        console.log('🔄 [VideoPlayer] Attempting to refresh URL after 403 error...');
        setVideoError('Video access expired. Refreshing video link...');
        
        refreshVideoUrl(currentVideo.id).then(freshUrl => {
          if (freshUrl) {
            // Successfully refreshed URL after 403 error
            console.log('✅ [VideoPlayer] URL refreshed successfully after 403 error');
            setVideoError(null);
            // Update the course data with the fresh URL
            setCourseData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                videos: prev.videos.map(video => 
                  video.id === currentVideo.id 
                    ? { ...video, videoUrl: freshUrl }
                    : video
                )
              };
            });
          } else {
            console.error('❌ [VideoPlayer] Failed to refresh URL after 403 error');
            setVideoError('Failed to refresh video link. Please try refreshing the page.');
          }
        }).catch(error => {
          console.error('❌ [VideoPlayer] Error during URL refresh:', error);
          setVideoError('Failed to refresh video link. Please try refreshing the page.');
        });
        return;
      }
    }

    // Check if we should retry
    if (retryCount < 3) {
      console.log(`🔄 [VideoPlayer] Will retry video load (attempt ${retryCount + 1}/3)`);
      setVideoError(`${errorDetails.userMessage} Retrying... (${retryCount + 1}/3)`);
      retryVideoLoad();
      return;
    }

    // Max retries reached, show final error
    console.log('❌ [VideoPlayer] Max retries reached, showing final error');
    setVideoError(errorDetails.userMessage);
    setError(`Video Error: ${errorDetails.type}`);
  };

  // Udemy-style progress tracking function with request deduplication
  const updateProgress = useCallback(async (watchedDuration: number, totalDuration: number, timestamp: number) => {
    if (!id || !currentVideoId) return;

    const now = Date.now();
    
    // Udemy-style: Check if update is too frequent
    if (now - lastProgressUpdate.current < PROGRESS_UPDATE_INTERVAL) {
      console.log(`⏱️ [Udemy-Style] Progress update too frequent, skipping (${Math.round((now - lastProgressUpdate.current) / 1000)}s ago)`);
      return;
    }

    // Udemy-style: Cancel previous request if it exists
    if (pendingProgressRequest.current) {
      console.log('🔄 [Udemy-Style] Cancelling previous progress request');
      pendingProgressRequest.current.abort();
    }

    // Clear any pending timeout
    if (progressUpdateTimeout.current) {
      clearTimeout(progressUpdateTimeout.current);
      progressUpdateTimeout.current = null;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Create new abort controller for this request
      const abortController = new AbortController();
      pendingProgressRequest.current = abortController;

      console.log(`🔧 [Udemy-Style] Sending progress update: ${watchedDuration}s / ${totalDuration}s`);

      const response = await fetch(buildApiUrl('/api/progress/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: id,
          videoId: currentVideoId,
          watchedDuration,
          totalDuration,
          timestamp
        }),
        signal: abortController.signal
      });

      if (response.ok) {
        const result = await response.json();
        
        // Only update if not skipped
        if (!result.data?.skipped) {
          lastProgressUpdate.current = now;
          
          // Update course data with new progress
          if (courseData && result.data.courseProgress) {
            setCourseData(prev => {
              if (!prev) return null;
              
              // Update overall progress
              const updatedCourseData = {
                ...prev,
                overallProgress: result.data.courseProgress
              };
              
              // Update current video's progress if we have video progress data
              if (result.data.videoProgress && currentVideoId) {
                updatedCourseData.videos = prev.videos.map(video => 
                  video.id === currentVideoId 
                    ? { 
                        ...video, 
                        progress: {
                          ...video.progress,
                          watchedPercentage: result.data.videoProgress.watchedPercentage,
                          completionPercentage: result.data.videoProgress.completionPercentage,
                          watchedDuration: result.data.videoProgress.watchedDuration,
                          totalDuration: result.data.videoProgress.totalDuration,
                          isCompleted: result.data.videoProgress.isCompleted
                        }
                      }
                    : video
                );
              }
              
              return updatedCourseData;
            });
            
            // Update current video progress display
            if (result.data.videoProgress) {
              console.log('✅ [Udemy-Style] Progress updated successfully:', result.data.videoProgress.watchedPercentage + '%');
            }
          }
        } else {
          console.log('⏭️ [Udemy-Style] Progress update skipped by server');
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🔄 [Udemy-Style] Progress request was cancelled');
      } else {
        console.error('❌ [Udemy-Style] Error updating progress:', error);
      }
    } finally {
      // Clean up
      pendingProgressRequest.current = null;
    }
  }, [id, currentVideoId, courseData]);

  // Immediate progress saving function (for pause and navigation) - Udemy-style
  const saveProgressImmediately = useCallback(async (watchedDuration: number, totalDuration: number, timestamp: number) => {
    if (!id || !currentVideoId) return;

    // Udemy-style: Force immediate update regardless of time interval
    console.log('💾 [Udemy-Style] Saving progress immediately:', {
      watchedDuration,
      totalDuration,
      timestamp,
      percentage: totalDuration > 0 ? Math.round((watchedDuration / totalDuration) * 100) : 0
    });

    // Cancel any pending progress request
    if (pendingProgressRequest.current) {
      pendingProgressRequest.current.abort();
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Create new abort controller for immediate request
      const abortController = new AbortController();
      pendingProgressRequest.current = abortController;

      const response = await fetch(buildApiUrl('/api/progress/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: id,
          videoId: currentVideoId,
          watchedDuration,
          totalDuration,
          timestamp
        }),
        signal: abortController.signal
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [Udemy-Style] Progress saved immediately');
        
        // Update course data with new progress
        if (courseData && result.data.courseProgress) {
          setCourseData(prev => {
            if (!prev) return null;
            
            // Update overall progress
            const updatedCourseData = {
              ...prev,
              overallProgress: result.data.courseProgress
            };
            
            // Update current video's progress if we have video progress data
            if (result.data.videoProgress && currentVideoId) {
              updatedCourseData.videos = prev.videos.map(video => 
                video.id === currentVideoId 
                  ? { 
                      ...video, 
                      progress: {
                        ...video.progress,
                        watchedPercentage: result.data.videoProgress.watchedPercentage,
                        completionPercentage: result.data.videoProgress.completionPercentage,
                        watchedDuration: result.data.videoProgress.watchedDuration,
                        totalDuration: result.data.videoProgress.totalDuration,
                        isCompleted: result.data.videoProgress.isCompleted
                      }
                    }
                  : video
              );
            }
            
            return updatedCourseData;
          });
          
          // Update current video progress display
          if (result.data.videoProgress) {
            // Progress updated successfully
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🔄 [Udemy-Style] Immediate progress request was cancelled');
      } else {
        console.error('❌ [Udemy-Style] Error saving progress immediately:', error);
      }
    } finally {
      // Clean up
      pendingProgressRequest.current = null;
    }
  }, [id, currentVideoId, courseData]);

  // Fetch course and video data with progress
  useEffect(() => {
    const fetchCourseData = async () => {
      // Add a loading timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        console.log('⚠️ [VideoPlayer] Loading timeout reached');
        setError('Loading timeout. Please refresh the page and try again.');
        setLoading(false);
      }, 30000); // 30 second timeout
      
      try {
        setLoading(true);
        console.log('🔧 [VideoPlayer] Starting to fetch course data...');
        console.log('   - Course ID:', id);
        console.log('   - Video ID:', videoId);
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('❌ [VideoPlayer] No authentication token found');
          setError('Authentication required');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        
        console.log('✅ [VideoPlayer] Authentication token found');
        
        // Fetch course data first to get the proper title
        console.log('🔧 [VideoPlayer] Fetching course data...');
        const courseResponse = await fetch(buildApiUrl(`/api/courses/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        let courseData = null;
        if (courseResponse.ok) {
          const courseResult = await courseResponse.json();
          courseData = courseResult.data?.course; // Access the course object from data.course
          console.log('✅ [VideoPlayer] Course data received:', courseData);
        } else {
          console.log('⚠️ [VideoPlayer] Course fetch failed, will use fallback title');
        }
        
        // Fetch videos with DRM protection
        console.log('🔧 [VideoPlayer] Fetching videos with DRM protection...');
        const drmVideoService = DRMVideoService.getInstance();
        const videosResult = await drmVideoService.getCourseVideosWithDRM(id!, 1);
        console.log('🔧 [VideoPlayer] DRM videos data received:', videosResult);
        
        const videosWithAccess = videosResult.course.videos;
        const userHasPurchased = videosResult.userHasPurchased;
        
        console.log('🔧 [VideoPlayer] Video access details:', {
          totalVideos: videosWithAccess.length,
          userHasPurchased,
          videosWithUrls: videosWithAccess.filter((v: any) => v.drm?.encryptedUrl).length,
          videosWithAccess: videosWithAccess.filter((v: any) => v.hasAccess).length,
          drmEnabled: videosResult.drm.enabled
        });
        
        // Fetch course progress data
        console.log('🔧 [VideoPlayer] Fetching course progress...');
        const progressResponse = await fetch(buildApiUrl(`/api/progress/course/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        let progressResult = null;
        if (progressResponse.ok) {
          progressResult = await progressResponse.json();
          console.log('🔧 [VideoPlayer] Progress data received:', progressResult);
        } else {
          console.log('⚠️ [VideoPlayer] Progress fetch failed, continuing without progress data');
        }
        
        // Get course title from the course data or fallback
        const courseTitle = courseData?.title || 'Course';
        
        // Create a progress map for quick lookup
        const progressMap = new Map();
        if (progressResult?.data?.videos) {
          progressResult.data.videos.forEach((video: any) => {
            progressMap.set(video._id, video.progress);
          });
        }
        
        // Transform videos to match expected format with DRM access control
        const transformedVideos = videosWithAccess.map((video: any) => {
          // Debug: Log access details for each video
          console.log(`🔧 [VideoPlayer] Processing DRM video "${video.title}":`, {
            videoId: video.id,
            hasAccess: video.hasAccess,
            isFreePreview: video.isFreePreview,
            drmEnabled: video.drm?.enabled,
            hasEncryptedUrl: !!video.drm?.encryptedUrl,
            sessionId: video.drm?.sessionId
          });
          
          // Use DRM encrypted URL if available, otherwise fall back to regular video URL
          let videoUrl = video.url || video.videoUrl || '';
          
          // If we have an encrypted URL, don't set it as the video source yet
          // We'll decrypt it when the video is actually played
          if (video.drm?.encryptedUrl && video.drm?.sessionId) {
            // Don't set the encrypted URL as the source - it will be decrypted on play
            videoUrl = ''; // Empty URL until decryption
            // console.log(`🔒 [VideoPlayer] Video "${video.title}" has encrypted URL, will decrypt on play`);
          }
          
          // Validate video URL for videos with access
          if (video.hasAccess && !videoUrl && !video.drm?.encryptedUrl) {
            console.warn(`⚠️ [VideoPlayer] Video "${video.title}" has access but no video URL!`);
            console.log(`   - hasAccess: ${video.hasAccess}`);
            console.log(`   - isFreePreview: ${video.isFreePreview}`);
            console.log(`   - drmEnabled: ${video.drm?.enabled}`);
            console.log(`   - drmUrl: ${video.drm?.encryptedUrl}`);
            console.log(`   - regularUrl: ${video.url || video.videoUrl}`);
          }

          // Get progress data for this video
          const progress = progressMap.get(video._id) || {
            watchedDuration: 0,
            totalDuration: video.duration || 0,
            watchedPercentage: 0,
            completionPercentage: 0,
            isCompleted: false
          };

          return {
            id: video.id,
            title: video.title,
            duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '00:00',
            videoUrl: videoUrl,
            completed: progress.isCompleted,
            hasAccess: video.hasAccess,
            locked: !video.hasAccess,
            progress: progress,
            isFreePreview: video.isFreePreview,
            requiresPurchase: !video.hasAccess && !video.isFreePreview,
            // DRM data
            drm: {
              enabled: video.drm?.enabled || false,
              sessionId: video.drm?.sessionId,
              watermarkData: video.drm?.watermarkData,
              encryptedUrl: video.drm?.encryptedUrl
            }
          };
        });
        
        // Calculate overall progress from available videos
        const availableVideos = transformedVideos.filter((v: any) => v.hasAccess || userHasPurchased);
        const completedVideos = availableVideos.filter((v: any) => v.completed).length;
        const overallProgress = {
          totalVideos: availableVideos.length,
          completedVideos,
          totalProgress: availableVideos.length > 0 ? (completedVideos / availableVideos.length) * 100 : 0,
          lastWatchedVideo: null,
          lastWatchedPosition: 0
        };

        const finalCourseData = {
          title: courseTitle,
          videos: transformedVideos,
          overallProgress,
          userHasPurchased,
          hasWhatsappGroup: courseData?.hasWhatsappGroup || false
        };
        
        console.log('🔍 [VideoPlayer] Final courseData object:', {
          title: finalCourseData.title,
          totalVideos: finalCourseData.videos.length,
          userHasPurchased: finalCourseData.userHasPurchased,
          hasWhatsappGroup: finalCourseData.hasWhatsappGroup
        });
        
        setCourseData(finalCourseData);
        
        // Check if there are any videos available
        if (transformedVideos.length === 0) {
          console.log('⚠️ [VideoPlayer] No videos available for this course');
          setError('No videos available for this course. Please contact support if this is unexpected.');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        
        // Validate that the requested videoId exists in the course
        if (videoId && transformedVideos.length > 0) {
          const requestedVideo = transformedVideos.find((v: any) => v.id === videoId);
          if (!requestedVideo) {
            console.log('⚠️ [VideoPlayer] Requested video not found, redirecting to first available video');
            console.log(`   - Requested videoId: ${videoId}`);
            console.log(`   - Available videos: ${transformedVideos.map((v: any) => v.id).join(', ')}`);
            
            // Show a brief message and redirect to the first available video
            setError('The requested video is no longer available. Redirecting to the first video...');
            setTimeout(() => {
              const firstVideoId = transformedVideos[0].id;
              navigate(`/course/${id}/watch/${firstVideoId}`, { replace: true });
            }, 2000); // 2 second delay to show the message
            return;
          }
        }
        
        // Set current video if not already set
        if (!currentVideoId && transformedVideos.length > 0) {
          console.log('🔧 [VideoPlayer] Setting current video to first video:', transformedVideos[0].id);
          setCurrentVideoId(transformedVideos[0].id);
          setCurrentVideo(transformedVideos[0]); // Set initial current video state
        } else if (currentVideoId) {
          console.log('🔧 [VideoPlayer] Current video ID already set:', currentVideoId);
          // Set the current video state based on the currentVideoId
          const initialCurrentVideo = finalCourseData.videos.find((v: Video) => v.id === currentVideoId);
          setCurrentVideo(initialCurrentVideo); // Set initial current video state
        } else {
          console.log('⚠️ [VideoPlayer] No videos available to set as current video');
        }
        
        console.log('✅ [VideoPlayer] Course data setup completed');
        clearTimeout(loadingTimeout);
        
      } catch (error) {
        console.error('❌ [VideoPlayer] Error fetching course data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load course data');
        clearTimeout(loadingTimeout);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourseData();
    }
  }, [id, videoId, currentVideoId]);

  // Periodic progress refresh to update UI progress bars
  useEffect(() => {
    if (!id || !courseData) return;

    const refreshProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Only log progress refresh occasionally to reduce console spam
        if (Math.random() < 0.1) { // Only log 10% of the time
          console.log('🔄 [Progress Refresh] Fetching latest progress data...');
        }
        
        // Fetch latest progress data with error handling
        const progressResponse = await fetch(buildApiUrl(`/api/progress/course/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(error => {
          console.warn('⚠️ [Progress Refresh] Network error (likely browser extension conflict):', error.message);
          return null;
        });

        if (progressResponse && progressResponse.ok) {
          const progressResult = await progressResponse.json();
          
          if (progressResult?.data?.videos) {
            // Create progress map for quick lookup
            const progressMap = new Map();
            progressResult.data.videos.forEach((video: any) => {
              progressMap.set(video._id, video.progress);
            });

            // Update course data with fresh progress
            setCourseData(prev => {
              if (!prev) return null;

              const updatedVideos = prev.videos.map(video => {
                const freshProgress = progressMap.get(video.id);
                if (freshProgress) {
                  return {
                    ...video,
                    progress: freshProgress,
                    completed: freshProgress.isCompleted
                  };
                }
                return video;
              });

              // Update overall progress if available
              const updatedOverallProgress = progressResult.data.overallProgress || prev.overallProgress;

              return {
                ...prev,
                videos: updatedVideos,
                overallProgress: updatedOverallProgress
              };
            });

            console.log('✅ [Progress Refresh] Progress bars updated successfully');
          }
        }
      } catch (error) {
        console.error('❌ [Progress Refresh] Failed to refresh progress:', error);
      }
    };

    // Refresh progress every 5 seconds
    const interval = setInterval(refreshProgress, 5000);

    // Initial refresh after 2 seconds
    const initialTimeout = setTimeout(refreshProgress, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [id, courseData]);

  // Periodic URL refresh to prevent 403 errors from expired presigned URLs
  useEffect(() => {
    if (!currentVideoId || !courseData) return;

    const refreshVideoUrlPeriodically = async () => {
      const currentVideo = courseData.videos.find(v => v.id === currentVideoId);
      if (!currentVideo || !currentVideo.videoUrl) return;

      // Check if URL is expired or will expire soon
      if (isPresignedUrlExpired(currentVideo.videoUrl)) {
        console.log('🔄 [URL Refresh] Presigned URL expired, refreshing...');
        
        try {
          const freshUrl = await refreshVideoUrl(currentVideoId);
          if (freshUrl) {
            // Update the course data with the fresh URL
            setCourseData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                videos: prev.videos.map(video => 
                  video.id === currentVideoId 
                    ? { ...video, videoUrl: freshUrl }
                    : video
                )
              };
            });
            console.log('✅ [URL Refresh] Video URL refreshed successfully');
          }
        } catch (error) {
          console.error('❌ [URL Refresh] Failed to refresh video URL:', error);
        }
      }
    };

    // Check URL expiry every 2 minutes
    const interval = setInterval(refreshVideoUrlPeriodically, 120000);

    // Initial check after 30 seconds
    const initialTimeout = setTimeout(refreshVideoUrlPeriodically, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [currentVideoId, courseData]);

  // Fetch resume position when current video changes
  useEffect(() => {
    const fetchResumePosition = async () => {
      if (!currentVideoId || !id) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch resume position
        const resumeResponse = await fetch(buildApiUrl(`/api/progress/resume/${id}/${currentVideoId}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (resumeResponse.ok) {
          const resumeResult = await resumeResponse.json();
          const resumePosition = resumeResult.data.resumePosition;

          // Note: Resume position is now handled by EnhancedVideoPlayer's initialTime prop
          console.log(`✅ [VideoPlayer] Resume position set to ${resumePosition}s`);
        }
      } catch (error) {
        console.error('Error fetching resume position:', error);
      }
    };

    fetchResumePosition();
  }, [currentVideoId, id]);

  useEffect(() => {
    if (videoId) {
      setCurrentVideoId(videoId);
    }
  }, [videoId]);

  // Update currentVideo state when currentVideoId changes
  useEffect(() => {
    if (currentVideoId && courseData) {
      const newCurrentVideo = courseData.videos.find(v => v.id === currentVideoId);
      if (newCurrentVideo) {
        setCurrentVideo(newCurrentVideo);
      }
    }
  }, [currentVideoId, courseData]);

  // currentVideo is now a state variable instead of derived
  
  // Debug: Log current video details - only when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log('🔧 [VideoPlayer] Current video access details:', {
        id: currentVideo.id,
        title: currentVideo.title,
        hasAccess: currentVideo.hasAccess,
        locked: currentVideo.locked,
        isFreePreview: currentVideo.isFreePreview,
        hasVideoUrl: !!currentVideo.videoUrl,
        videoUrlLength: currentVideo.videoUrl?.length || 0
      });
      
      // INITIAL URL REFRESH: Check if URL is expired when course data is first loaded
      if (currentVideo.videoUrl && isPresignedUrlExpired(currentVideo.videoUrl)) {
        console.log('🔧 [VideoPlayer] Initial video URL is expired, refreshing immediately...');
        refreshVideoUrl(currentVideo.id).then(freshUrl => {
          if (freshUrl) {
            console.log('✅ [VideoPlayer] Successfully refreshed initial URL');
            setCourseData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                videos: prev.videos.map(video => 
                  video.id === currentVideo.id 
                    ? { ...video, videoUrl: freshUrl }
                    : video
                )
              };
            });
          }
        });
      }
    }
  }, [currentVideoId]); // Only depend on currentVideoId to prevent excessive logging

  // Debug logging for video URL issues - only when video changes
  useEffect(() => {
    if (currentVideo) {
      console.log('🔧 [VideoPlayer] Current video details:', {
        id: currentVideo.id,
        title: currentVideo.title,
        videoUrl: currentVideo.videoUrl,
        hasVideoUrl: !!currentVideo.videoUrl,
        videoUrlLength: currentVideo.videoUrl?.length || 0,
        videoUrlTrimmed: currentVideo.videoUrl?.trim() || '',
        isUrlValid: currentVideo.videoUrl && 
                   currentVideo.videoUrl.trim() !== '' && 
                   currentVideo.videoUrl !== window.location.href &&
                   currentVideo.videoUrl !== 'undefined' &&
                   currentVideo.videoUrl.startsWith('http'),
        isExpired: currentVideo.videoUrl ? isPresignedUrlExpired(currentVideo.videoUrl) : true
      });
      
      // PROACTIVE URL REFRESH: Check if URL is expired and refresh before video player tries to load it
      if (currentVideo.videoUrl && isPresignedUrlExpired(currentVideo.videoUrl)) {
        // Current video has expired presigned URL, proactively refreshing...
        refreshVideoUrl(currentVideo.id).then(freshUrl => {
          if (freshUrl) {
            // Successfully refreshed expired URL proactively
            setCourseData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                videos: prev.videos.map(video => 
                  video.id === currentVideo.id 
                    ? { ...video, videoUrl: freshUrl }
                    : video
                )
              };
            });
          }
        });
        return; // Skip the accessibility check since we're refreshing the URL
      }
      
      // Check if video URL is valid and accessible
      if (currentVideo.videoUrl && currentVideo.videoUrl.startsWith('http')) {
        console.log('🔧 [VideoPlayer] Testing video URL accessibility...');
        fetch(currentVideo.videoUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              console.log('✅ [VideoPlayer] Video URL is accessible:', response.status);
            } else {
              console.log('⚠️ [VideoPlayer] Video URL returned error status:', response.status);
              if (response.status === 403) {
                console.log('❌ [VideoPlayer] Video URL returned 403 Forbidden - marking as error');
                setVideoError('Video access denied (403 Forbidden). Please try refreshing the page.');
              }
            }
          })
          .catch(error => {
            console.error('❌ [VideoPlayer] Video URL is not accessible:', error);
            // If URL is not accessible, try to refresh it
            if (currentVideo.id) {
              console.log('🔄 [VideoPlayer] Attempting to refresh inaccessible video URL...');
              refreshVideoUrl(currentVideo.id).then(freshUrl => {
                if (freshUrl) {
                  console.log('✅ [VideoPlayer] Successfully refreshed video URL');
                  // Update the course data with the fresh URL
                  setCourseData(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      videos: prev.videos.map(video => 
                        video.id === currentVideo.id 
                          ? { ...video, videoUrl: freshUrl }
                          : video
                      )
                    };
                  });
                }
              });
            }
          });
      }
    } else {
      console.log('🔧 [VideoPlayer] No current video found:', {
        courseDataExists: !!courseData,
        videosCount: courseData?.videos?.length || 0,
        currentVideoId,
        availableVideoIds: courseData?.videos?.map(v => v.id) || []
      });
    }
  }, [currentVideoId]); // Only depend on currentVideoId to prevent excessive logging



  // Note: Time updates are now handled by EnhancedVideoPlayer's onTimeUpdate callback

  // Handle video pause
  const handleVideoPause = () => {
    setIsPlaying(false);
    setIsPaused(true);
    setPauseStartTime(Date.now());
      
      console.log('⏸️ [VideoPlayer] Video paused at:', currentTime, 'seconds');
      
      // Save progress immediately when paused
      saveProgressImmediately(currentTime, duration, currentTime);
  };

  // Handle video play
  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
    
    // Check if video was paused for more than 5 seconds
    if (pauseStartTime && Date.now() - pauseStartTime > 5000) {
      console.log('▶️ [VideoPlayer] Video resumed after pause > 5 seconds');
    }
    
    setPauseStartTime(null);
    
    // PROACTIVE URL REFRESH: Ensure we have a fresh URL before playback starts
    if (currentVideo && currentVideo.videoUrl && isPresignedUrlExpired(currentVideo.videoUrl)) {
      console.log('🔧 [VideoPlayer] Video URL expired before playback, refreshing...');
      refreshVideoUrl(currentVideo.id).then(freshUrl => {
        if (freshUrl) {
          console.log('✅ [VideoPlayer] Successfully refreshed URL before playback');
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => 
                video.id === currentVideo.id 
                  ? { ...video, videoUrl: freshUrl }
                  : video
              )
            };
          });
        }
      });
    }
  };

  // Check for long pauses and save progress
  useEffect(() => {
    if (isPaused && pauseStartTime) {
      const checkPauseDuration = setTimeout(() => {
        const pauseDuration = Date.now() - pauseStartTime;
        if (pauseDuration >= 5000) { // 5 seconds
          console.log('⏰ [VideoPlayer] Video paused for 5+ seconds, ensuring progress is saved');
            saveProgressImmediately(currentTime, duration, currentTime);
        }
      }, 5000);

      return () => clearTimeout(checkPauseDuration);
    }
  }, [isPaused, pauseStartTime, saveProgressImmediately, currentTime, duration]);

  // Handle page navigation and save progress
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPlaying) {
        console.log('🚪 [VideoPlayer] Page unload detected, saving progress');
        
        // Use synchronous storage to ensure data is saved
        localStorage.setItem('pendingProgress', JSON.stringify({
          courseId: id,
          videoId: currentVideoId,
          watchedDuration: currentTime,
          totalDuration: duration,
          timestamp: currentTime,
          savedAt: Date.now()
        }));
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        console.log('👁️ [VideoPlayer] Page hidden, saving progress');
        saveProgressImmediately(currentTime, duration, currentTime);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, currentVideoId, isPlaying, saveProgressImmediately, currentTime, duration]);

  // Handle pending progress on page load
  useEffect(() => {
    const pendingProgress = localStorage.getItem('pendingProgress');
    if (pendingProgress) {
      try {
        const progress = JSON.parse(pendingProgress);
        const savedAt = progress.savedAt;
        const now = Date.now();
        
        // Only process if saved within the last 5 minutes
        if (now - savedAt < 5 * 60 * 1000) {
          console.log('🔄 [VideoPlayer] Processing pending progress from page unload');
          saveProgressImmediately(
            progress.watchedDuration,
            progress.totalDuration,
            progress.timestamp
          );
        }
        
        // Clear pending progress
        localStorage.removeItem('pendingProgress');
      } catch (error) {
        console.error('Error processing pending progress:', error);
        localStorage.removeItem('pendingProgress');
      }
    }
  }, [saveProgressImmediately]);

  // Handle video end
  const handleVideoEnd = async () => {
    if (!id || !currentVideoId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Mark video as completed
      await fetch(buildApiUrl('/api/progress/complete-video'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: id,
          videoId: currentVideoId
        })
      });

      // Get next video
      const nextVideoResponse = await fetch(buildApiUrl(`/api/progress/next-video/${id}/${currentVideoId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (nextVideoResponse.ok) {
        const nextVideoResult = await nextVideoResponse.json();
        const nextVideo = nextVideoResult.data.nextVideo;

        if (nextVideo) {
          // Navigate to next video
          navigate(`/course/${id}/watch/${nextVideo._id}`);
        } else {
          // Course completed
          console.log('🎉 Course completed!');
        }
      }
    } catch (error) {
      console.error('Error handling video end:', error);
    }
  };



  // Handle video selection
  const handleVideoSelect = async (newVideoId: string) => {
    // Prevent multiple rapid video switches
    if (isSwitchingVideo) {
      console.log('🔄 [VideoPlayer] Already switching video, ignoring request');
      return;
    }
    
    console.log('🔧 [VideoPlayer] Switching to video:', newVideoId);
    setIsSwitchingVideo(true);
    
    // Check if the video is locked
    const newVideo = courseData?.videos.find(v => v.id === newVideoId);
    if (newVideo?.locked) {
      console.log('🔒 [VideoPlayer] Video is locked, redirecting to checkout');
      
      // Show a message to the user
      setError('This video requires course purchase. Redirecting to checkout...');
      
      // Redirect to checkout after a short delay
      setTimeout(() => {
        navigate(`/course/${id}/checkout`);
      }, 2000);
      
      setIsSwitchingVideo(false);
      return;
    }
    
    // Always refresh the URL for the new video to ensure it's fresh
    console.log('🔧 [VideoPlayer] Refreshing URL for new video...');
    setVideoError('Loading video...');
    
    try {
      const freshUrl = await refreshVideoUrl(newVideoId);
      if (freshUrl) {
        console.log('✅ [VideoPlayer] URL refreshed successfully for new video');
        
        // Find the video object and update it with the fresh URL
        const selectedVideo = courseData?.videos.find(v => v.id === newVideoId);
        if (selectedVideo) {
          const updatedVideo = { ...selectedVideo, videoUrl: freshUrl };
          
          // Update the course data with the fresh URL
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => 
                video.id === newVideoId 
                  ? updatedVideo
                  : video
              )
            };
          });
          
          // Explicitly set the current video state with the fresh URL
          setCurrentVideo(updatedVideo);
        }
        
        // Clear any error states
        setVideoError(null);
        setError(null);
      } else {
        console.error('❌ [VideoPlayer] Failed to refresh URL for new video');
        setVideoError('Failed to load video. Please try again.');
        setIsSwitchingVideo(false);
        return;
      }
    } catch (error) {
      console.error('❌ [VideoPlayer] Error refreshing URL for new video:', error);
      setVideoError('Failed to load video. Please try again.');
      setIsSwitchingVideo(false);
      return;
    }
    
    // Only set the new video ID after successful URL refresh
    setCurrentVideoId(newVideoId);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentVideoPercentage(0);
    setRetryCount(0);
    setIsRetrying(false);
    setError(null);
    window.history.pushState(null, '', `/course/${id}/watch/${newVideoId}`);
    
    // Reset switching state after a short delay
    setTimeout(() => {
      setIsSwitchingVideo(false);
    }, 500);
  };



  // Note: Progress seeking, play/pause, and manual play are now handled by EnhancedVideoPlayer

  // Note: Controls visibility is now handled by EnhancedVideoPlayer

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending progress requests
      if (pendingProgressRequest.current) {
        pendingProgressRequest.current.abort();
      }
      
      // Clear timeouts
      if (progressUpdateTimeout.current) {
        clearTimeout(progressUpdateTimeout.current);
      }
      
      // Save progress when component unmounts
      if (isPlaying) {
        console.log('🔚 [Udemy-Style] Component unmounting, saving final progress');
        
        // Use synchronous storage to ensure data is saved
        localStorage.setItem('pendingProgress', JSON.stringify({
          courseId: id,
          videoId: currentVideoId,
          watchedDuration: currentTime,
          totalDuration: duration,
          timestamp: currentTime,
          savedAt: Date.now()
        }));
      }
    };
  }, [id, currentVideoId, isPlaying]);

  // Reset error states when course or video changes
  useEffect(() => {
    setVideoError(null);
    setRetryCount(0);
    setIsRetrying(false);
    setError(null);
  }, [id, videoId]);

  // Debug current video state - only log when currentVideoId changes
  useEffect(() => {
    // Only log when there's an issue finding the video
    if (courseData && courseData.videos && currentVideoId) {
      const matchingVideo = courseData.videos.find(v => v.id === currentVideoId);
      if (!matchingVideo) {
        console.log('❌ [VideoPlayer] No video found with currentVideoId:', currentVideoId);
        console.log('   - Available video IDs:', courseData.videos.map(v => v.id));
      }
    }
  }, [currentVideoId, courseData]); // Only log when there's an issue

  // Update current video progress display
  useEffect(() => {
    if (currentVideo?.progress) {
      // Use the completionPercentage from the backend, or calculate it from watchedDuration/totalDuration
      let actualProgress = currentVideo.progress.completionPercentage || 0;
      
      // If completionPercentage is 0 but we have watchedDuration, calculate it manually
      if (actualProgress === 0 && currentVideo.progress.watchedDuration > 0 && currentVideo.progress.totalDuration > 0) {
        actualProgress = Math.round((currentVideo.progress.watchedDuration / currentVideo.progress.totalDuration) * 100);
      }
      
      console.log('🔧 [VideoPlayer] Updated video progress display:', actualProgress);
      console.log('🔧 [VideoPlayer] Raw progress data:', currentVideo.progress);
    } else {
      // No progress data available
    }
  }, [currentVideoId]); // Only depend on currentVideoId to prevent excessive updates

  // Video preloading and caching
  useEffect(() => {
    if (!courseData?.videos) return;

    // Log next video for debugging (removed problematic preload)
    const currentIndex = courseData.videos.findIndex(v => v.id === currentVideoId);
    if (currentIndex >= 0 && currentIndex < courseData.videos.length - 1) {
      const nextVideo = courseData.videos[currentIndex + 1];
      if (nextVideo.videoUrl) {
        console.log('🔧 [VideoPlayer] Next video ready:', nextVideo.title);
      }
    }
  }, [courseData, currentVideoId]);

  // Video caching with localStorage
  const cacheVideoUrl = useCallback((videoId: string, videoUrl: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem('videoUrlCache') || '{}');
      cache[videoId] = {
        url: videoUrl,
        timestamp: Date.now()
      };
      localStorage.setItem('videoUrlCache', JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching video URL:', error);
    }
  }, []);


  // Proactive presigned URL refresh
  useEffect(() => {
    if (!currentVideo?.videoUrl) return;

    const checkAndRefreshUrl = async () => {
      // Check if the current presigned URL will expire soon (within 10 minutes)
      if (isPresignedUrlExpired(currentVideo.videoUrl)) {
        console.log('🔍 [VideoPlayer] Presigned URL will expire soon, refreshing proactively');
        const freshUrl = await refreshVideoUrl(currentVideoId);
        if (freshUrl) {
          // Update the course data with the fresh URL
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => 
                video.id === currentVideoId 
                  ? { ...video, videoUrl: freshUrl }
                  : video
              )
            };
          });
          console.log('✅ [VideoPlayer] Proactively refreshed presigned URL');
        }
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAndRefreshUrl, 5 * 60 * 1000);
    
    // Also check immediately
    checkAndRefreshUrl();

    return () => clearInterval(interval);
  }, [currentVideo?.videoUrl, currentVideoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  // Only show error state for actual errors, not loading states
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold mb-4">
            {error?.includes('purchase') ? t('video_player.course_not_purchased') : t('video_player.video_not_found')}
          </h2>
          <p className="text-gray-400 mb-6">
            {error || t('video_player.video_not_exist')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {error?.includes('purchase') ? (
              <Link
                to={`/course/${id}`}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
              >
                {t('video_player.purchase_course')}
              </Link>
            ) : (
          <Link
            to="/courses"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
          >
            {t('video_player.back_to_courses')}
          </Link>
            )}
            <Link
              to="/dashboard"
              className="border border-gray-600 text-gray-300 hover:text-white px-6 py-3 rounded-lg transition-colors duration-200"
            >
              {t('video_player.go_to_dashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Debug logging
  // Debug logging for render state (reduced frequency)
  if (Math.random() < 0.1) { // Only log 10% of the time
    console.log('🔍 [VideoPlayerPage] Render state:', {
      showPlaylist,
      courseData: courseData ? 'loaded' : 'null',
      videos: courseData?.videos ? `${courseData.videos.length} videos` : 'none',
      loading,
      error
    });
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col pt-16">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 xxs:px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-semibold truncate">
            {courseData?.title || 'Loading...'}
          </h1>
          
          <div className="flex items-center space-x-2">
            {/* Desktop Playlist Toggle */}
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="hidden md:flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-700"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-sm">{showPlaylist ? t('video_player.hide_playlist') : t('video_player.show_playlist')}</span>
            </button>
            
            {/* Mobile Playlist Toggle */}
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="md:hidden flex items-center space-x-1 xxs:space-x-2 text-gray-300 hover:text-white transition-colors duration-200 px-2 xxs:px-3 py-2 rounded-lg hover:bg-gray-700"
            >
              <BookOpen className="h-4 w-4 xxs:h-5 xxs:w-5" />
              <span className="text-sm xxs:text-base">{t('video_player.playlist')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Video Player Section */}
        <div className="flex-1 flex flex-col">
                {/* Enhanced Video Player */}
      <div className="flex-1" style={{ minHeight: '400px', height: '60vh' }}>
        {currentVideo?.hasAccess &&
         !videoError &&
         !isRefreshingUrl ? (
          <>
            {isDecryptingUrl ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-lg">Decrypting video...</p>
                </div>
              </div>
            ) : currentVideo.videoUrl ? (
              <EnhancedVideoPlayer
                key={`${currentVideoId}-${currentVideo.videoUrl}`}
                src={currentVideo.videoUrl}
              title={courseData?.title}
              userId={(() => {
                try {
                  const token = localStorage.getItem('token');
                  if (token) {
                    const decoded = JSON.parse(atob(token.split('.')[1]));
                    return decoded.userId || decoded._id || decoded.id;
                  }
                } catch (e) {
                  console.error('Error decoding token:', e);
                }
                return undefined;
              })()}
              videoId={currentVideoId}
              courseId={id}
              playing={isPlaying}
              playbackRate={playbackRate}
                onPlay={() => {
                  console.log('🔧 [VideoPlayerPage] Video play event triggered');
                  handleVideoPlay();
                }}
                onPause={() => {
                  console.log('🔧 [VideoPlayerPage] Video pause event triggered');
                  handleVideoPause();
                }}
              onEnded={handleVideoEnd}
                onError={(error) => {
                  console.error('🔧 [VideoPlayerPage] Video error:', error);
                  handleVideoError(error);
                }}
              onReady={() => {
                console.log('🔧 [VideoPlayerPage] Video player ready');
              }}
              onTimeUpdate={(currentTime, duration) => {
                setCurrentTime(currentTime);
                setDuration(duration);
                    if (duration > 0) {
                  const actualPercentage = Math.round((currentTime / duration) * 100);
                  setCurrentVideoPercentage(actualPercentage);
                }
              }}
              onProgress={(watchedDuration, totalDuration) => {
                updateProgress(watchedDuration, totalDuration, watchedDuration);
              }}
              onPlaybackRateChange={setPlaybackRate}
              onControlsToggle={setControlsVisible}
              className="w-full h-full"
              initialTime={currentVideo?.progress?.lastPosition || 0}
              drmEnabled={currentVideo?.drm?.enabled || false}
              watermarkData={currentVideo?.drm?.watermarkData}
              forensicWatermark={forensicWatermark}
              />
            ) : currentVideo.drm?.encryptedUrl && currentVideo.drm?.sessionId ? (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-white text-center">
                  <button
                    onClick={async () => {
                      try {
                        setIsDecryptingUrl(true);
                        console.log('🔓 [VideoPlayerPage] Decrypting video URL...');
                        const decryptedUrl = await decryptVideoUrl(currentVideo.drm!.encryptedUrl!, currentVideo.drm!.sessionId!);
                        console.log('✅ [VideoPlayerPage] Video URL decrypted successfully');
                        
                        // Update the current video with the decrypted URL
                        setCurrentVideo(prev => prev ? { ...prev, videoUrl: decryptedUrl } : prev);
                      } catch (error) {
                        console.error('❌ [VideoPlayerPage] Failed to decrypt video URL:', error);
                        handleVideoError(error);
                      } finally {
                        setIsDecryptingUrl(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
                  >
                    🔓 Decrypt & Play Video
                  </button>
                  <p className="text-sm mt-2 text-gray-300">
                    Click to decrypt and load the video
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <div className="text-white text-center">
                  <p className="text-lg">No video available</p>
                </div>
              </div>
            )}
          </>
        ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                {videoError ? (
                  // Error state
                  <div className="space-y-4 text-center">
                    <div className="text-red-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-lg font-semibold mb-2">Video Error</p>
                      <p className="text-sm">{videoError}</p>
                    </div>
                    
                    {retryCount < 3 && !isRetrying && (
                      <button
                        onClick={retryVideoLoad}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold"
                      >
                        Try Again
                      </button>
                    )}
                    
                    {isRetrying && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                        <span>Retrying...</span>
                      </div>
                    )}
                    
                    {retryCount >= 3 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">All retry attempts failed</p>
                        <button
                          onClick={() => window.location.reload()}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm"
                        >
                          Refresh Page
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Loading state
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <p>Loading video...</p>
                    <p className="text-sm mt-2">
                      {isRefreshingUrl
                        ? t('video_player.refreshing_video_link')
                        : !currentVideo?.videoUrl || currentVideo.videoUrl === 'undefined' 
                        ? t('video_player.loading_video_link')
                        : !currentVideo?.hasAccess
                        ? t('video_player.checking_video_access')
                        : isPresignedUrlExpired(currentVideo.videoUrl)
                        ? t('video_player.video_link_expired')
                        : t('video_player.this_may_take_moments')
                      }
                    </p>
                    {videoLoading && (
                      <div className="mt-4 w-64 mx-auto">
                        <div className="bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${loadingProgress}%` }}
                          />
                      </div>
                        <p className="text-xs text-gray-500">{Math.round(loadingProgress)}% {t('video_player.loaded')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="bg-gray-800 px-3 xxs:px-4 py-3 xxs:py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-base xxs:text-lg line-clamp-2">{currentVideo?.title}</h2>
              {currentVideo?.completed && (
                <div className="flex items-center space-x-1 text-green-400">
                  <CheckCircle className="h-3 w-3 xxs:h-4 xxs:w-4" />
                  <span className="text-xs xxs:text-sm">Completed</span>
                </div>
              )}
            </div>
          </div>


          {/* WhatsApp Group Button Section */}
          {courseData && courseData.hasWhatsappGroup && (
            <div className="bg-gray-800 px-3 xxs:px-4 py-4 xxs:py-6">
              <div className="max-w-4xl mx-auto">
                <WhatsAppGroupButton
                  courseId={id || ''}
                  isEnrolled={!!courseData.userHasPurchased}
                  hasPaid={!!courseData.userHasPurchased}
                  hasWhatsappGroup={!!courseData.hasWhatsappGroup}
                  className="max-w-md mx-auto"
                />
              </div>
            </div>
          )}
          
        </div>

        {/* Playlist Sidebar */}
          {showPlaylist && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            {courseData && courseData.videos ? (
              <VideoPlaylist
                videos={courseData.videos}
                currentVideoId={currentVideoId}
                onVideoSelect={handleVideoSelect}
                courseProgress={courseData.overallProgress}
              />
            ) : (
              <div className="p-4">
                <div className="text-white text-sm mb-4">Course Content</div>
                <div className="text-gray-400 text-xs mb-2">
                  Debug: showPlaylist={showPlaylist.toString()}, 
                  courseData={courseData ? 'loaded' : 'null'}, 
                  videos={courseData?.videos ? `${courseData.videos.length} videos` : 'none'}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}
      </div>

      {/* Mobile Playlist Overlay */}
      {showPlaylist && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex">
          <div className="bg-gray-800 w-full max-w-sm xxs:max-w-md sm:max-w-lg ml-auto h-full overflow-y-auto">
            <div className="p-3 xxs:p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm xxs:text-base">{t('video_player.course_content')}</h3>
              <button
                onClick={() => setShowPlaylist(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors duration-200"
                aria-label={t('video_player.close_playlist')}
              >
                <svg className="w-5 h-5 xxs:w-6 xxs:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {courseData && courseData.videos ? (
              <VideoPlaylist
                videos={courseData.videos}
                currentVideoId={currentVideoId}
                onVideoSelect={(videoId) => {
                  handleVideoSelect(videoId);
                  setShowPlaylist(false);
                }}
                courseProgress={courseData.overallProgress}
              />
            ) : (
              <div className="p-4">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div
            className="flex-1"
            onClick={() => setShowPlaylist(false)}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayerPage;