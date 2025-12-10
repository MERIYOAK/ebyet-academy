import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Play, CheckCircle, Award, Download, BookOpen, ShoppingCart, Loader, ArrowLeft, Eye, Lock } from 'lucide-react';
import VideoPlaylist from '../components/VideoPlaylist';
import VideoProgressBar from '../components/VideoProgressBar';
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';
import { buildApiUrl } from '../config/environment';
import DRMVideoService from '../services/drmVideoService';

interface Video {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  completed?: boolean;
  locked?: boolean;
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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);

  // Video player states
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(true); // Show playlist by default on desktop
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentVideoPosition, setCurrentVideoPosition] = useState(0);
  const [currentVideoPercentage, setCurrentVideoPercentage] = useState(0);
  const [totalCourseDurationSeconds, setTotalCourseDurationSeconds] = useState<number>(0);
  const [durationById, setDurationById] = useState<Record<string, number>>({});

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    setUserToken(token);
  }, []);

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

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetching course details...

        const response = await fetch(buildApiUrl(`/api/courses/${id}`));
        
        if (!response.ok) {
          throw new Error(t('course_detail.course_not_found'));
        }

        const data = await response.json();
        
        // Handle both enhanced and legacy response formats
        let courseData;
        if (data.success && data.data && data.data.course) {
          // Enhanced controller response format
          courseData = data.data.course;
          // Course data fetched (enhanced format)
        } else if (data._id) {
          // Legacy controller response format
          courseData = data;
          // Course data fetched (legacy format)
        } else {
          throw new Error('Invalid course data format');
        }
        
        setCourse(courseData);

      } catch (error) {
        console.error('❌ Error fetching course:', error);
        setError(error instanceof Error ? error.message : t('course_detail.failed_to_load_course'));
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id]);

  // Fetch video data for the course
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return;

      try {
        // Fetching course video data...
        
        // Try to fetch videos with authentication first
        let videosResponse;
        let videosResult;
        
        if (userToken) {
          // Authenticated user - fetch with access control
          videosResponse = await fetch(buildApiUrl(`/api/videos/course/${id}/version/1`), {
            headers: { 'Authorization': `Bearer ${userToken}` }
          });
        } else {
          // Public user - fetch without authentication to check for free previews
          videosResponse = await fetch(buildApiUrl(`/api/videos/course/${id}/version/1`));
        }

        if (!videosResponse.ok) {
          console.log('⚠️ Could not fetch videos, continuing without video player');
          console.log(`   Status: ${videosResponse.status}`);
          console.log(`   Status Text: ${videosResponse.statusText}`);
          const errorText = await videosResponse.text();
          console.log(`   Error: ${errorText}`);
          return;
        }

        videosResult = await videosResponse.json();
        console.log('📊 Videos API response:', videosResult);
        
        const videosWithAccess = videosResult.data.videos;
        const userHasPurchased = videosResult.data.userHasPurchased || false;
        
        console.log(`📊 Found ${videosWithAccess.length} videos with access control`);
        console.log(`📊 User has purchased: ${userHasPurchased}`);
        
        // Debug: Log each video's access details
        videosWithAccess.forEach((video: any, index: number) => {
          console.log(`📊 Video ${index + 1} "${video.title}":`, {
            hasAccess: video.hasAccess,
            isFreePreview: video.isFreePreview,
            isLocked: video.isLocked,
            lockReason: video.lockReason,
            hasVideoUrl: !!video.videoUrl,
            videoUrlLength: video.videoUrl?.length || 0
          });
        });

        // Check if there are any free preview videos
        const hasFreePreviews = videosWithAccess.some((video: any) => video.isFreePreview);
        
        // Transform videos to match VideoPlayerPage format
        // Build duration map in seconds; server sends numeric seconds
        const durationMap: Record<string, number> = {};
        const transformedVideos = videosWithAccess.map((video: any) => {
          // Use the backend's access control decision
          let isAccessible = video.hasAccess;
          let isLocked = !video.hasAccess;
          
          // The backend already handles access control correctly:
          // - For purchased users: hasAccess = true for all videos
          // - For non-purchased users: hasAccess = true only for free preview videos
          // - For public users: hasAccess = true only for free preview videos
          
                     // Video access details logged

          const durationSeconds: number = typeof video.duration === 'number' ? video.duration : 0;
          durationMap[video._id] = durationSeconds;

          return {
            id: video._id,
            title: video.title,
            duration: formatDuration(durationSeconds),
            videoUrl: isAccessible ? (video.videoUrl || '') : '',
            completed: video.progress?.isCompleted || false,
            locked: isLocked,
            progress: video.progress || {
              watchedDuration: 0,
              totalDuration: durationSeconds || 0,
              watchedPercentage: 0,
              completionPercentage: 0,
              isCompleted: false
            },
            isFreePreview: video.isFreePreview,
            requiresPurchase: isLocked
          };
        });

        // Save duration map and total duration in seconds for accurate display
        setDurationById(durationMap);
        const totalSecs = Object.values(durationMap).reduce((a, b) => a + (b || 0), 0);
        setTotalCourseDurationSeconds(totalSecs);

        const courseDataObj: CourseData = {
          title: course?.title || 'Course',
          videos: transformedVideos,
          userHasPurchased: userHasPurchased,
          overallProgress: {
            totalVideos: transformedVideos.length,
            completedVideos: transformedVideos.filter((v: Video) => v.completed).length,
            totalProgress: transformedVideos.length > 0 
              ? Math.round((transformedVideos.filter((v: Video) => v.completed).length / transformedVideos.length) * 100)
              : 0,
            lastWatchedVideo: null,
            lastWatchedPosition: 0
          }
        };

        setCourseData(courseDataObj);
        // Course data set successfully
        
        // Set the first accessible video as current, or first video if all are locked
        const firstAccessibleVideo = transformedVideos.find((v: Video) => !v.locked);
        if (firstAccessibleVideo) {
          setCurrentVideoId(firstAccessibleVideo.id);
          // Set current video to first accessible video
        } else if (transformedVideos.length > 0) {
          setCurrentVideoId(transformedVideos[0].id);
          // Set current video to first video
        }

        // Course video data fetched successfully

      } catch (error) {
        console.error('❌ Error fetching course video data:', error);
        // Don't set error here as the page should still work without video player
      }
    };

    fetchCourseData();
  }, [id, userToken, course]);

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
          setPurchaseStatus(data);
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

  // Video player event handlers
  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    // Auto-play next video logic could be added here
  };

  const handleVideoError = (error: any) => {
    console.error('❌ Video error:', error);
    setVideoError('Video playback error. Please try again.');
  };

  const handleVideoSelect = (newVideoId: string) => {
    const newVideo = courseData?.videos.find(v => v.id === newVideoId);
    if (newVideo?.locked) {
      // Video is locked
      if (!userToken) {
        // Public user - show sign in/purchase options
        setError('This video requires course purchase. Please sign in or purchase the course.');
      } else {
        // Authenticated user - redirect to checkout
        setError('This video requires course purchase. Redirecting to checkout...');
        setTimeout(() => {
          navigate(`/course/${id}/checkout`);
        }, 2000);
      }
      return;
    }
    
    setCurrentVideoId(newVideoId);
    setVideoError(null);
    setRetryCount(0);
    setError(null); // Clear any previous error messages
  };

  const handlePurchase = async () => {
    if (!userToken) {
      navigate('/login');
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

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '0:00';
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (videos?: Array<{ duration?: number }>) => {
    if (!videos) return '0:00';
    const totalSeconds = videos.reduce((acc, video) => acc + (video.duration || 0), 0);
    return formatDuration(totalSeconds);
  };

  const getFormattedDurationById = (videoId: string, fallbackSeconds?: number) => {
    const secs = durationById[videoId] ?? (fallbackSeconds || 0);
    return formatDuration(secs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-16 w-16 text-red-600 animate-spin mx-auto mb-6" />
          <p className="text-gray-600 text-lg font-medium">{t('course_detail.loading_course_details')}</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-600 mb-6">
            <BookOpen className="h-20 w-20 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('course_detail.course_not_found')}</h2>
          <p className="text-gray-600 mb-8">
            {error || t('course_detail.course_not_found_message')}
          </p>
          <Link
            to="/courses"
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
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
  const currentVideo = courseData?.videos.find(v => v.id === currentVideoId);

  return (
    <div className="min-h-screen bg-gray-50 pt-14 ">
      {/* Video Player Section */}
      {(!courseData || courseData.videos.length === 0) ? (
        <div className="bg-gray-900 p-8 text-center">
          <div className="text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">{t('course_detail.loading_course_content')}</p>
            <p className="text-sm">{t('course_detail.please_wait_loading_videos')}</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 flex flex-col">
          {/* Professional Header */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/courses')}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>{t('course_detail.back_to_courses')}</span>
                </button>
                <div className="hidden md:block h-6 w-px bg-gray-600" />
                <h1 className="hidden md:block text-white font-semibold truncate">
                  {course.title}
                </h1>
              </div>
              
              <div className="flex items-center">
                {/* Desktop Playlist Toggle */}
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="hidden md:flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-700"
                >
                  <BookOpen className="h-5 w-5" />
                  <span className="text-sm">{showPlaylist ? t('course_detail.hide_playlist') : t('course_detail.show_playlist')}</span>
                </button>
                
                {/* Mobile Playlist Toggle */}
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className="md:hidden flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Playlist</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex">
            {/* Video Player Section */}
            <div className="flex-1 flex flex-col">
              {/* Enhanced Video Player */}
              <div className="flex-1" style={{ minHeight: '200px', height: '50vh' }}>
                <div className="w-full h-full bg-black">
                  {currentVideo?.videoUrl && 
                   currentVideo.videoUrl.trim() !== '' && 
                   currentVideo.videoUrl !== window.location.href &&
                   currentVideo.videoUrl !== 'undefined' && 
                   !currentVideo.locked ? (
                    <EnhancedVideoPlayer
                      src={currentVideo.videoUrl}
                      title={courseData?.title}
                      userId={localStorage.getItem('userId') || undefined}
                      videoId={currentVideoId}
                      courseId={id}
                      playing={isPlaying}
                      playbackRate={playbackRate}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                      onEnded={handleVideoEnd}
                      onError={handleVideoError}
                      onReady={() => setPlayerReady(true)}
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
                        // Progress update logic would go here
                      }}
                      onPlaybackRateChange={setPlaybackRate}
                      onControlsToggle={setControlsVisible}
                      className="w-full h-full"
                      initialTime={currentVideo?.progress?.lastPosition || 0}
                      drmEnabled={currentVideo?.drm?.enabled || false}
                      watermarkData={currentVideo?.drm?.watermarkData}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      {currentVideo?.locked ? (
                        // Locked video state
                        <div className="space-y-4 text-center">
                          <div className="text-gray-400">
                            <Lock className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-lg font-semibold mb-2">{t('course_detail.video_locked')}</p>
                            <p className="text-sm mb-4">
                              {!userToken 
                                ? t('course_detail.sign_in_or_purchase')
                                : t('course_detail.purchase_to_access')
                              }
                            </p>
                            {!userToken ? (
                              <div className="space-y-2">
                                <button
                                  onClick={() => navigate('/login')}
                                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold mr-2"
                                >
                                  {t('course_detail.sign_in')}
                                </button>
                                <button
                                  onClick={handlePurchase}
                                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold"
                                >
                                  {t('course_detail.purchase_course')}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={handlePurchase}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold"
                              >
                                {t('course_detail.purchase_course')}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : videoError ? (
                        // Error state with retry functionality
                        <div className="space-y-4 text-center">
                          <div className="text-red-400">
                            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-lg font-semibold mb-2">{t('course_detail.video_error')}</p>
                            <p className="text-sm">{videoError}</p>
                          </div>
                          
                          <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold"
                          >
                            {t('course_detail.try_again')}
                          </button>
                        </div>
                      ) : (
                        // Loading state or no video selected
                        <div className="text-center">
                          {courseData.videos.every(v => v.locked) && !userToken ? (
                            // All videos are locked for public user
                            <div className="space-y-4 px-4 sm:px-6">
                              <Lock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400" />
                              <p className="text-base sm:text-lg font-semibold text-gray-300 text-center">{t('course_detail.course_preview')}</p>
                              <p className="text-xs sm:text-sm text-gray-500 mb-4 text-center px-2">
                                {t('course_detail.no_free_preview')}
                              </p>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                                <button
                                  onClick={() => navigate('/login')}
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors duration-200 font-semibold text-sm sm:text-base"
                                >
                                  {t('course_detail.sign_in')}
                                </button>
                                <button
                                  onClick={handlePurchase}
                                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors duration-200 font-semibold text-sm sm:text-base"
                                >
                                  {t('course_detail.purchase_course')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Loading state
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                              <p>{t('course_detail.loading_video')}</p>
                              <p className="text-sm mt-2">
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

              {/* Video Info Section */}
              <div className="bg-gray-800 px-3 sm:px-4 py-3 sm:py-4">
                <h2 className="text-white font-semibold text-sm sm:text-lg mb-2 line-clamp-2">
                  {currentVideo?.title || t('course_detail.select_a_video')}
                  {currentVideo?.isFreePreview && !currentVideo?.locked && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-600 text-white">
                      🔓 {t('course_detail.free_preview')}
                    </span>
                  )}
                </h2>
                {currentVideo?.completed && (
                  <div className="flex items-center space-x-1 text-green-400 text-xs sm:text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t('course_detail.completed')}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Playlist Sidebar */}
            {showPlaylist && (
              <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col" style={{ height: '100vh' }}>
                {courseData && courseData.videos ? (
                  <VideoPlaylist
                    videos={courseData.videos}
                    currentVideoId={currentVideoId}
                    onVideoSelect={handleVideoSelect}
                    courseProgress={courseData.overallProgress}
                  />
                ) : (
                  <div className="p-4 flex-1 overflow-y-auto">
                    <div className="text-white text-sm mb-4">{t('course_detail.course_content')}</div>
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
              <div className="bg-white w-80 ml-auto h-full overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <button
                    onClick={() => setShowPlaylist(false)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    {t('course_detail.close_playlist')}
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
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
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
      )}

      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Course Info */}
            <div className="lg:col-span-2">
              {/* Course Badges */}
              <div className="flex items-center space-x-3 mb-6">
                {course.category && (
                  <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold border border-white/30 hover:bg-white/30 transition-all duration-200 cursor-pointer">
                    {course.category}
                  </span>
                )}
                {course.level && (
                  <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold border border-white/30 hover:bg-white/30 transition-all duration-200 cursor-pointer">
                    {course.level}
                  </span>
                )}
              </div>
              
              {/* Course Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {course.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-white/10 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium border border-white/20 hover:bg-white/20 transition-all duration-200 cursor-pointer"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Course Title */}
              <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight bg-gradient-to-r from-white to-red-100 bg-clip-text text-transparent">
                {course.title}
              </h1>
              
              {/* Course Description */}
              <p className="text-xl text-red-100 mb-10 leading-relaxed max-w-3xl">
                {course.description}
              </p>
              
              {/* Course Stats */}
              <div className="flex flex-wrap items-center gap-8 mb-10">

                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
                  <Clock className="h-6 w-6 text-red-200" />
                  <div>
                    <span className="font-bold text-lg">{totalDuration}</span>
                    <span className="text-red-200 text-sm ml-2">{t('course_detail.total')}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
                  <BookOpen className="h-6 w-6 text-red-200" />
                  <div>
                    <span className="font-bold text-lg">{totalVideos}</span>
                    <span className="text-red-200 text-sm ml-2">{t('course_detail.lessons')}</span>
                  </div>
                </div>
              </div>
              
              {/* Instructor Section */}
              <div className="flex items-center space-x-6 bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                <div>
                  <p className="text-red-200 text-sm font-medium">{t('course_detail.created_by')}</p>
                  <p className="font-bold text-xl text-white">{course.instructor || 'QENDIEL Academy'}</p>
                  <p className="text-red-200 text-sm">
                    {t('course_detail.last_updated')} {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : t('course_detail.recently')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced Purchase Card */}
            <div className="lg:col-span-1">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 sticky top-8 border border-white/20">
                {/* Course Thumbnail */}
                {course.thumbnailURL ? (
                  <div className="relative mb-6 group">
                    <img
                      src={course.thumbnailURL}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-2xl group-hover:bg-black/10 transition-colors duration-300"></div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl mb-6 flex items-center justify-center shadow-lg">
                    <BookOpen className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                
                {/* Price Section */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-4 mb-3">
                    <span className="text-5xl font-bold text-gray-800">${course.price}</span>
                    {course.price > 0 && (
                      <span className="text-2xl text-gray-500 line-through">${Math.round(course.price * 1.5)}</span>
                    )}
                  </div>
                  {course.price > 0 && (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold inline-block">
                      Save ${Math.round(course.price * 0.5)}!
                    </div>
                  )}
                </div>
                
                {/* Purchase Button */}
                {purchaseStatus?.hasPurchased ? (
                  <div className="text-center mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-2xl flex items-center justify-center space-x-3 shadow-lg">
                      <CheckCircle className="h-6 w-6" />
                      <span className="font-bold text-lg">{t('course_detail.course_purchased')}</span>
                    </div>
                    <button
                      onClick={() => navigate(`/course/${id}/watch/${courseData?.videos[0]?.id}`)}
                      className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                    >
                      <Play className="h-5 w-5" />
                      <span>{t('course_detail.start_learning')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    <button
                      onClick={handlePurchase}
                      disabled={isPurchasing}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 disabled:transform-none"
                    >
                      {isPurchasing ? (
                        <>
                          <Loader className="h-6 w-6 animate-spin" />
                          <span className="text-lg">{t('course_detail.processing')}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-6 w-6" />
                          <span className="text-lg">{t('course_detail.enroll_now')}</span>
                        </>
                      )}
                    </button>
                    
                    {!userToken && (
                      <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 font-semibold py-3 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <span>{t('course_detail.sign_in_to_enroll')}</span>
                      </button>
                    )}
                  </div>
                )}
                
                {/* Guarantee */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-2 text-gray-600 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{t('course_detail.secure_checkout')}</span>
                  </div>
                </div>
                
                {/* Enhanced Course Features */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 mb-4 text-center">{t('course_detail.whats_included')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <Clock className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700">{totalDuration} {t('course_detail.on_demand_video')}</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <Award className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700">{t('course_detail.certificate_of_completion')}</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <Download className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700">{t('course_detail.downloadable_resources')}</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <Users className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-700">{t('course_detail.lifetime_access')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* Course Curriculum */}
            <section>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">{t('course_detail.course_curriculum')}</h2>
              {course.videos && course.videos.length > 0 ? (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">{t('course_detail.all_lessons')}</h3>
                    <p className="text-sm text-gray-600">{totalVideos} {t('course_detail.lessons')} • {totalDuration}</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {course.videos.map((video, index) => (
                      <div key={video._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {purchaseStatus?.hasPurchased ? (
                              <Play className="h-5 w-5 text-red-600" />
                            ) : (
                              <Lock className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {index + 1}. {video.title}
                            </h4>
                            {video.description && (
                              <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{getFormattedDurationById(video._id, video.duration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('course_detail.no_lessons_available')}</h3>
                  <p className="text-gray-600">{t('course_detail.no_lessons_message')}</p>
                </div>
              )}
            </section>

            {/* Course Description */}
            <section>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">{t('course_detail.about_this_course')}</h2>
              <div className="bg-white rounded-lg shadow-lg p-8">
                <p className="text-gray-700 leading-relaxed text-lg">
                  {course.description}
                </p>
              </div>
            </section>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Course Stats */}
            <section className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6">{t('course_detail.course_statistics')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('course_detail.total_duration')}</span>
                  <span className="font-semibold">{totalDuration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('course_detail.total_lessons')}</span>
                  <span className="font-semibold">{totalVideos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('course_detail.students_enrolled')}</span>
                  <span className="font-semibold">{course.totalEnrollments || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('course_detail.last_updated')}</span>
                  <span className="font-semibold">
                    {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : t('course_detail.recently')}
                  </span>
                </div>
              </div>
            </section>

            {/* Course Features */}
            <section className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">{t('course_detail.whats_included')}</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">{t('course_detail.lifetime_access_content')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">{t('course_detail.certificate_of_completion')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">{t('course_detail.regular_course_updates')}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-gray-700">{t('course_detail.community_qa_support')}</span>
                </div>
              </div>
            </section>

            {/* Community Section - Only show if course has WhatsApp group */}
            {course?.hasWhatsappGroup && (
              <section className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border border-green-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{t('course_detail.join_exclusive_community')}</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    🎉 <strong>{t('course_detail.bonus_whatsapp_access')}</strong>
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {t('course_detail.what_youll_get_community')}
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span><strong>{t('course_detail.direct_access_instructors')}</strong></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span><strong>{t('course_detail.connect_fellow_students')}</strong></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span><strong>{t('course_detail.exclusive_tips_updates')}</strong></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span><strong>{t('course_detail.project_feedback_reviews')}</strong></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span><strong>{t('course_detail.job_opportunities_referrals')}</strong></span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-green-100 rounded-lg p-4 border border-green-300">
                    <p className="text-green-800 font-medium text-sm">
                      💡 <strong>{t('course_detail.pro_tip_success')}</strong>
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;