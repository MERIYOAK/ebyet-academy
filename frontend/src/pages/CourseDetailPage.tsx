import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Play, CheckCircle, Award, Download, BookOpen, ShoppingCart, Loader, Lock, FileText, ExternalLink, Sparkles, Eye, MessageCircle } from 'lucide-react';
import VideoPlaylist from '../components/VideoPlaylist';
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';
import WhatsAppGroupButton from '../components/WhatsAppGroupButton';
import { buildApiUrl } from '../config/environment';
import DRMVideoService from '../services/drmVideoService';
import { parseDurationToSeconds, formatDuration } from '../utils/durationFormatter';
import { useCourse } from '../hooks/useCourses';
import { getLocalizedText } from '../utils/bilingualHelper';


interface Video {
  id: string;
  title: string | { en: string; tg: string };
  description?: string | { en: string; tg: string };
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
}

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnailURL?: string;
  price: number;
  category?: string;
  level?: string;
  tags?: string[];
  hasWhatsappGroup?: boolean;
  currentVersion?: number;
  videos?: Array<{
    _id: string;
    title: string;
    description?: string;
    duration?: number;
    thumbnailURL?: string;
  }>;
  instructor?: string;
  totalDuration?: number;
  totalVideos?: number;

  totalEnrollments?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PurchaseStatus {
  hasPurchased: boolean;
  courseId: string;
}

const CourseDetailPage = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language || 'en') as 'en' | 'tg';
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Course data state
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [totalCourseDurationSeconds, setTotalCourseDurationSeconds] = useState<number>(0);
  
  // Video player states
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentVideoPosition, setCurrentVideoPosition] = useState(0);
  const [currentVideoPercentage, setCurrentVideoPercentage] = useState(0);
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [isSwitchingVideo, setIsSwitchingVideo] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | undefined>(undefined);
  const [isDecryptingUrl, setIsDecryptingUrl] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  // Materials state
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Certificate states
  const [certificateExists, setCertificateExists] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [showCertificateSuccess, setShowCertificateSuccess] = useState(false);

  // Udemy-style progress tracking
  const pendingProgressRequest = useRef<AbortController | null>(null);
  const progressUpdateTimeout = useRef<number | null>(null);
  const lastProgressUpdate = useRef(0);
  const PROGRESS_UPDATE_INTERVAL = 5000; // 5 seconds (reduced for testing)

  // URL cache for video URLs
  const videoUrlCache = useRef<Map<string, { url: string; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  
  // Fetch materials for the course
  // Use useMemo to stabilize values and prevent infinite re-renders
  const courseVersion = course?.currentVersion || 1;
  const hasPurchased = purchaseStatus?.hasPurchased || courseData?.userHasPurchased;
  
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!id) return;

      try {
        setLoadingMaterials(true);
        
        // Always try to fetch materials, even if not authenticated
        // The API will return empty array for unauthenticated users
        const headers: HeadersInit = {};
        // Get token from localStorage as fallback if userToken state is not set
        const token = userToken || localStorage.getItem('token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(buildApiUrl(`/api/materials/course/${id}?version=${courseVersion}`), {
          headers
        }).catch((error) => {
          console.error('❌ Network error fetching materials:', error);
          return {
            ok: false,
            status: 0,
            json: async () => ({ success: false, message: 'Network error' })
          } as Response;
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.data?.materials) {
            const materialsList = data.data.materials || [];
            setMaterials(materialsList);
          } else {
            setMaterials([]);
          }
        } else if (response.status === 401) {
          // User not authenticated - API returns empty array, which is fine
          setMaterials([]);
        } else if (response.status === 403) {
          // User hasn't purchased - API should still return materials (without URLs)
          // But if it returns 403, set empty array
          setMaterials([]);
        } else {
          // Other errors
          setMaterials([]);
        }
      } catch (error) {
        console.error('❌ Exception fetching materials:', error);
        setMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [id, userToken, courseVersion, hasPurchased]);

  // Check if course is completed - make it reactive
  const isCourseCompleted = React.useMemo(() => {
    if (!courseData?.overallProgress) return false;
    
    const { completedVideos, totalVideos } = courseData.overallProgress;
    const completed = completedVideos === totalVideos && totalVideos > 0;
    
    console.log('🔍 [Course Completion Check]', {
      completedVideos,
      totalVideos,
      completed,
      overallProgress: courseData.overallProgress
    });
    
    return completed;
  }, [courseData?.overallProgress]);

  // Check if certificate exists for completed courses
  useEffect(() => {
    console.log('🔍 [Certificate] Certificate visibility check:', {
      isCourseCompleted,
      hasPurchased: purchaseStatus?.hasPurchased || courseData?.userHasPurchased,
      courseId: id
    });
    
    if (isCourseCompleted && (purchaseStatus?.hasPurchased || courseData?.userHasPurchased)) {
      console.log('✅ [Certificate] Course completed, checking for certificate...');
      checkCertificateExists();
    } else {
      console.log('🔍 [Certificate] Certificate section not shown:', {
        isCourseCompleted,
        hasPurchased: purchaseStatus?.hasPurchased || courseData?.userHasPurchased
      });
    }
  }, [isCourseCompleted, id, purchaseStatus?.hasPurchased, courseData?.userHasPurchased]);

  const checkCertificateExists = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl(`/api/certificates/course/${id}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data.certificate) {
          setCertificateExists(true);
          setCertificateId(result.data.certificate.certificateId);
        } else {
          setCertificateExists(false);
          setCertificateId(null);
        }
      } else if (response.status === 404) {
        setCertificateExists(false);
        setCertificateId(null);
      }
    } catch (error) {
      console.error('Error checking certificate:', error);
      setCertificateExists(false);
      setCertificateId(null);
    }
  };

  const generateCertificate = async () => {
    try {
      console.log('🔧 [Certificate] Generate button clicked');
      console.log('   - Course ID:', id);
      console.log('   - User has purchased:', purchaseStatus?.hasPurchased || courseData?.userHasPurchased);
      console.log('   - Course completed:', isCourseCompleted);
      console.log('   - User Agent:', navigator.userAgent);
      console.log('   - Is Mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      
      setGeneratingCertificate(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ [Certificate] No authentication token found');
        // Show mobile-friendly error message
        alert('Please log in to generate your certificate');
        return;
      }

      console.log('🔧 [Certificate] Sending request to generate certificate...');
      
      // Add mobile-specific timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for mobile
      
      const response = await fetch(buildApiUrl('/api/certificates/generate'), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Mobile-Client': /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'true' : 'false'
        },
        body: JSON.stringify({
          courseId: id
        })
      });
      
      clearTimeout(timeoutId);

      console.log('🔧 [Certificate] Response status:', response.status);
      console.log('🔧 [Certificate] Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [Certificate] Error response:', errorData);
        
        // Show mobile-friendly error message
        if (response.status === 403) {
          alert('You must complete the course before generating a certificate');
        } else if (response.status === 401) {
          alert('Please log in again to generate your certificate');
        } else {
          alert(errorData.message || 'Failed to generate certificate. Please try again.');
        }
        throw new Error(errorData.message || 'Failed to generate certificate');
      }

      const result = await response.json();
      console.log('✅ [Certificate] Certificate generated successfully:', result);
      
      setCertificateExists(true);
      setCertificateId(result.data.certificate.certificateId);
      
      setShowCertificateSuccess(true);
      setTimeout(() => setShowCertificateSuccess(false), 3000);
      
    } catch (error: any) {
      console.error('❌ [Certificate] Error generating certificate:', error);
      
      // Show mobile-friendly error message
      if (error && error.name === 'AbortError') {
        alert('Request timed out. Please check your connection and try again.');
      } else if (error && error.message) {
        alert(error.message);
      } else {
        alert('Failed to generate certificate. Please try again.');
      }
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const viewCertificate = () => {
    if (certificateId) {
      window.open(`/certificates?certificate=${certificateId}`, '_blank');
    } else {
      window.open('/certificates', '_blank');
    }
  };

  // Fetch course data from API
  const { 
    data: apiCourse, 
    isLoading: apiLoading, 
    error: apiError 
  } = useCourse(id || '');

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    setUserToken(token);
  }, []);


  // Fetch course data - API first, fallback to sample
  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;

      try {
        // Use API loading state
        setLoading(apiLoading);
        setError(null);

        // Try to use API course data first
        if (apiCourse) {
          console.log('✅ Using API course data for:', id);
          const courseData = {
            ...apiCourse,
            totalDuration: 0
          };
          
          // Calculate total duration from videos if available
          if (apiCourse.videos) {
            const totalSeconds = apiCourse.videos.reduce((acc, video) => {
              const duration = typeof video.duration === 'string' 
                ? parseDurationToSeconds(video.duration) 
                : (video.duration || 0);
              return acc + duration;
            }, 0);
            courseData.totalDuration = totalSeconds;
          }
          
          setCourse(courseData as Course);
          setLoading(false);
        } else if (!apiLoading && (apiError || !apiCourse)) {
          // API failed or returned no data - show error
          throw new Error(t('course_detail.course_not_found'));
        }

      } catch (error) {
        console.error('❌ Error loading course:', error);
        setError(error instanceof Error ? error.message : t('course_detail.failed_to_load_course'));
        setLoading(false);
      }
    };

    // Only fetch if we have API data or if API has finished loading (with error)
    if (apiCourse || (!apiLoading && (apiError || !apiCourse))) {
      fetchCourse();
    } else if (apiLoading) {
      setLoading(true);
    }
  }, [id, apiCourse, apiLoading, apiError, t]);

  // Fetch video data for the course from API with DRM support (like VideoPlayerPage)
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return;

      const loadingTimeout = setTimeout(() => {
        console.log('⚠️ [CourseDetail] Loading timeout reached');
        setError('Loading timeout. Please refresh the page and try again.');
        setLoading(false);
      }, 30000);

      try {
        setLoading(true);
        console.log('🔧 [CourseDetail] Starting to fetch course data...');
        console.log('   - Course ID:', id);
        
        const token = localStorage.getItem('token');
        if (!token && !userToken) {
          console.log('⚠️ [CourseDetail] No authentication token, will fetch public data');
        }
        
        // Fetch course data first to get the proper title
        console.log('🔧 [CourseDetail] Fetching course data...');
        const courseResponse = await fetch(buildApiUrl(`/api/courses/${id}`), {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        let courseDataFromApi = null;
        if (courseResponse.ok) {
          const courseResult = await courseResponse.json();
          courseDataFromApi = courseResult.data?.course;
          console.log('✅ [CourseDetail] Course data received');
        }
        
        // Fetch videos with DRM protection (like VideoPlayerPage)
        console.log('🔧 [CourseDetail] Fetching videos with DRM protection...');
        let videosWithAccess: any[] = [];
        let userHasPurchased = false;
        
        try {
          const drmVideoService = DRMVideoService.getInstance();
          const videosResult = await drmVideoService.getCourseVideosWithDRM(id, 1);
          console.log('🔧 [CourseDetail] DRM videos data received');
          console.log('🔧 [CourseDetail] videosResult.userHasPurchased:', videosResult.userHasPurchased);
          
          videosWithAccess = videosResult.course.videos || [];
          userHasPurchased = videosResult.userHasPurchased || false;
        } catch (drmError) {
          console.log('⚠️ [CourseDetail] Could not fetch DRM videos (may be unauthenticated), fetching basic course info...');
          console.log('⚠️ [CourseDetail] DRM Error:', drmError);
          console.log('⚠️ [CourseDetail] Setting userHasPurchased to false due to DRM error');
          // For unauthenticated users, get basic course info and mark all videos as locked
          if (courseDataFromApi?.videos) {
            videosWithAccess = courseDataFromApi.videos.map((video: any) => ({
              ...video,
              locked: true,
              hasAccess: false
            }));
          }
          userHasPurchased = false;
        }
        
        // Fetch course progress data (only if user has purchased)
        console.log('🔧 [CourseDetail] Fetching course progress...');
        let progressResult = null;
        if (token && userHasPurchased) {
          const progressResponse = await fetch(buildApiUrl(`/api/progress/course/${id}`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (progressResponse.ok) {
            progressResult = await progressResponse.json();
            console.log('🔧 [CourseDetail] Progress data received');
          } else if (progressResponse.status === 403) {
            // Expected for unpurchased courses - silently continue
            console.log('ℹ️ [CourseDetail] Progress not available (course not purchased)');
          }
        }
        
        // Get course title
        const courseTitle = courseDataFromApi?.title || course?.title || 'Course';
        
        // Create a progress map for quick lookup
        const progressMap = new Map();
        if (progressResult?.data?.videos) {
          progressResult.data.videos.forEach((video: any) => {
            progressMap.set(video._id, video.progress);
          });
        }
        
        // Transform videos to match VideoPlayerPage format with DRM access control
        const transformedVideos = videosWithAccess.map((video: any) => {
          // IMPORTANT: Only set videoUrl if user has access - locked videos should have empty URL
          const hasAccess = video.hasAccess || false;
          const isLocked = video.locked !== undefined ? video.locked : !hasAccess;
          let videoUrl = '';
          
          // Log video access status for debugging
          console.log(`🔒 [CourseDetail] Video ${video.id?.substring(0, 8)}...}:`, {
            hasAccess,
            isLocked,
            locked: video.locked,
            isFreePreview: video.isFreePreview,
            hasUrl: !!(video.url || video.videoUrl)
          });
          
          // Only provide video URL if user has access AND video is not locked
          if (hasAccess && !isLocked) {
            videoUrl = video.url || video.videoUrl || '';
            
            // If we have an encrypted URL, don't set it as the video source yet
            if (video.drm?.encryptedUrl && video.drm?.sessionId) {
              videoUrl = ''; // Empty URL until decryption
            }
          } else {
            // Locked video - ensure no URL is set (double-check)
            videoUrl = '';
            console.log(`🔒 [CourseDetail] Video ${video.id?.substring(0, 8)}... is LOCKED - no URL provided`);
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
            description: video.description,
            duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '00:00',
            videoUrl: videoUrl, // Empty for locked videos
            completed: progress.isCompleted,
            hasAccess: hasAccess,
            locked: !hasAccess,
            progress: progress,
            isFreePreview: video.isFreePreview,
            requiresPurchase: !hasAccess && !video.isFreePreview,
            // DRM data - only include if user has access
            drm: hasAccess ? {
              enabled: video.drm?.enabled || false,
              sessionId: video.drm?.sessionId,
              watermarkData: video.drm?.watermarkData,
              encryptedUrl: video.drm?.encryptedUrl
            } : {
              enabled: false,
              sessionId: null,
              watermarkData: null,
              encryptedUrl: null
            }
          };
        });
        
        // Calculate overall progress - use API progress if available, otherwise calculate locally
        let overallProgress;
        if (progressResult?.data?.overallProgress) {
          // Use API progress data
          overallProgress = progressResult.data.overallProgress;
          console.log('✅ [CourseDetail] Using API overall progress:', overallProgress);
        } else {
          // Calculate locally
          const availableVideos = transformedVideos.filter((v: any) => v.hasAccess || userHasPurchased);
          const completedVideos = availableVideos.filter((v: any) => v.completed).length;
          overallProgress = {
            totalVideos: availableVideos.length,
            completedVideos,
            totalProgress: availableVideos.length > 0 ? (completedVideos / availableVideos.length) * 100 : 0,
            lastWatchedVideo: null,
            lastWatchedPosition: 0
          };
          console.log('📊 [CourseDetail] Calculated local overall progress:', overallProgress);
        }

        const finalCourseData = {
          title: courseTitle,
          videos: transformedVideos,
          overallProgress,
          userHasPurchased,
          hasWhatsappGroup: courseDataFromApi?.hasWhatsappGroup || course?.hasWhatsappGroup || false
        };
        
        console.log('🔧 [CourseDetail] Setting courseData with userHasPurchased:', userHasPurchased);
        console.log('🔧 [CourseDetail] Final courseData:', finalCourseData);
        setCourseData(finalCourseData);
        
        // Set current video - prioritize videoId from URL params, then existing currentVideoId, then first accessible
        if (videoId && transformedVideos.find((v: Video) => v.id === videoId)) {
          // Use videoId from URL params if it exists and is valid
          const videoFromUrl = transformedVideos.find((v: Video) => v.id === videoId);
          if (videoFromUrl) {
            // Only set if video is not locked
            if (!videoFromUrl.locked && videoFromUrl.hasAccess) {
              setCurrentVideoId(videoId);
              setCurrentVideo(videoFromUrl);
            } else {
              // Video is locked, find first accessible video instead
              const firstAccessibleVideo = transformedVideos.find((v: Video) => !v.locked && v.hasAccess);
              if (firstAccessibleVideo) {
                setCurrentVideoId(firstAccessibleVideo.id);
                setCurrentVideo(firstAccessibleVideo);
              } else if (transformedVideos.length > 0) {
                // If no accessible videos, set first video (will show locked message)
                setCurrentVideoId(transformedVideos[0].id);
                setCurrentVideo(transformedVideos[0]);
              }
            }
          }
        } else if (!currentVideoId && transformedVideos.length > 0) {
          // Fallback to first accessible video
          const firstAccessibleVideo = transformedVideos.find((v: Video) => !v.locked && v.hasAccess);
          if (firstAccessibleVideo) {
            setCurrentVideoId(firstAccessibleVideo.id);
            setCurrentVideo(firstAccessibleVideo);
          } else if (transformedVideos.length > 0) {
            // If no accessible videos, set first video (will show locked message)
            setCurrentVideoId(transformedVideos[0].id);
            setCurrentVideo(transformedVideos[0]);
          }
        } else if (currentVideoId) {
          // Use existing currentVideoId
          const initialCurrentVideo = finalCourseData.videos.find((v: Video) => v.id === currentVideoId);
          setCurrentVideo(initialCurrentVideo);
        }
        
        console.log('✅ [CourseDetail] Course data setup completed');
        clearTimeout(loadingTimeout);
        
      } catch (error) {
        console.error('❌ [CourseDetail] Error fetching course data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load course data');
        clearTimeout(loadingTimeout);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourseData();
    }
  }, [id, userToken]);

  // Fetch purchase status
  useEffect(() => {
    const fetchPurchaseStatus = async () => {
      if (!userToken || !id) {
        // Skipping purchase status check - missing token or course ID
        return;
      }

      try {
        // Checking purchase status...
        
        const response = await fetch(buildApiUrl(`/api/payment/check-purchase/${id}`), {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        });

        // Response received

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Purchase status response:', data);
          // Extract the actual purchase status from nested data
          setPurchaseStatus(data.data || data);
          // Purchase status received
        } else {
          // Handle non-200 responses
          const errorText = await response.text();
          console.error('❌ Purchase status check failed:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          // If it's an HTML response, log it for debugging
          if (errorText.includes('<!doctype') || errorText.includes('<html')) {
            console.error('❌ Server returned HTML instead of JSON. This might be a routing or server error.');
          }
        }
      } catch (error) {
        console.error('❌ Error checking purchase status:', error);
        console.error('❌ Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    fetchPurchaseStatus();
  }, [userToken, id]);



  // Check if presigned URL is expired
  const isPresignedUrlExpired = (url: string): boolean => {
    try {
      if (!url || url === 'undefined' || url === '') {
        return true;
      }
      
      const urlObj = new URL(url);
      const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
      const dateParam = urlObj.searchParams.get('X-Amz-Date');
      
      if (expiresParam && dateParam) {
        const year = parseInt(dateParam.substring(0, 4));
        const month = parseInt(dateParam.substring(4, 6)) - 1;
        const day = parseInt(dateParam.substring(6, 8));
        const hour = parseInt(dateParam.substring(9, 11));
        const minute = parseInt(dateParam.substring(11, 13));
        const second = parseInt(dateParam.substring(13, 15));
        
        const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
        const expiresInSeconds = parseInt(expiresParam);
        const expiryTime = signedDate.getTime() / 1000 + expiresInSeconds;
        const currentTime = Math.floor(Date.now() / 1000);
        const fiveMinutesFromNow = currentTime + (5 * 60);
        
        return fiveMinutesFromNow > expiryTime;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // Refresh presigned URL for a specific video
  const refreshVideoUrl = async (videoId: string): Promise<string | null> => {
    try {
      // Check if the video is locked before attempting to refresh URL
      // Free preview videos should be accessible even without purchase
      const video = courseData?.videos.find(v => v.id === videoId);
      if (video?.locked || (!video?.hasAccess && !video?.isFreePreview)) {
        console.log('🔒 [CourseDetail] Video is locked, skipping URL refresh');
        return null;
      }

      // For free preview videos, use the existing video URL without authentication
      if (video?.isFreePreview && video.videoUrl) {
        console.log('🔓 [CourseDetail] Using existing free preview URL');
        return video.videoUrl;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token for URL refresh');
        return null;
      }

      setIsRefreshingUrl(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(buildApiUrl(`/api/videos/${videoId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json();
        const videoData = responseData?.data?.video;
        
        if (videoData && videoData.videoUrl) {
          videoUrlCache.current.set(videoId, { url: videoData.videoUrl, timestamp: Date.now() });
          setIsRefreshingUrl(false);
          return videoData.videoUrl;
        } else if (responseData?.data?.isLocked) {
          console.log('🔒 [CourseDetail] Server confirmed video is locked, no URL provided');
          setIsRefreshingUrl(false);
          return null;
        }
      } else if (response.status === 403) {
        console.log('🔒 [CourseDetail] Access denied by server (403), video may be locked');
        setIsRefreshingUrl(false);
        return null;
      }
      
      setIsRefreshingUrl(false);
      return null;
    } catch (error) {
      console.error('❌ Error refreshing presigned URL:', error);
      setIsRefreshingUrl(false);
      return null;
    }
  };

  // DRM URL decryption function (from VideoPlayerPage)
  const decryptVideoUrl = async (encryptedUrl: string, sessionId: string): Promise<string> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔓 [CourseDetail] Decrypting URL...');

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decrypt video URL');
      }

      const result = await response.json();
      console.log('✅ [CourseDetail] Decryption successful');
      return result.data.decryptedUrl;
    } catch (error) {
      console.error('❌ Failed to decrypt video URL:', error);
      throw error;
    }
  };

  // Retry video load function (from VideoPlayerPage)
  const retryVideoLoad = async () => {
    if (!currentVideo || retryCount >= 3) {
      console.log('❌ [CourseDetail] Max retries reached or no current video');
      return;
    }

    // Don't retry if video is locked (but allow free preview retries)
    if (currentVideo.locked || (!currentVideo.hasAccess && !currentVideo.isFreePreview)) {
      console.log('🔒 [CourseDetail] Video is locked, cannot retry');
      setVideoError('This video is locked. Please purchase the course to access it.');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setVideoError(null);

    console.log(`🔄 [CourseDetail] Retrying video load (attempt ${retryCount + 1}/3)`);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const freshVideoUrl = await refreshVideoUrl(currentVideoId);
      
      if (freshVideoUrl) {
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
        throw new Error('Could not refresh presigned URL');
      }
    } catch (error) {
      console.error('❌ [CourseDetail] Retry failed:', error);
      setVideoError('Failed to load video. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  };

  // Get video error details
  const getVideoErrorDetails = (error: any): { type: string; message: string; userMessage: string } => {
    const video = error?.target as HTMLVideoElement;
    const errorCode = video?.error?.code;
    
    if (!video) {
      return {
        type: 'UNKNOWN',
        message: error?.message || 'Unknown video error',
        userMessage: 'An error occurred while loading the video. Please try again.'
      };
    }

    const is403Error = video?.src && (
      video.src.includes('403') || 
      video.src.includes('Forbidden') ||
      video.networkState === 2
    );

    if (is403Error) {
      return {
        type: 'FORBIDDEN',
        message: 'Video access denied (403 Forbidden)',
        userMessage: 'Video access expired. Refreshing video link...'
      };
    }

    switch (errorCode) {
      case 1:
        return { type: 'ABORTED', message: 'Video loading was aborted', userMessage: 'Video loading was interrupted. Please try again.' };
      case 2:
        return { type: 'NETWORK', message: 'Network error occurred while loading video', userMessage: 'Network error. Please check your internet connection and try again.' };
      case 3:
        return { type: 'DECODE', message: 'Video decoding error', userMessage: 'Video format not supported. Please try a different browser.' };
      case 4:
        return { type: 'SRC_NOT_SUPPORTED', message: 'Video source not supported', userMessage: 'This video format is not supported. Please contact support.' };
      default:
        return { type: 'UNKNOWN', message: 'Unknown video error occurred', userMessage: 'An unexpected error occurred. Please try refreshing the page.' };
    }
  };

  // Udemy-style progress tracking (from VideoPlayerPage)
  const updateProgress = useCallback(async (watchedDuration: number, totalDuration: number, timestamp: number) => {
    console.log(`🔧 [Progress] updateProgress called: ${watchedDuration}s / ${totalDuration}s`);
    console.log(`   - Course ID: ${id}`);
    console.log(`   - Video ID: ${currentVideoId}`);
    console.log(`   - Has purchased: ${purchaseStatus?.hasPurchased || courseData?.userHasPurchased}`);
    
    if (!id || !currentVideoId) {
      console.log('❌ [Progress] Missing course ID or video ID');
      return;
    }

    // Only track progress for users who have purchased the course
    const hasPurchased = purchaseStatus?.hasPurchased || courseData?.userHasPurchased;
    console.log(`🔍 [Progress] Purchase status check:`);
    console.log(`   - purchaseStatus:`, purchaseStatus);
    console.log(`   - purchaseStatus.hasPurchased:`, purchaseStatus?.hasPurchased);
    console.log(`   - courseData.userHasPurchased:`, courseData?.userHasPurchased);
    console.log(`   - final hasPurchased:`, hasPurchased);
    
    if (!hasPurchased) {
      console.log('🔒 [Progress] User has not purchased course, skipping progress tracking');
      return;
    }

    const now = Date.now();
    
    if (now - lastProgressUpdate.current < PROGRESS_UPDATE_INTERVAL) {
      console.log(`⏱️ [Progress] Update too frequent, skipping (${Math.round((now - lastProgressUpdate.current) / 1000)}s ago)`);
      return;
    }

    if (pendingProgressRequest.current) {
      console.log('🔄 [Udemy-Style] Cancelling previous progress request');
      pendingProgressRequest.current.abort();
    }

    if (progressUpdateTimeout.current) {
      clearTimeout(progressUpdateTimeout.current);
      progressUpdateTimeout.current = null;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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
        
        if (!result.data?.skipped) {
          lastProgressUpdate.current = now;
          
          if (courseData && result.data.courseProgress) {
            console.log('🔄 [Progress Update] Updating course progress:', {
              completedVideos: result.data.courseProgress.completedVideos,
              totalVideos: result.data.courseProgress.totalVideos,
              totalProgress: result.data.courseProgress.totalProgress,
              isCompleted: result.data.courseProgress.completedVideos === result.data.courseProgress.totalVideos && result.data.courseProgress.totalVideos > 0
            });
            
            setCourseData(prev => {
              if (!prev) return null;
              
              const updatedCourseData = {
                ...prev,
                overallProgress: result.data.courseProgress
              };
              
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
      pendingProgressRequest.current = null;
    }
  }, [id, currentVideoId, courseData, purchaseStatus?.hasPurchased]);

  // Immediate progress saving function (from VideoPlayerPage)
  const saveProgressImmediately = useCallback(async (watchedDuration: number, totalDuration: number, timestamp: number) => {
    if (!id || !currentVideoId) return;

    // Only track progress for users who have purchased the course
    const hasPurchased = purchaseStatus?.hasPurchased || courseData?.userHasPurchased;
    if (!hasPurchased) {
      console.log('🔒 [Progress] User has not purchased course, skipping immediate progress save');
      return;
    }

    console.log('💾 [Udemy-Style] Saving progress immediately:', {
      watchedDuration,
      totalDuration,
      timestamp,
      percentage: totalDuration > 0 ? Math.round((watchedDuration / totalDuration) * 100) : 0
    });

    if (pendingProgressRequest.current) {
      pendingProgressRequest.current.abort();
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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
        
        if (courseData && result.data.courseProgress) {
          setCourseData(prev => {
            if (!prev) return null;
            
            const updatedCourseData = {
              ...prev,
              overallProgress: result.data.courseProgress
            };
            
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
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🔄 [Udemy-Style] Immediate progress request was cancelled');
      } else {
        console.error('❌ [Udemy-Style] Error saving progress immediately:', error);
      }
    } finally {
      pendingProgressRequest.current = null;
    }
  }, [id, currentVideoId, courseData, purchaseStatus?.hasPurchased]);

  // Video player event handlers (from VideoPlayerPage)
  const handleVideoPlay = () => {
    setIsPlaying(true);
    setIsPaused(false);
    
    if (pauseStartTime && Date.now() - pauseStartTime > 5000) {
      console.log('▶️ [CourseDetail] Video resumed after pause > 5 seconds');
    }
    
    setPauseStartTime(null);
    
    // PROACTIVE URL REFRESH: Ensure we have a fresh URL before playback starts
    if (currentVideo && currentVideo.videoUrl && isPresignedUrlExpired(currentVideo.videoUrl)) {
      console.log('🔧 [CourseDetail] Video URL expired before playback, refreshing...');
      refreshVideoUrl(currentVideo.id).then(freshUrl => {
        if (freshUrl) {
          console.log('✅ [CourseDetail] Successfully refreshed URL before playback');
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => {
                // Only update URL if video is not locked and has access
                if (video.id === currentVideo.id && !video.locked && video.hasAccess) {
                  return { ...video, videoUrl: freshUrl };
                }
                return video;
              })
            };
          });
        }
      });
    }
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setIsPaused(true);
    setPauseStartTime(Date.now());
      
    console.log('⏸️ [CourseDetail] Video paused at:', currentTime, 'seconds');
      
    // Save progress immediately when paused
    if (currentVideo && duration > 0) {
      saveProgressImmediately(currentTime, duration, currentTime);
    }
  };

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

      setIsPlaying(false);
    } catch (error) {
      console.error('Error handling video end:', error);
    }
  };

  const handleVideoError = async (error: any) => {
    console.error('❌ Video error:', error);
    const errorDetails = getVideoErrorDetails(error);

    if (errorDetails.type === 'FORBIDDEN' || errorDetails.type === 'MEDIA_ERR_SRC_NOT_SUPPORTED' || 
        errorDetails.message.includes('403') || errorDetails.message.includes('Forbidden')) {
      if (currentVideo?.id && !currentVideo.locked && (currentVideo.hasAccess || currentVideo.isFreePreview)) {
        setVideoError('Video access expired. Refreshing video link...');
        const freshUrl = await refreshVideoUrl(currentVideo.id);
        if (freshUrl) {
          setVideoError(null);
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => {
                // Update URL regardless of local lock state - server has confirmed access
                if (video.id === currentVideo.id) {
                  return { ...video, videoUrl: freshUrl };
                }
                return video;
              })
            };
          });
          // Also update currentVideo immediately
          if (currentVideo) {
            setCurrentVideo({ ...currentVideo, videoUrl: freshUrl });
          }
          return;
        } else {
          // URL refresh failed - this means the video is actually locked or access was denied
          console.log('🔒 [CourseDetail] URL refresh failed, video may be locked or access denied');
          setVideoError('Access denied. This video may be locked or require course purchase.');
          return;
        }
      }
    }

    if (retryCount < 3 && currentVideo && !currentVideo.locked && (currentVideo.hasAccess || currentVideo.isFreePreview)) {
      setRetryCount(prev => prev + 1);
      setVideoError(`${errorDetails.userMessage} Retrying... (${retryCount + 1}/3)`);
      setTimeout(async () => {
        const freshUrl = await refreshVideoUrl(currentVideoId);
        if (freshUrl) {
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
          // Also update currentVideo immediately
          if (currentVideo) {
            setCurrentVideo({ ...currentVideo, videoUrl: freshUrl });
          }
        } else {
          // Retry also failed - show final error
          setVideoError('Failed to load video. Please refresh the page or check your access.');
        }
      }, 1000);
      return;
    }

    setVideoError(errorDetails.userMessage);
  };

  const handleVideoSelect = async (newVideoId: string) => {
    // Prevent multiple rapid video switches
    if (isSwitchingVideo) {
      console.log('🔄 [CourseDetail] Already switching video, ignoring request');
      return;
    }
    
    console.log('🔧 [CourseDetail] Switching to video:', newVideoId);
    setIsSwitchingVideo(true);
    
    // Check if the video is locked or doesn't have access
    // Free preview videos should be playable even if user hasn't purchased the course
    const newVideo = courseData?.videos.find(v => v.id === newVideoId);
    if (!newVideo) {
      console.log('❌ [CourseDetail] Video not found');
      setIsSwitchingVideo(false);
      return;
    }
    
    if (newVideo.locked || (!newVideo.hasAccess && !newVideo.isFreePreview)) {
      console.log('🔒 [CourseDetail] Video is locked, cannot play');
      
      // Ensure video has no URL if it's locked
      newVideo.videoUrl = '';
      newVideo.drm = {
        enabled: false,
        sessionId: undefined,
        watermarkData: undefined,
        encryptedUrl: undefined
      };
      
      // Set the video as current to show the locked message, but don't allow playback
      setCurrentVideoId(newVideoId);
      setCurrentVideo(newVideo);
      setIsSwitchingVideo(false);
      
      // Show error message
      setVideoError('This video is locked. Please purchase the course to access it.');
      return;
    }
    
    // Always refresh the URL for the new video to ensure it's fresh
    console.log('🔧 [CourseDetail] Refreshing URL for new video...');
    setVideoError('Loading video...');
    
    try {
      const freshUrl = await refreshVideoUrl(newVideoId);
      if (freshUrl) {
        console.log('✅ [CourseDetail] URL refreshed successfully for new video');
        
        // Find the video object and update it with the fresh URL
        const selectedVideo = courseData?.videos.find(v => v.id === newVideoId);
        if (selectedVideo && !selectedVideo.locked && selectedVideo.hasAccess) {
          const updatedVideo = { ...selectedVideo, videoUrl: freshUrl };
          
          // Update the course data with the fresh URL (only if video is not locked)
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => 
                video.id === newVideoId && !video.locked && video.hasAccess
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
        console.error('❌ [CourseDetail] Failed to refresh URL for new video');
        setVideoError('Failed to load video. Please try again.');
        setIsSwitchingVideo(false);
        return;
      }
    } catch (error) {
      console.error('❌ [CourseDetail] Error refreshing URL for new video:', error);
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
    
    // Update URL without navigation (replace current history entry)
    window.history.replaceState(null, '', `/course/${id}`);
    
    // Reset switching state after a short delay
    setTimeout(() => {
      setIsSwitchingVideo(false);
    }, 500);
  };

  // Update current video when currentVideoId changes
  useEffect(() => {
    if (courseData && currentVideoId) {
      const video = courseData.videos.find(v => v.id === currentVideoId);
      setCurrentVideo(video);
    }
  }, [currentVideoId, courseData]);

  // Auto-refresh video URL when current video changes but doesn't have a URL
  useEffect(() => {
    if (currentVideo && currentVideo.hasAccess && !currentVideo.locked && !currentVideo.videoUrl && !isRefreshingUrl) {
      console.log('🔄 [CourseDetail] Auto-refreshing URL for video without URL');
      refreshVideoUrl(currentVideo.id).then(freshUrl => {
        if (freshUrl) {
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
          setCurrentVideo(prev => prev ? { ...prev, videoUrl: freshUrl } : prev);
        }
      });
    }
  }, [currentVideo, isRefreshingUrl]);

  // Periodic progress refresh to update UI progress bars (from VideoPlayerPage)
  useEffect(() => {
    if (!id || !courseData) return;
    
    // Only fetch progress if user has purchased the course
    const hasPurchased = purchaseStatus?.hasPurchased || courseData?.userHasPurchased;
    if (!hasPurchased) {
      // User hasn't purchased - don't fetch progress (403 is expected)
      return;
    }

    const refreshProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const progressResponse = await fetch(buildApiUrl(`/api/progress/course/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(error => {
          console.warn('⚠️ [Progress Refresh] Network error:', error.message);
          return null;
        });

        // Handle 403 (Forbidden) gracefully - user hasn't purchased the course
        if (progressResponse && progressResponse.status === 403) {
          // Expected for unpurchased courses - silently return
          return;
        }

        if (progressResponse && progressResponse.ok) {
          const progressResult = await progressResponse.json();
          
          if (progressResult?.data?.videos) {
            const progressMap = new Map();
            progressResult.data.videos.forEach((video: any) => {
              progressMap.set(video._id, video.progress);
            });

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

              const updatedOverallProgress = progressResult.data.overallProgress || prev.overallProgress;
              
              console.log('🔄 [Progress Refresh] Updated overall progress:', {
                completedVideos: updatedOverallProgress.completedVideos,
                totalVideos: updatedOverallProgress.totalVideos,
                totalProgress: updatedOverallProgress.totalProgress,
                isCompleted: updatedOverallProgress.completedVideos === updatedOverallProgress.totalVideos && updatedOverallProgress.totalVideos > 0
              });

              return {
                ...prev,
                videos: updatedVideos,
                overallProgress: updatedOverallProgress
              };
            });
          }
        }
      } catch (error) {
        console.error('❌ [Progress Refresh] Failed to refresh progress:', error);
      }
    };

    // Only set up interval if user has purchased
    if (!hasPurchased) {
      return; // Don't set up progress refresh for unpurchased courses
    }

    // Refresh progress every 5 seconds
    const interval = setInterval(refreshProgress, 5000);
    const initialTimeout = setTimeout(refreshProgress, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [id, courseData, purchaseStatus?.hasPurchased, courseData?.userHasPurchased]);

  // Periodic URL refresh to prevent 403 errors (from VideoPlayerPage)
  useEffect(() => {
    if (!currentVideoId || !courseData) return;

    const refreshVideoUrlPeriodically = async () => {
      const currentVideo = courseData.videos.find(v => v.id === currentVideoId);
      if (!currentVideo || !currentVideo.videoUrl) return;
      
      // Don't refresh URL for locked videos (but allow free preview refresh)
      if (currentVideo.locked || (!currentVideo.hasAccess && !currentVideo.isFreePreview)) {
        console.log('🔒 [URL Refresh] Video is locked, skipping URL refresh');
        return;
      }

      if (isPresignedUrlExpired(currentVideo.videoUrl)) {
        console.log('🔄 [URL Refresh] Presigned URL expired, refreshing...');
        
        try {
          const freshUrl = await refreshVideoUrl(currentVideoId);
          if (freshUrl) {
            setCourseData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                videos: prev.videos.map(video => {
                  // Only update URL if video is not locked and has access
                  if (video.id === currentVideoId && !video.locked && video.hasAccess) {
                    return { ...video, videoUrl: freshUrl };
                  }
                  return video;
                })
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
    const initialTimeout = setTimeout(refreshVideoUrlPeriodically, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, [currentVideoId, courseData]);

  // Fetch resume position when current video changes (from VideoPlayerPage)
  useEffect(() => {
    const fetchResumePosition = async () => {
      if (!currentVideoId || !id) return;

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const resumeResponse = await fetch(buildApiUrl(`/api/progress/resume/${id}/${currentVideoId}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (resumeResponse.ok) {
          const resumeResult = await resumeResponse.json();
          const resumePosition = resumeResult.data.resumePosition;
          console.log(`✅ [CourseDetail] Resume position set to ${resumePosition}s`);
        }
      } catch (error) {
        console.error('Error fetching resume position:', error);
      }
    };

    fetchResumePosition();
  }, [currentVideoId, id]);

  // Check for long pauses and save progress (from VideoPlayerPage)
  useEffect(() => {
    if (isPaused && pauseStartTime) {
      const checkPauseDuration = setTimeout(() => {
        const pauseDuration = Date.now() - pauseStartTime;
        if (pauseDuration >= 5000) {
          console.log('⏰ [CourseDetail] Video paused for 5+ seconds, ensuring progress is saved');
          saveProgressImmediately(currentTime, duration, currentTime);
        }
      }, 5000);

      return () => clearTimeout(checkPauseDuration);
    }
  }, [isPaused, pauseStartTime, saveProgressImmediately, currentTime, duration]);

  // Handle page navigation and save progress (from VideoPlayerPage)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isPlaying) {
        console.log('🚪 [CourseDetail] Page unload detected, saving progress');
        
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
        console.log('👁️ [CourseDetail] Page hidden, saving progress');
        saveProgressImmediately(currentTime, duration, currentTime);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, currentVideoId, isPlaying, saveProgressImmediately, currentTime, duration]);

  // Handle pending progress on page load (from VideoPlayerPage)
  useEffect(() => {
    const pendingProgress = localStorage.getItem('pendingProgress');
    if (pendingProgress) {
      try {
        const progress = JSON.parse(pendingProgress);
        const savedAt = progress.savedAt;
        const now = Date.now();
        
        if (now - savedAt < 5 * 60 * 1000) {
          console.log('🔄 [CourseDetail] Processing pending progress from page unload');
          saveProgressImmediately(
            progress.watchedDuration,
            progress.totalDuration,
            progress.timestamp
          );
        }
        
        localStorage.removeItem('pendingProgress');
      } catch (error) {
        console.error('Error processing pending progress:', error);
        localStorage.removeItem('pendingProgress');
      }
    }
  }, [saveProgressImmediately]);

  // Proactive presigned URL refresh (from VideoPlayerPage)
  useEffect(() => {
    if (!currentVideo?.videoUrl) return;
    
    // Don't refresh URL for locked videos
    if (currentVideo.locked || !currentVideo.hasAccess) {
      console.log('🔒 [CourseDetail] Video is locked, skipping proactive URL refresh');
      return;
    }

    const checkAndRefreshUrl = async () => {
      if (isPresignedUrlExpired(currentVideo.videoUrl)) {
        console.log('🔍 [CourseDetail] Presigned URL will expire soon, refreshing proactively');
        const freshUrl = await refreshVideoUrl(currentVideoId);
        if (freshUrl) {
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => {
                // Only update URL if video is not locked and has access
                if (video.id === currentVideoId && !video.locked && video.hasAccess) {
                  return { ...video, videoUrl: freshUrl };
                }
                return video;
              })
            };
          });
          console.log('✅ [CourseDetail] Proactively refreshed presigned URL');
        }
      }
    };

    const interval = setInterval(checkAndRefreshUrl, 5 * 60 * 1000);
    checkAndRefreshUrl();

    return () => clearInterval(interval);
  }, [currentVideo?.videoUrl, currentVideoId]);

  // Cleanup timeout on unmount (from VideoPlayerPage)
  useEffect(() => {
    return () => {
      if (pendingProgressRequest.current) {
        pendingProgressRequest.current.abort();
      }
      
      if (progressUpdateTimeout.current) {
        clearTimeout(progressUpdateTimeout.current);
      }
      
      if (isPlaying) {
        console.log('🔚 [Udemy-Style] Component unmounting, saving final progress');
        
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
  }, [id, currentVideoId, isPlaying, currentTime, duration]);

  // Proactive URL refresh
  useEffect(() => {
    if (!currentVideo || !currentVideo.videoUrl) return;
    
    // Don't refresh URL for locked videos
    if (currentVideo.locked || !currentVideo.hasAccess) {
      console.log('🔒 [CourseDetail] Video is locked, skipping proactive URL refresh');
      return;
    }

    if (isPresignedUrlExpired(currentVideo.videoUrl)) {
      refreshVideoUrl(currentVideo.id).then(freshUrl => {
        if (freshUrl) {
          setCourseData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              videos: prev.videos.map(video => {
                // Only update URL if video is not locked and has access
                if (video.id === currentVideo.id && !video.locked && video.hasAccess) {
                  return { ...video, videoUrl: freshUrl };
                }
                return video;
              })
            };
          });
        }
      });
    }
  }, [currentVideo?.id]);

  // Periodic URL refresh
  useEffect(() => {
    if (!currentVideo || !currentVideo.videoUrl) return;
    
    // Don't refresh URL for locked videos
    if (currentVideo.locked || !currentVideo.hasAccess) {
      console.log('🔒 [CourseDetail] Video is locked, skipping periodic URL refresh');
      return;
    }

    const interval = setInterval(async () => {
      if (isPresignedUrlExpired(currentVideo.videoUrl)) {
        const freshUrl = await refreshVideoUrl(currentVideo.id);
        if (freshUrl) {
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
      }
    }, 120000); // Every 2 minutes

    return () => clearInterval(interval);
  }, [currentVideo?.id, currentVideo?.videoUrl]);

  const handlePurchase = async () => {
    if (!userToken) {
      navigate('/login');
      return;
    }

    if (!id) {
      console.error('❌ No course ID available for purchase');
      return;
    }

    try {
      setIsPurchasing(true);
      console.log('🔧 Initiating purchase...');

      // Store courseId in sessionStorage for fallback redirect
      sessionStorage.setItem('pendingCourseId', id);

      const response = await fetch(buildApiUrl('/api/payment/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          courseId: id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      console.log('✅ Checkout session created:', data);
      
      // Store session info for potential failure handling
      sessionStorage.setItem('stripeSessionId', data.sessionId || 'unknown');
      sessionStorage.setItem('checkoutStartTime', Date.now().toString());
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('❌ Purchase error:', error);
      alert(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  // formatDuration is now imported from utils

  const formatTotalDuration = (videos?: Array<{ duration?: number }>) => {
    if (!videos) return '0:00';
    const totalSeconds = videos.reduce((acc, video) => acc + (video.duration || 0), 0);
    return formatDuration(totalSeconds);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-16 w-16 text-cyan-600 dark:text-cyan-500 animate-spin mx-auto mb-6" />
          <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">{t('course_detail.loading_course_details')}</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-cyan-600 dark:text-cyan-500 mb-6">
            <BookOpen className="h-20 w-20 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('course_detail.course_not_found')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {error || t('course_detail.course_not_found_message')}
          </p>
          <Link
            to="/courses"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
          >
            {t('course_detail.browse_all_courses')}
          </Link>
        </div>
      </div>
    );
  }

  const totalDuration = totalCourseDurationSeconds > 0
    ? formatDuration(totalCourseDurationSeconds)
    : formatTotalDuration(course.videos);
  const totalVideos = course.videos?.length || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-12 tiny:pt-14">
      {/* Top Navigation Bar - Removed playlist toggle */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 border-b border-blue-200 dark:border-gray-700 sticky top-12 tiny:top-14 z-40">
        <div className="max-w-7xl mx-auto px-2 tiny:px-3 xxs:px-4 sm:px-6 lg:px-8">
          <div className="py-2 tiny:py-2.5 xxs:py-3">
            {/* Navigation bar - empty for now */}
          </div>
        </div>
      </div>

      {/* Course Header Banner */}
      <div className="bg-gradient-to-br from-blue-100 via-cyan-100 to-purple-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-blue-300 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-2 tiny:px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 tiny:py-6 xxs:py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-4 tiny:gap-5 xxs:gap-6 lg:gap-8 items-start">
            {/* Course Thumbnail */}
            <div className="w-full lg:w-80 flex-shrink-0">
              {course.thumbnailURL ? (
                <div className="relative group rounded-lg tiny:rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-xl">
                  <img
                    src={course.thumbnailURL}
                    alt={getLocalizedText(course.title, currentLanguage)}
                    className="w-full h-40 tiny:h-44 xxs:h-48 sm:h-56 lg:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.category && (
                        <span className="bg-cyan-500/20 dark:bg-cyan-500/20 backdrop-blur-sm text-cyan-700 dark:text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold border border-cyan-500/30 dark:border-cyan-500/30">
                          {t(`categories.${course.category}`) || course.category}
                        </span>
                      )}
                      {course.level && (
                        <span className="bg-purple-500/20 dark:bg-purple-500/20 backdrop-blur-sm text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-semibold border border-purple-500/30 dark:border-purple-500/30 capitalize">
                          {course.level}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-48 lg:h-64 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center border border-gray-300 dark:border-gray-700">
                  <BookOpen className="h-20 w-20 text-gray-500 dark:text-gray-500" />
                </div>
              )}
            </div>

            {/* Course Header Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg tiny:text-xl xxs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 tiny:mb-3 xxs:mb-4 pb-1.5 tiny:pb-2 xxs:pb-2 sm:pb-3 md:pb-4 leading-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                {getLocalizedText(course.title, currentLanguage)}
              </h1>
              
              <p className="text-xs tiny:text-sm xxs:text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-3 tiny:mb-4 xxs:mb-6 leading-relaxed">
                {getLocalizedText(course.description, currentLanguage)}
              </p>

              {/* Quick Stats Row */}
              <div className="flex flex-wrap gap-2 tiny:gap-3 xxs:gap-4 mb-3 tiny:mb-4 xxs:mb-6">
                <div className="flex items-center space-x-1.5 tiny:space-x-2 bg-white dark:bg-gray-800 px-2.5 tiny:px-3 xxs:px-4 py-1.5 tiny:py-2 rounded-md tiny:rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
                  <Clock className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  <span className="text-xs tiny:text-sm text-gray-800 dark:text-gray-300">{totalDuration}</span>
                </div>
                <div className="flex items-center space-x-1.5 tiny:space-x-2 bg-white dark:bg-gray-800 px-2.5 tiny:px-3 xxs:px-4 py-1.5 tiny:py-2 rounded-md tiny:rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-none">
                  <BookOpen className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  <span className="text-xs tiny:text-sm text-gray-800 dark:text-gray-300">{totalVideos} {t('course_detail.lessons')}</span>
                </div>
              </div>

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 tiny:gap-2 mb-3 tiny:mb-4 xxs:mb-6">
                  {course.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-400 px-2 tiny:px-2.5 xxs:px-3 py-0.5 tiny:py-1 rounded-md tiny:rounded-lg text-[10px] tiny:text-xs font-medium border border-gray-200 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all duration-200 shadow-sm dark:shadow-none"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Purchased Badge */}
              {(purchaseStatus?.hasPurchased || courseData?.userHasPurchased) && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-semibold">{t('course_detail.purchased_course', 'Purchased Course')}</span>
                  </div>
                </div>
              )}

              {/* Buy Button */}
              {!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased) && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 tiny:gap-4 pt-3 tiny:pt-4 border-t border-blue-300 dark:border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1.5 tiny:gap-2">
                      <span className="text-xl tiny:text-2xl xxs:text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        ${course.price?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <p className="text-[10px] tiny:text-xs xxs:text-sm text-gray-600 dark:text-gray-400 mt-0.5 tiny:mt-1">
                      {t('course_detail.lifetime_access', 'Lifetime access')}
                    </p>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="w-full sm:w-auto px-4 tiny:px-6 xxs:px-8 py-2 tiny:py-2.5 xxs:py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg tiny:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1.5 tiny:gap-2 text-xs tiny:text-sm xxs:text-base"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader className="h-4 w-4 tiny:h-5 tiny:w-5 animate-spin" />
                        <span>{t('checkout_success.processing', 'Processing...')}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 tiny:h-5 tiny:w-5" />
                        <span>{t('course_detail.purchase_course')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-2 tiny:px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 tiny:py-6 xxs:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 tiny:gap-6 xxs:gap-8">
          {/* Left Column - Video Player */}
          <div className="lg:col-span-8 space-y-4 tiny:space-y-6 xxs:space-y-8">
            {/* Video Player Section */}
            {(!courseData || courseData.videos.length === 0) ? (
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-lg tiny:rounded-xl p-4 tiny:p-6 xxs:p-8 text-center border border-blue-200 dark:border-gray-700 shadow-lg dark:shadow-none">
                <div className="text-gray-600 dark:text-gray-400">
                  <BookOpen className="w-12 h-12 tiny:w-14 tiny:h-14 xxs:w-16 xxs:h-16 mx-auto mb-3 tiny:mb-4" />
                  <p className="text-sm tiny:text-base xxs:text-lg font-semibold mb-1.5 tiny:mb-2 text-gray-800 dark:text-gray-300">{t('course_detail.loading_course_content')}</p>
                  <p className="text-xs tiny:text-sm text-gray-600 dark:text-gray-400">{t('course_detail.please_wait_loading_videos')}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg tiny:rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
                {/* Video Player */}
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '200px', maxHeight: 'calc(100vh - 200px)' }}>
                  <div className="w-full h-full bg-black overflow-hidden">
                    {currentVideo?.hasAccess &&
                     !currentVideo?.locked &&
                     (currentVideo?.videoUrl || isRefreshingUrl) &&
                     !videoError ? (
                      <>
                        {isDecryptingUrl || isRefreshingUrl ? (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                              <p className="text-lg">
                                {isDecryptingUrl ? 'Decrypting video...' : 'Refreshing video link...'}
                              </p>
                            </div>
                          </div>
                        ) : currentVideo.videoUrl ? (
                          <EnhancedVideoPlayer
                            key={`${currentVideoId}-${currentVideo.videoUrl}`}
                            src={currentVideo.videoUrl}
                            title={courseData?.title ? getLocalizedText(courseData.title, currentLanguage) : undefined}
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
                              console.log('🔧 [CourseDetail] Video play event triggered');
                              handleVideoPlay();
                            }}
                            onPause={() => {
                              console.log('🔧 [CourseDetail] Video pause event triggered');
                              handleVideoPause();
                            }}
                            onEnded={handleVideoEnd}
                            onError={(error) => {
                              console.error('🔧 [CourseDetail] Video error:', error);
                              handleVideoError(error);
                            }}
                            onReady={() => {
                              console.log('🔧 [CourseDetail] Video player ready');
                              setPlayerReady(true);
                            }}
                            onTimeUpdate={(currentTime, duration) => {
                              setCurrentTime(currentTime);
                              setDuration(duration);
                              setCurrentVideoPosition(currentTime);
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
                            forensicWatermark={null}
                          />
                        ) : currentVideo.drm?.encryptedUrl && currentVideo.drm?.sessionId ? (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <div className="text-white text-center">
                              <button
                                onClick={async () => {
                                  try {
                                    setIsDecryptingUrl(true);
                                    console.log('🔓 [CourseDetail] Decrypting video URL...');
                                    const decryptedUrl = await decryptVideoUrl(currentVideo.drm!.encryptedUrl!, currentVideo.drm!.sessionId!);
                                    console.log('✅ [CourseDetail] Video URL decrypted successfully');
                                    
                                    setCurrentVideo(prev => prev ? { ...prev, videoUrl: decryptedUrl } : prev);
                                    setCourseData(prev => {
                                      if (!prev) return null;
                                      return {
                                        ...prev,
                                        videos: prev.videos.map(video => 
                                          video.id === currentVideoId 
                                            ? { ...video, videoUrl: decryptedUrl }
                                            : video
                                        )
                                      };
                                    });
                                  } catch (error) {
                                    console.error('❌ [CourseDetail] Failed to decrypt video URL:', error);
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
                      <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-400 overflow-hidden">
                        {currentVideo?.locked ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-400 overflow-hidden">
                            {/* Mobile: Show only lock icon */}
                            <div className="lg:hidden">
                              <Lock className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                            </div>
                            {/* Desktop: Show full content */}
                            <div className="hidden lg:block space-y-2 tiny:space-y-3 xxs:space-y-4 text-center px-2 tiny:px-3 xxs:px-4 py-2 tiny:py-3 xxs:py-4 max-w-full">
                              <Lock className="w-8 h-8 tiny:w-10 tiny:h-10 xxs:w-12 xxs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 tiny:mb-3 xxs:mb-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                              <p className="text-xs tiny:text-sm xxs:text-base sm:text-lg font-semibold mb-1 tiny:mb-1.5 xxs:mb-2 text-gray-900 dark:text-gray-300 px-2 break-words">{t('course_detail.video_locked')}</p>
                              <p className="text-[10px] tiny:text-xs xxs:text-sm mb-2 tiny:mb-3 xxs:mb-4 text-gray-700 dark:text-gray-400 px-2 break-words">
                                {!userToken 
                                  ? t('course_detail.sign_in_or_purchase')
                                  : t('course_detail.purchase_to_access')
                                }
                              </p>
                              {!userToken ? (
                                <div className="flex flex-col sm:flex-row gap-2 tiny:gap-2.5 xxs:gap-3 justify-center px-2">
                                  <button
                                    onClick={() => navigate('/login')}
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-all duration-200 font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 whitespace-nowrap"
                                  >
                                    {t('course_detail.sign_in')}
                                  </button>
                                  <button
                                    onClick={handlePurchase}
                                    className="bg-gray-600 dark:bg-gray-700 hover:bg-gray-500 dark:hover:bg-gray-600 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-colors duration-200 font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base whitespace-nowrap"
                                  >
                                    {t('course_detail.purchase_course')}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={handlePurchase}
                                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-all duration-200 font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 whitespace-nowrap"
                                >
                                  {t('course_detail.purchase_course')}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : videoError ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 overflow-hidden">
                            <div className="space-y-2 tiny:space-y-3 xxs:space-y-4 text-center px-2 tiny:px-3 xxs:px-4 py-2 tiny:py-3 xxs:py-4 max-w-full">
                              <div className="text-red-400">
                                <svg className="w-8 h-8 tiny:w-10 tiny:h-10 xxs:w-12 xxs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-2 tiny:mb-3 xxs:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <p className="text-xs tiny:text-sm xxs:text-base sm:text-lg font-semibold mb-1 tiny:mb-1.5 xxs:mb-2 break-words">Video Error</p>
                                <p className="text-[10px] tiny:text-xs xxs:text-sm break-words px-2">{videoError}</p>
                              </div>
                              
                              {retryCount < 3 && !isRetrying && (
                                <button
                                  onClick={retryVideoLoad}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-colors duration-200 font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base whitespace-nowrap"
                                >
                                  Try Again
                                </button>
                              )}
                              
                              {isRetrying && (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="animate-spin rounded-full h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 border-b-2 border-cyan-500"></div>
                                  <span className="text-[10px] tiny:text-xs xxs:text-sm">Retrying...</span>
                                </div>
                              )}
                              
                              {retryCount >= 3 && (
                                <div className="space-y-1 tiny:space-y-2">
                                  <p className="text-[10px] tiny:text-xs xxs:text-sm text-gray-500 break-words">All retry attempts failed</p>
                                  <button
                                    onClick={() => window.location.reload()}
                                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-colors duration-200 text-[10px] tiny:text-xs xxs:text-sm sm:text-base whitespace-nowrap"
                                  >
                                    Refresh Page
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center px-2 tiny:px-3 xxs:px-4 py-2 tiny:py-3 xxs:py-4 max-w-full overflow-hidden">
                            {courseData.videos.every(v => v.locked) && !userToken ? (
                              <div className="space-y-2 tiny:space-y-3 xxs:space-y-4">
                                <Lock className="w-8 h-8 tiny:w-10 tiny:h-10 xxs:w-12 xxs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto text-gray-500 dark:text-gray-400 flex-shrink-0" />
                                <p className="text-xs tiny:text-sm xxs:text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-300 break-words px-2">{t('course_detail.course_preview')}</p>
                                <p className="text-[10px] tiny:text-xs xxs:text-sm text-gray-600 dark:text-gray-500 mb-2 tiny:mb-3 xxs:mb-4 break-words px-2">
                                  {t('course_detail.no_free_preview')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2 tiny:gap-2.5 xxs:gap-3 justify-center px-2">
                                  <button
                                    onClick={() => navigate('/login')}
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-all duration-200 font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 whitespace-nowrap"
                                  >
                                    {t('course_detail.sign_in')}
                                  </button>
                                  <button
                                    onClick={handlePurchase}
                                    className="bg-gray-600 dark:bg-gray-700 hover:bg-gray-500 dark:hover:bg-gray-600 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 py-1.5 tiny:py-2 xxs:py-2.5 sm:py-3 rounded-lg transition-colors duration-200 font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base whitespace-nowrap"
                                  >
                                    {t('course_detail.purchase_course')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="animate-spin rounded-full h-8 w-8 tiny:h-10 tiny:w-10 xxs:h-12 xxs:w-12 border-b-2 border-cyan-600 dark:border-cyan-500 mx-auto mb-2 tiny:mb-3 xxs:mb-4"></div>
                                <p className="text-[10px] tiny:text-xs xxs:text-sm sm:text-base text-gray-700 dark:text-gray-300 break-words px-2">{t('course_detail.loading_video')}</p>
                                <p className="text-[9px] tiny:text-[10px] xxs:text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 tiny:mt-1.5 xxs:mt-2 break-words px-2">
                                  {!currentVideo?.videoUrl || currentVideo.videoUrl === 'undefined' 
                                    ? t('course_detail.refreshing_video_link')
                                    : t('course_detail.this_may_take_moments')
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Video Info */}
                <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-900 dark:via-gray-800/95 dark:to-gray-900 px-2 tiny:px-3 xxs:px-4 sm:px-6 py-2 tiny:py-2.5 xxs:py-3 sm:py-4 border-t border-blue-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2 tiny:gap-3 xxs:gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-gray-900 dark:text-white font-semibold text-[10px] tiny:text-xs xxs:text-sm sm:text-base md:text-lg mb-1 tiny:mb-1.5 xxs:mb-2 leading-tight line-clamp-2">
                        {currentVideo?.title ? getLocalizedText(currentVideo.title, currentLanguage) : t('course_detail.select_a_video')}
                      </h2>
                      <div className="flex items-center gap-1 tiny:gap-1.5 xxs:gap-2 flex-wrap mt-1 tiny:mt-1.5">
                        {currentVideo?.isFreePreview && !currentVideo?.locked && (
                          <span className="inline-flex items-center px-1 tiny:px-1.5 xxs:px-2 py-0.5 rounded text-[9px] tiny:text-[10px] xxs:text-xs font-medium bg-green-600 text-white">
                            🔓 {t('course_detail.free_preview')}
                          </span>
                        )}
                        {currentVideo?.completed && (
                          <div className="flex items-center space-x-0.5 tiny:space-x-1 text-green-600 dark:text-green-400 text-[9px] tiny:text-[10px] xxs:text-xs sm:text-sm">
                            <CheckCircle className="h-2.5 w-2.5 tiny:h-3 tiny:w-3 xxs:h-3.5 xxs:w-3.5 flex-shrink-0" />
                            <span>{t('course_detail.completed')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPlaylist(!showPlaylist)}
                      className="flex items-center space-x-1 tiny:space-x-1.5 xxs:space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 px-1.5 tiny:px-2 xxs:px-3 py-1 tiny:py-1.5 xxs:py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-800 flex-shrink-0"
                    >
                      <BookOpen className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
                      <span className="text-[10px] tiny:text-xs xxs:text-sm hidden xs:inline">{showPlaylist ? t('course_detail.hide_playlist') : t('course_detail.show_playlist')}</span>
                      <span className="text-[10px] tiny:text-xs xxs:text-sm xs:hidden">{showPlaylist ? t('course_detail.hide', 'Hide') : t('course_detail.show', 'Show')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Course Curriculum Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg tiny:rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="p-3 tiny:p-4 xxs:p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900">
                <h2 className="text-base tiny:text-lg xxs:text-xl font-bold text-gray-900 dark:text-white">{t('course_detail.course_curriculum', 'Course Curriculum')}</h2>
                <p className="text-[10px] tiny:text-xs xxs:text-sm text-gray-600 dark:text-gray-400 mt-0.5 tiny:mt-1">
                  {courseData?.videos.length || 0} {t('course_detail.lessons', 'lessons')} • {totalDuration} {t('course_detail.total', 'total')}
                </p>
              </div>
              
              {(!courseData || courseData.videos.length === 0) ? (
                <div className="p-4 tiny:p-6 xxs:p-8 text-center">
                  <BookOpen className="w-12 h-12 tiny:w-14 tiny:h-14 xxs:w-16 xxs:h-16 mx-auto mb-3 tiny:mb-4 text-gray-400 dark:text-gray-500" />
                  <p className="text-xs tiny:text-sm xxs:text-base text-gray-600 dark:text-gray-400">{t('course_detail.loading_course_content', 'Loading course content...')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {courseData.videos.map((video, idx) => {
                    const isLocked = video.locked;
                    const isCompleted = video.completed;
                    const hasAccess = !isLocked || (purchaseStatus?.hasPurchased || courseData?.userHasPurchased);
                    
                    return (
                      <div
                        key={video.id}
                        className={`p-3 tiny:p-4 xxs:p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${
                          isLocked && !hasAccess ? 'opacity-60' : 'cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isLocked || hasAccess) {
                            handleVideoSelect(video.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-2 tiny:gap-3 xxs:gap-4">
                          <div className="flex-shrink-0">
                            {isLocked && !hasAccess ? (
                              <div className="w-8 h-8 tiny:w-9 tiny:h-9 xxs:w-10 xxs:h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <Lock className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 text-gray-500 dark:text-gray-400" />
                              </div>
                            ) : isCompleted ? (
                              <div className="w-8 h-8 tiny:w-9 tiny:h-9 xxs:w-10 xxs:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 tiny:w-9 tiny:h-9 xxs:w-10 xxs:h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                                <Play className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 text-cyan-600 dark:text-cyan-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 tiny:gap-3 xxs:gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-xs tiny:text-sm xxs:text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 tiny:mb-1.5 xxs:mb-2">
                                  {idx + 1}. {getLocalizedText(video.title, currentLanguage)}
                                </h3>
                                {video.description && (
                                  <p className="text-[10px] tiny:text-xs xxs:text-sm text-gray-600 dark:text-gray-400 mb-2 tiny:mb-2.5 xxs:mb-3 line-clamp-2">
                                    {getLocalizedText(video.description, currentLanguage)}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 tiny:gap-2.5 xxs:gap-3 flex-wrap">
                                  <div className="flex items-center gap-1 text-[10px] tiny:text-xs xxs:text-sm text-gray-600 dark:text-gray-400">
                                    <Clock className="h-3 w-3 tiny:h-3.5 tiny:w-3.5 xxs:h-4 xxs:w-4 flex-shrink-0" />
                                    <span>{video.duration}</span>
                                  </div>
                                  {video.isFreePreview && !isLocked && (
                                    <span className="inline-flex items-center px-1.5 tiny:px-2 py-0.5 tiny:py-1 rounded text-[10px] tiny:text-xs font-medium bg-green-600 text-white">
                                      🔓 {t('course_detail.free_preview', 'Free Preview')}
                                    </span>
                                  )}
                                  {isLocked && !hasAccess && (
                                    <span className="inline-flex items-center px-1.5 tiny:px-2 py-0.5 tiny:py-1 rounded text-[10px] tiny:text-xs font-medium bg-gray-600 text-white">
                                      <Lock className="h-2.5 w-2.5 tiny:h-3 tiny:w-3 mr-0.5 tiny:mr-1 flex-shrink-0" />
                                      {t('course_detail.locked', 'Locked')}
                                    </span>
                                  )}
                                  {video.progress && video.progress.watchedPercentage > 0 && (
                                    <div className="flex items-center gap-1 text-[10px] tiny:text-xs text-gray-500 dark:text-gray-400">
                                      <span>{Math.round(video.progress.watchedPercentage)}% {t('course_detail.watched', 'watched')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Course Materials Section - Below Curriculum */}
            {!loadingMaterials && materials.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg tiny:rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden mt-4 tiny:mt-5 xxs:mt-6">
                <div className="p-3 tiny:p-4 xxs:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900">
                  <h3 className="text-base tiny:text-lg font-semibold text-gray-900 dark:text-white">{t('course_detail.course_materials', 'Course Materials')}</h3>
                </div>
                <div className="p-3 tiny:p-4 xxs:p-4 sm:p-6">
                  {!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased) ? (
                    <div className="flex items-center gap-1.5 tiny:gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 tiny:p-2.5 xxs:p-3">
                      <Lock className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 flex-shrink-0" />
                      <span className="text-xs tiny:text-sm font-medium">
                        {t('course_detail.materials_locked', 'Purchase this course to access the course materials')}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3 tiny:space-y-4">
                      {materials.map((material, index) => (
                        <div key={index} className="flex items-center justify-between p-3 tiny:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200">
                          <div className="flex items-center gap-3 tiny:gap-4">
                            <div className="w-10 h-10 tiny:w-11 tiny:h-11 xxs:w-12 xxs:h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 tiny:w-4.5 tiny:h-4.5 xxs:w-5 xxs:h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm tiny:text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
                                {getLocalizedText(material.title || material.name || { en: `Material ${index + 1}`, tg: `Материал ${index + 1}` }, currentLanguage)}
                              </h4>
                              {material.description && (
                                <p className="text-xs tiny:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                                  {getLocalizedText(material.description, currentLanguage)}
                                </p>
                              )}
                            </div>
                          </div>
                          {material.downloadUrl ? (
                            <a
                              href={material.downloadUrl}
                              download={material.title || material.name || `material-${index + 1}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 tiny:px-4 py-2 tiny:py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs tiny:text-sm font-medium rounded-lg transition-colors duration-200"
                            >
                              <Download className="w-3 h-3 tiny:w-3.5 tiny:h-3.5 xxs:w-4 xxs:h-4 mr-1.5 tiny:mr-2" />
                              {t('course_detail.download', 'Download')}
                            </a>
                          ) : (
                            <span className="text-xs tiny:text-sm text-gray-500 dark:text-gray-400 px-3 tiny:px-4 py-2 tiny:py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              {t('course_detail.no_download', 'No Download')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certificate Section - Show only when course is completed */}
            {isCourseCompleted && (purchaseStatus?.hasPurchased || courseData?.userHasPurchased) && (
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-lg tiny:rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-800 shadow-xl mt-4 tiny:mt-5 xxs:mt-6">
                <div className="p-3 tiny:p-4 xxs:p-5 sm:p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 tiny:gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 tiny:gap-3 mb-2 tiny:mb-3">
                        <div className="w-10 h-10 tiny:w-11 tiny:h-11 xxs:w-12 xxs:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <Award className="h-5 w-5 tiny:h-5.5 tiny:w-5.5 xxs:h-6 xxs:w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h2 className="text-base tiny:text-lg xxs:text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            {t('course_detail.certificate_ready', 'Certificate Ready!')}
                          </h2>
                          <p className="text-[10px] tiny:text-xs xxs:text-sm text-gray-600 dark:text-gray-400 mt-0.5 tiny:mt-1">
                            {t('course_detail.certificate_description', 'Congratulations! You have completed this course. Generate your certificate of completion.')}
                          </p>
                        </div>
                      </div>
                      
                      {showCertificateSuccess && (
                        <div className="mt-3 tiny:mt-4 p-2 tiny:p-2.5 xxs:p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center space-x-1.5 tiny:space-x-2 text-green-800 dark:text-green-300">
                            <CheckCircle className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 flex-shrink-0" />
                            <span className="text-xs tiny:text-sm font-medium">{t('course_detail.certificate_generated', 'Certificate Generated Successfully!')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      {certificateExists ? (
                        <button
                          onClick={viewCertificate}
                          className="flex items-center justify-center space-x-1.5 tiny:space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 tiny:px-5 xxs:px-6 py-2 tiny:py-2.5 xxs:py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 transform font-semibold text-xs tiny:text-sm xxs:text-base w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5" />
                          <span>{t('course_detail.view_certificate', 'View Certificate')}</span>
                        </button>
                      ) : (
                        <button
                          onClick={generateCertificate}
                          onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                          onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          disabled={generatingCertificate}
                          className="flex items-center justify-center space-x-1.5 tiny:space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 active:from-cyan-700 active:to-blue-700 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 tiny:px-5 xxs:px-6 py-2 tiny:py-2.5 xxs:py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transform disabled:hover:scale-100 disabled:cursor-not-allowed font-semibold text-xs tiny:text-sm xxs:text-base w-full sm:w-auto min-h-[44px] touch-manipulation"
                        >
                          {generatingCertificate ? (
                            <>
                              <Loader className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 animate-spin" />
                              <span>{t('course_detail.generating', 'Generating...')}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5" />
                              <span>{t('course_detail.generate_certificate', 'Generate Certificate')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Mobile Playlist Overlay - Shows on top of video player on mobile */}
          {courseData && courseData.videos.length > 0 && showPlaylist && (
            <>
              {/* Backdrop */}
              <div 
                className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setShowPlaylist(false)}
              />
              {/* Playlist Overlay */}
              <div className="lg:hidden fixed inset-x-0 top-14 xs:top-16 sm:top-16 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50" style={{ maxHeight: '60vh', height: '60vh' }}>
                <div className="h-full flex flex-col">
                  {/* Playlist Header with Close Button */}
                  <div className="flex items-center justify-between p-3 xxs:p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                        </svg>
                      </div>
                      <h3 className="font-bold text-sm xxs:text-base text-gray-900 dark:text-white">{t('course_detail.course_content', 'Course Content')}</h3>
                    </div>
                    <button
                      onClick={() => setShowPlaylist(false)}
                      className="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-600 hover:border-red-200 dark:hover:border-red-800 shadow-sm"
                      aria-label="Close playlist"
                    >
                      <svg className="w-5 h-5 xxs:w-6 xxs:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Playlist Content */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                    <VideoPlaylist
                      videos={courseData.videos}
                      currentVideoId={currentVideoId}
                      onVideoSelect={(videoId) => {
                        handleVideoSelect(videoId);
                        setShowPlaylist(false); // Close playlist after selecting video
                      }}
                      courseProgress={courseData.overallProgress}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mobile WhatsApp Section */}
          {course.hasWhatsappGroup && (
            <div className="lg:hidden mb-6 tiny:mb-8 xxs:mb-10">
              <div className="bg-white dark:bg-gray-800 rounded-lg tiny:rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="p-3 tiny:p-4 xxs:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900">
                  <h3 className="text-base tiny:text-lg font-semibold text-gray-900 dark:text-white">{t('course_detail.community', 'Community')}</h3>
                </div>
                <div className="p-3 tiny:p-4 xxs:p-4 sm:p-6">
                  {!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased) && (
                    <div className="mb-3 tiny:mb-4 flex items-center gap-1.5 tiny:gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 tiny:p-2.5 xxs:p-3">
                      <Lock className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 flex-shrink-0" />
                      <span className="text-xs tiny:text-sm font-medium">
                        {t('course_detail.whatsapp_locked', 'Purchase this course to access the WhatsApp community group')}
                      </span>
                    </div>
                  )}
                  <WhatsAppGroupButton
                    courseId={id || ''}
                    isEnrolled={!!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased)}
                    hasPaid={!!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased)}
                    hasWhatsappGroup={!!course.hasWhatsappGroup}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right Column - Playlist Sidebar */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-4 tiny:space-y-6">
              {courseData && courseData.videos.length > 0 && showPlaylist && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                  <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                    <VideoPlaylist
                      videos={courseData.videos}
                      currentVideoId={currentVideoId}
                      onVideoSelect={handleVideoSelect}
                      courseProgress={courseData.overallProgress}
                    />
                  </div>
                </div>
              )}

              {/* What's Included Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg tiny:rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="p-3 tiny:p-4 xxs:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900">
                  <h3 className="text-base tiny:text-lg font-semibold text-gray-900 dark:text-white">{t('course_detail.whats_included', "What's Included")}</h3>
                </div>
                <div className="p-3 tiny:p-4 xxs:p-4 sm:p-6">
                  <ul className="space-y-2 tiny:space-y-2.5 xxs:space-y-3">
                    <li className="flex items-center gap-1.5 tiny:gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 text-green-600 dark:text-green-400 flex-shrink-0" /> 
                      <span className="text-xs tiny:text-sm xxs:text-base">{t('course_detail.lifetime_access', 'Lifetime access')}</span>
                    </li>
                    <li className="flex items-center gap-1.5 tiny:gap-2 text-gray-700 dark:text-gray-300">
                      <Award className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 text-green-600 dark:text-green-400 flex-shrink-0" /> 
                      <span className="text-xs tiny:text-sm xxs:text-base">{t('course_detail.certificate_of_completion', 'Certificate of completion')}</span>
                    </li>
                    <li className="flex items-center gap-1.5 tiny:gap-2 text-gray-700 dark:text-gray-300">
                      <BookOpen className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 text-green-600 dark:text-green-400 flex-shrink-0" /> 
                      <span className="text-xs tiny:text-sm xxs:text-base">{t('course_detail.regular_course_updates', 'Regular course updates')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* WhatsApp Group Section */}
              {course.hasWhatsappGroup && (
                <div className="bg-white dark:bg-gray-800 rounded-lg tiny:rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                  <div className="p-3 tiny:p-4 xxs:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900">
                    <h3 className="text-base tiny:text-lg font-semibold text-gray-900 dark:text-white">{t('course_detail.community', 'Community')}</h3>
                  </div>
                  <div className="p-3 tiny:p-4 xxs:p-4 sm:p-6">
                    {!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased) && (
                      <div className="mb-3 tiny:mb-4 flex items-center gap-1.5 tiny:gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 tiny:p-2.5 xxs:p-3">
                        <Lock className="h-4 w-4 tiny:h-4.5 tiny:w-4.5 xxs:h-5 xxs:w-5 flex-shrink-0" />
                        <span className="text-xs tiny:text-sm font-medium">
                          {t('course_detail.whatsapp_locked', 'Purchase this course to access the WhatsApp community group')}
                        </span>
                      </div>
                    )}
                    <WhatsAppGroupButton
                      courseId={id || ''}
                      isEnrolled={!!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased)}
                      hasPaid={!!(purchaseStatus?.hasPurchased || courseData?.userHasPurchased)}
                      hasWhatsappGroup={!!course.hasWhatsappGroup}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;