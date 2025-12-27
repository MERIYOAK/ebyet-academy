import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Play, CheckCircle, Award, Download, BookOpen, ShoppingCart, Loader, Eye, Lock, X } from 'lucide-react';
import VideoPlaylist from '../components/VideoPlaylist';
import VideoProgressBar from '../components/VideoProgressBar';
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';
import { buildApiUrl } from '../config/environment';
import DRMVideoService from '../services/drmVideoService';
import { parseDurationToSeconds } from '../utils/durationFormatter';
import { useCourse } from '../hooks/useCourses';


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

  // Handle window resize for playlist visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) { // lg breakpoint - desktop
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

  // Fetch video data for the course from API
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id || !course) return;

      // Fetch from API only
      try {
        // Fetching course video data from API...
        
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
          console.log('⚠️ Could not fetch videos from API');
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
  }, [id, userToken, course, apiCourse]);

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-16 w-16 text-cyan-500 animate-spin mx-auto mb-6" />
          <p className="text-gray-300 text-lg font-medium">{t('course_detail.loading_course_details')}</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-cyan-500 mb-6">
            <BookOpen className="h-20 w-20 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{t('course_detail.course_not_found')}</h2>
          <p className="text-gray-400 mb-8">
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
  const currentVideo = courseData?.videos.find(v => v.id === currentVideoId);

  return (
    <div className="min-h-screen bg-gray-900 pt-14">
      {/* Top Navigation Bar - Removed playlist toggle */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            {/* Navigation bar - empty for now */}
          </div>
        </div>
      </div>

      {/* Course Header Banner */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            {/* Course Thumbnail */}
            <div className="w-full lg:w-80 flex-shrink-0">
              {course.thumbnailURL ? (
                <div className="relative group rounded-xl overflow-hidden border border-gray-700 shadow-xl">
                  <img
                    src={course.thumbnailURL}
                    alt={course.title}
                    className="w-full h-48 lg:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.category && (
                        <span className="bg-cyan-500/20 backdrop-blur-sm text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold border border-cyan-500/30">
                          {t(`categories.${course.category}`) || course.category}
                        </span>
                      )}
                      {course.level && (
                        <span className="bg-purple-500/20 backdrop-blur-sm text-purple-400 px-3 py-1 rounded-full text-xs font-semibold border border-purple-500/30 capitalize">
                          {course.level}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-48 lg:h-64 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
                  <BookOpen className="h-20 w-20 text-gray-500" />
                </div>
              )}
            </div>

            {/* Course Header Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 pb-2 sm:pb-3 md:pb-4 leading-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                {course.title}
              </h1>
              
              <p className="text-base sm:text-lg text-gray-300 mb-6 leading-relaxed">
                {course.description}
              </p>

              {/* Quick Stats Row */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-gray-300">{totalDuration}</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                  <BookOpen className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-gray-300">{totalVideos} {t('course_detail.lessons')}</span>
                </div>
              </div>

              {/* Tags */}
              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {course.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-800 text-gray-400 px-3 py-1 rounded-lg text-xs font-medium border border-gray-700 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Buy Button - Show if course is not purchased */}
              {(!purchaseStatus?.hasPurchased && !courseData?.userHasPurchased) && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-white">
                        ${course.price?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {t('course_detail.lifetime_access', 'Lifetime access')}
                    </p>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isPurchasing ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>{t('checkout_success.processing', 'Processing...')}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Video Player */}
          <div className="lg:col-span-8 space-y-8">
            {/* Video Player Section */}
            {(!courseData || courseData.videos.length === 0) ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                <div className="text-gray-400">
                  <BookOpen className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">{t('course_detail.loading_course_content')}</p>
                  <p className="text-sm">{t('course_detail.please_wait_loading_videos')}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl">
                {/* Video Player */}
                <div className="relative w-full" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
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
                          <div className="space-y-4 text-center px-4">
                            <Lock className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-lg font-semibold mb-2">{t('course_detail.video_locked')}</p>
                            <p className="text-sm mb-4">
                              {!userToken 
                                ? t('course_detail.sign_in_or_purchase')
                                : t('course_detail.purchase_to_access')
                              }
                            </p>
                            {!userToken ? (
                              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                  onClick={() => navigate('/login')}
                                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
                                >
                                  {t('course_detail.sign_in')}
                                </button>
                                <button
                                  onClick={handlePurchase}
                                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-semibold"
                                >
                                  {t('course_detail.purchase_course')}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={handlePurchase}
                                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
                              >
                                {t('course_detail.purchase_course')}
                              </button>
                            )}
                          </div>
                        ) : videoError ? (
                          <div className="space-y-4 text-center px-4">
                            <div className="text-red-400">
                              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <p className="text-lg font-semibold mb-2">{t('course_detail.video_error')}</p>
                              <p className="text-sm">{videoError}</p>
                            </div>
                            <button
                              onClick={() => window.location.reload()}
                              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
                            >
                              {t('course_detail.try_again')}
                            </button>
                          </div>
                        ) : (
                          <div className="text-center px-4">
                            {courseData.videos.every(v => v.locked) && !userToken ? (
                              <div className="space-y-4">
                                <Lock className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400" />
                                <p className="text-base sm:text-lg font-semibold text-gray-300">{t('course_detail.course_preview')}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                                  {t('course_detail.no_free_preview')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                  <button
                                    onClick={() => navigate('/login')}
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-all duration-200 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
                                  >
                                    {t('course_detail.sign_in')}
                                  </button>
                                  <button
                                    onClick={handlePurchase}
                                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors duration-200 font-semibold text-sm sm:text-base"
                                  >
                                    {t('course_detail.purchase_course')}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                                <p className="text-gray-300">{t('course_detail.loading_video')}</p>
                                <p className="text-sm text-gray-400 mt-2">
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
                <div className="bg-gray-900 px-4 sm:px-6 py-4 border-t border-gray-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white font-semibold text-base sm:text-lg mb-2 line-clamp-2">
                        {currentVideo?.title || t('course_detail.select_a_video')}
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentVideo?.isFreePreview && !currentVideo?.locked && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-600 text-white">
                            🔓 {t('course_detail.free_preview')}
                          </span>
                        )}
                        {currentVideo?.completed && (
                          <div className="flex items-center space-x-1 text-green-400 text-xs sm:text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span>{t('course_detail.completed')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Playlist toggle button in video info section */}
                    <button
                      onClick={() => setShowPlaylist(!showPlaylist)}
                      className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-800 flex-shrink-0"
                    >
                      <BookOpen className="h-5 w-5" />
                      <span className="text-sm">{showPlaylist ? t('course_detail.hide_playlist') : t('course_detail.show_playlist')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Playlist Popup - Above video on mobile */}
            {showPlaylist && courseData && courseData.videos.length > 0 && (
              <>
                {/* Backdrop */}
                <div 
                  className="lg:hidden fixed inset-0 bg-black/60 z-40"
                  onClick={() => setShowPlaylist(false)}
                />
                {/* Playlist Popup */}
                <div className="lg:hidden fixed inset-x-4 top-24 z-50 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-h-[70vh] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
                    <h3 className="text-lg font-semibold text-white">{t('course_detail.course_curriculum', 'Course Curriculum')}</h3>
                    <button
                      onClick={() => setShowPlaylist(false)}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
                    <VideoPlaylist
                      videos={courseData.videos}
                      currentVideoId={currentVideoId}
                      onVideoSelect={(videoId) => {
                        setCurrentVideoId(videoId);
                        setShowPlaylist(false); // Close on mobile after selection
                      }}
                      courseProgress={courseData.courseProgress}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Playlist Sidebar (Desktop) */}
          <div className="hidden lg:block lg:col-span-4">
            {courseData && courseData.videos.length > 0 && showPlaylist && (
              <div className="sticky top-24">
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{t('course_detail.course_curriculum', 'Course Curriculum')}</h3>
                  </div>
                  <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
                    <VideoPlaylist
                      videos={courseData.videos}
                      currentVideoId={currentVideoId}
                      onVideoSelect={setCurrentVideoId}
                      courseProgress={courseData.courseProgress}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;