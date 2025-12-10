import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link } from 'react-router-dom';

import { ChevronLeft, BookOpen, Clock, Edit, Trash2, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { formatDuration } from '../utils/durationFormatter';

interface Video {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  s3Key?: string;
  order?: number;
  uploadedBy?: string;
  createdAt?: string;
}

interface CourseData {
  title: string;
  videos: Video[];
}

const AdminVideoPlayerPage = () => {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const [currentVideoId, setCurrentVideoId] = useState(videoId || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);


  // Fetch course and video data
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching course data for course ID:', courseId);
        console.log('Current video ID:', videoId);
        
        // Validate videoId parameter
        if (!videoId || typeof videoId !== 'string') {
          throw new Error('Invalid video ID provided');
        }
        
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
          throw new Error('Admin token not found');
        }
        
        // Fetch course details
        const courseResponse = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!courseResponse.ok) {
          throw new Error('Failed to fetch course data');
        }
        
        const courseResult = await courseResponse.json();
        console.log('Course data received:', courseResult);
        
        const course = courseResult.data.course;
        const videos = course.videos || course.currentVersion?.videos || [];
        
        // Fetch video details for each video ID
        const videoPromises = videos.map(async (video: any) => {
          let videoIdString: string = '';
          try {
            // Ensure videoId is a string
            videoIdString = typeof video === 'string' ? video : video._id || video.id;
            
            if (!videoIdString || typeof videoIdString !== 'string') {
              console.error('Invalid video ID:', video);
              return null;
            }
            
            console.log('Fetching video with ID:', videoIdString);
            
            const videoResponse = await fetch(buildApiUrl(`/api/videos/${videoIdString}`), {
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (videoResponse.ok) {
              const videoResult = await videoResponse.json();
              console.log(`Video ${videoIdString} data:`, videoResult);
              
              const videoData = videoResult.data.video;
              
              // Detailed URL logging
              console.log('🔗 [BROWSER] Video data received for:', videoData.title);
              // Video URL and S3 key received from server
              
              if (videoData.videoUrl) {
                // Presigned URL received successfully
                try {
                  const url = new URL(videoData.videoUrl);
                  console.log('🌐 [BROWSER] URL domain:', url.hostname);
                  console.log('📊 [BROWSER] URL query params count:', url.searchParams.size);
                  
                  // Check if URL contains AWS signature
                  if (videoData.videoUrl.includes('X-Amz-Signature')) {
                    // AWS signature detected - URL is presigned
                  } else {
                    // No AWS signature found - URL might not be presigned
                  }
                } catch (urlError) {
                  console.error('❌ [BROWSER] Error parsing URL:', urlError);
                }
              } else {
                console.log('❌ [BROWSER] No video URL received from server');
              }
              
              return {
                id: videoData.id,
                title: videoData.title,
                duration: (() => {
                  // Handle both old string format and new number format
                  const duration = videoData.duration;
                  let displayDuration = '00:00';
                  
                  if (typeof duration === 'number') {
                    // Convert seconds to MM:SS format
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    displayDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  } else if (typeof duration === 'string' && duration) {
                    displayDuration = duration;
                  }
                  
                  return displayDuration;
                })(),
                videoUrl: videoData.videoUrl || '',
                s3Key: videoData.s3Key,
                order: videoData.order,
                uploadedBy: videoData.uploadedBy,
                createdAt: videoData.createdAt
              };
            } else {
              console.error(`Failed to fetch video ${videoIdString}:`, videoResponse.status);
              return {
                id: videoIdString,
                title: `Video ${videoIdString}`,
                duration: '00:00',
                videoUrl: '',
                s3Key: '',
                order: 0,
                uploadedBy: 'Unknown',
                createdAt: new Date().toISOString()
              };
            }
          } catch (error) {
            console.error(`Error fetching video ${videoIdString}:`, error);
            return {
              id: videoIdString || 'unknown',
              title: `Video ${videoIdString || 'Unknown'}`,
              duration: '00:00',
              videoUrl: '',
              s3Key: '',
              order: 0,
              uploadedBy: 'Unknown',
              createdAt: new Date().toISOString()
            };
          }
        });
        
        const videoDetails = await Promise.all(videoPromises);
        console.log('All video details:', videoDetails);
        
        setCourseData({
          title: course.title,
          videos: videoDetails.filter(v => v !== null) as Video[] // Filter out nulls
        });
        
        // Set current video if not already set
        if (!currentVideoId && videoDetails.length > 0) {
          setCurrentVideoId(videoDetails[0].id);
        }
        
      } catch (error) {
        console.error('Error fetching course data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  useEffect(() => {
    if (videoId) {
      setCurrentVideoId(videoId);
    }
  }, [videoId]);

  const currentVideo = courseData?.videos.find(v => v.id === currentVideoId);

  // Using the centralized formatDuration utility

  // Handle playback rate change
  const handlePlaybackRateChange = (newRate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
      setPlaybackRate(newRate);
      console.log('🎚️ Playback rate changed to:', newRate);
    }
  };

  // Apply playback rate when it changes
  useEffect(() => {
    if (videoRef.current && playerReady) {
      videoRef.current.playbackRate = playbackRate;
      console.log('🎚️ Applied playback rate:', playbackRate);
    }
  }, [playbackRate, playerReady]);

  // Handle video selection
  const handleVideoSelect = (newVideoId: string) => {
    setCurrentVideoId(newVideoId);
    setIsPlaying(false);
    setPlayerReady(false);
    setCurrentTime(0);
    setDuration(0);
    window.history.pushState(null, '', `/admin/courses/${courseId}/videos/${newVideoId}`);
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };


  // Toggle fullscreen
  const toggleFullscreen = () => {
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen?.() || 
        (videoContainer as any).webkitRequestFullscreen?.() || 
        (videoContainer as any).msRequestFullscreen?.();
      } else {
        document.exitFullscreen?.() || 
        (document as any).webkitExitFullscreen?.() || 
        (document as any).msExitFullscreen?.();
      }
    }
  };

  // Handle progress bar click for video seeking
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const progressWidth = rect.width;
      const clickPercentage = clickX / progressWidth;
      const newTime = clickPercentage * duration;
      
      // Update video current time
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      
      console.log('🎯 Seeking to:', newTime.toFixed(2), 'seconds (', (clickPercentage * 100).toFixed(1), '%)');
    }
  };

  // Video element ref
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Add protection against right-click and keyboard shortcuts
  useEffect(() => {
    const preventDownload = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent common download shortcuts
      const downloadShortcuts = [
        'Ctrl+S', 'Cmd+S', // Save
        'Ctrl+Shift+S', 'Cmd+Shift+S', // Save As
        'F12', // Developer tools
        'Ctrl+Shift+I', 'Cmd+Option+I', // Developer tools
        'Ctrl+U', 'Cmd+U', // View source
        'Ctrl+Shift+C', 'Cmd+Shift+C', // Inspect element
      ];

      const keyCombo = [
        e.ctrlKey && 'Ctrl',
        e.metaKey && 'Cmd',
        e.shiftKey && 'Shift',
        e.key.toUpperCase()
      ].filter(Boolean).join('+');

      if (downloadShortcuts.includes(keyCombo)) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚫 Blocked download shortcut:', keyCombo);
        return false;
      }
    };

    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Apply protections to video element
    const video = videoRef.current;
    if (video) {
      // Prevent right-click context menu
      video.addEventListener('contextmenu', preventContextMenu);
      
      // Prevent drag and drop
      video.addEventListener('dragstart', preventDrag);
      video.addEventListener('drop', preventDrag);
      
      // Prevent text selection
      video.addEventListener('selectstart', preventSelection);
      video.addEventListener('mousedown', preventSelection);
      
      // Prevent download events
      video.addEventListener('beforeunload', preventDownload);
      
      // Add CSS protections
      video.style.userSelect = 'none';
      video.style.webkitUserSelect = 'none';
      (video.style as any).mozUserSelect = 'none';
      (video.style as any).msUserSelect = 'none';
      video.style.pointerEvents = 'auto';
      
      // Disable video download attributes
      video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
      video.setAttribute('disablePictureInPicture', 'true');
      video.setAttribute('disableRemotePlayback', 'true');
    }

    // Apply protections to document
    document.addEventListener('keydown', preventKeyboardShortcuts);
    
    // Prevent screenshots (CSS-based)
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';

    return () => {
      // Cleanup event listeners
      if (video) {
        video.removeEventListener('contextmenu', preventContextMenu);
        video.removeEventListener('dragstart', preventDrag);
        video.removeEventListener('drop', preventDrag);
        video.removeEventListener('selectstart', preventSelection);
        video.removeEventListener('mousedown', preventSelection);
        video.removeEventListener('beforeunload', preventDownload);
      }
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);

  // Handle play/pause toggle
  const handlePlayPause = () => {
    console.log('🎮 Play/Pause button clicked');
    console.log('🎮 Current player ready state:', playerReady);
    console.log('🎮 Current playing state:', isPlaying);
    
    if (videoRef.current && playerReady) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.error('❌ Failed to play video:', error);
          setError(`Play failed: ${error.message}`);
        });
      }
    } else {
      console.log('❌ Player not ready yet, cannot play');
    }
  };

  // Handle manual play button click
  const handleManualPlayClick = () => {
    console.log('🎮 Manual play button clicked');
    console.log('🎮 Current player ready state:', playerReady);
    
    if (videoRef.current && playerReady) {
      videoRef.current.play().catch(error => {
        console.error('❌ Failed to play video:', error);
        setError(`Play failed: ${error.message}`);
      });
    } else {
      console.log('❌ Player not ready, cannot play');
    }
  };



  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when video container is focused or video is playing
      if (e.target === document.body || document.querySelector('.video-container')?.contains(e.target as Node)) {
        switch (e.code) {
          case 'Space':
            e.preventDefault();
            handlePlayPause();
            break;
          case 'KeyM':
            e.preventDefault();
            toggleMute();
            break;
          case 'KeyF':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            // Seek backward 10 seconds (would need ReactPlayer ref for this)
            console.log('Seek backward');
            break;
          case 'ArrowRight':
            e.preventDefault();
            // Seek forward 10 seconds (would need ReactPlayer ref for this)
            console.log('Seek forward');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [playerReady, isPlaying, duration, currentVideo]);

  // Handle mouse events for controls visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const showControlsOverlay = () => {
    setControlsVisible(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 3000);
    setControlsTimeout(timeout);
  };

  const hideControls = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    if (isPlaying) {
      const timeout = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
      setControlsTimeout(timeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [controlsTimeout]);

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

  if (error || !courseData || !currentVideo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Video not found</h2>
          <p className="text-gray-400 mb-6">{error || 'The video you are looking for does not exist.'}</p>
          <Link
            to="/admin/courses"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
          >
            Back to Admin Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col pt-16">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link
              to={`/admin/courses/${courseId}`}
              className="flex items-center space-x-1 sm:space-x-2 text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Back to Course</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <div className="hidden md:block h-6 w-px bg-gray-600" />
            <h1 className="hidden md:block text-white font-semibold truncate">
              {courseData.title} - Admin View
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="md:hidden flex items-center space-x-1 sm:space-x-2 text-gray-300 hover:text-white transition-colors duration-200 text-sm"
            >
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Playlist</span>
              <span className="sm:hidden">List</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Player Section */}
        <div className="flex-1 flex flex-col">
          {/* Player */}
          <div 
            className="relative bg-black video-container w-full" 
            style={{ aspectRatio: '16/9' }}
            onMouseMove={showControlsOverlay}
            onMouseLeave={hideControls}
            onMouseEnter={showControlsOverlay}
          >
            {currentVideo && (currentVideo.videoUrl || currentVideo.s3Key) ? (
              <>
                {/* Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="text-white/10 text-2xl sm:text-4xl lg:text-6xl font-bold transform -rotate-45 select-none">
                    {courseData?.title || 'PROTECTED'}
                  </div>
                </div>

                {/* Native HTML5 Video Player */}
                <video
                  ref={videoRef}
                  src={currentVideo.videoUrl || ''}
                  className="w-full h-full object-contain"
                  preload="metadata"
                  crossOrigin="anonymous"
                  muted={isMuted}
                  style={{
                    // Additional CSS protections
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'auto',
                    // Prevent screenshots (CSS-based protection)
                    WebkitFilter: 'none',
                    filter: 'none',
                  }}
                  onLoadedData={() => {
                    if (!playerReady) {
                      console.log('✅ Video element ready');
                      // Video URL available
                      setPlayerReady(true);
                    }
                  }}
                  onPlay={() => {
                    console.log('🎬 Video started playing');
                    // Current video URL available
                    setIsPlaying(true);
                  }}
                  onPause={() => {
                    console.log('⏸️ Video paused');
                    setIsPlaying(false);
                  }}
                  onEnded={() => {
                    console.log('🏁 Video ended - pausing and resetting to beginning');
                    setIsPlaying(false);
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.target as HTMLVideoElement;
                    setCurrentTime(video.currentTime);
                  }}
                  onLoadedMetadata={(e) => {
                    const video = e.target as HTMLVideoElement;
                    console.log('⏱️ Duration set:', video.duration);
                    setDuration(video.duration);
                    
                    // Also update playback rate when video loads
                    if (playbackRate !== 1) {
                      video.playbackRate = playbackRate;
                    }
                  }}
                  onError={(e) => {
                    const video = e.target as HTMLVideoElement;
                    console.error('❌ Video error:', video.error);
                    console.error('❌ Video URL:', currentVideo.videoUrl);
                    console.error('❌ Error code:', video.error?.code);
                    console.error('❌ Error message:', video.error?.message);
                    
                    let errorMessage = 'Video playback error';
                    let debugInfo = '';
                    
                    if (video.error) {
                      debugInfo = `Code: ${video.error.code}, Message: ${video.error.message}`;
                      
                      switch (video.error.code) {
                        case MediaError.MEDIA_ERR_ABORTED:
                          errorMessage = 'Video playback was aborted.';
                          break;
                        case MediaError.MEDIA_ERR_NETWORK:
                          errorMessage = 'Network error occurred while loading video.';
                          break;
                        case MediaError.MEDIA_ERR_DECODE:
                          errorMessage = 'Video file is corrupted or has unsupported encoding.';
                          break;
                        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                          errorMessage = 'Video format not supported. Please upload MP4 with H.264 video and AAC audio';
                          break;
                        default:
                          errorMessage = 'Unknown video playback error.';
                      }
                    }
                    
                    console.error('❌ Final error message:', errorMessage);
                    console.error('❌ Debug info:', debugInfo);
                    setError(errorMessage);
                  }}
                  onCanPlay={() => {
                    console.log('✅ Video can play');
                  }}
                >
                </video>

                
                {/* Custom Controls Overlay */}
                {controlsVisible && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300">
                    <div className="flex items-center space-x-2 sm:space-x-4 text-white">
                      {/* Play/Pause button */}
                      <button
                        onClick={handlePlayPause}
                        className="text-white hover:text-gray-300 transition-colors duration-200"
                        title="Play/Pause (Space)"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </button>

                      {/* Time display */}
                      <div className="text-xs sm:text-sm">
                        {formatDuration(currentTime)} / {formatDuration(duration)}
                      </div>

                      {/* Progress bar */}
                      <div 
                        className="flex-1 bg-gray-600 rounded-full h-1.5 sm:h-2 cursor-pointer relative"
                        onClick={handleProgressClick}
                        title="Click to seek"
                      >
                        <div 
                          className="bg-red-600 h-1.5 sm:h-2 rounded-full transition-all duration-200 relative"
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        <div className="absolute inset-0 rounded-full hover:bg-gray-500 transition-colors duration-200"></div>
                      </div>

                      {/* Volume button */}
                      <button
                        onClick={toggleMute}
                        className="text-white hover:text-gray-300 transition-colors duration-200"
                        title="Mute/Unmute (M)"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>


                      {/* Fullscreen button */}
                      <button
                        onClick={toggleFullscreen}
                        className="text-white hover:text-gray-300 transition-colors duration-200"
                        title="Fullscreen (F)"
                      >
                        <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual play button overlay */}
                {!isPlaying && playerReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button
                      onClick={handleManualPlayClick}
                      className="bg-red-600 hover:bg-red-700 text-white p-3 sm:p-4 rounded-full shadow-lg transition-all duration-200 pointer-events-auto transform hover:scale-110"
                      title="Click to play"
                    >
                      <Play className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                  </div>
                )}

                {/* Loading overlay */}
                {!playerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center text-white px-4">
                      <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-red-500 mx-auto mb-2 sm:mb-4"></div>
                      <p className="text-sm sm:text-base">Loading Video Player...</p>
                    </div>
                  </div>
                )}

                {/* Keyboard shortcuts hint */}
                {controlsVisible && (
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded opacity-75 hover:opacity-100 transition-opacity duration-200">
                    <div className="hidden sm:block">Space: Play/Pause</div>
                    <div className="hidden sm:block">M: Mute</div>
                    <div className="hidden sm:block">F: Fullscreen</div>
                    <div className="sm:hidden text-xs">Tap to play</div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center px-4">
                  <p className="text-base sm:text-lg mb-2">No video URL available</p>
                  <p className="text-xs sm:text-sm text-gray-400">Video ID: {currentVideo.id}</p>
                  <p className="text-xs sm:text-sm text-gray-400">S3 Key: {currentVideo.s3Key || 'Not available'}</p>
                  
                  {/* Direct test button */}
                  <button
                    onClick={() => {
                      const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                      // Testing with sample video
                      // Force reload the page with a working video
                      window.location.href = window.location.href + '?test=sample';
                      // Or directly test the video element
                      const video = document.createElement('video');
                      video.src = testVideoUrl;
                      video.controls = true;
                      video.style.width = '100%';
                      video.style.height = '100%';
                      const container = document.querySelector('.video-container');
                      if (container) {
                        container.innerHTML = '';
                        container.appendChild(video);
                      }
                    }}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors duration-200 text-sm"
                  >
                    🧪 Test Video Player Now
                  </button>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="bg-red-900 border border-red-600 rounded-lg p-4 sm:p-6 max-w-lg mx-4 text-center">
                  <div className="text-red-400 text-3xl sm:text-4xl mb-2 sm:mb-4">⚠️</div>
                  <h3 className="text-white text-base sm:text-lg font-semibold mb-2">Video Playback Error</h3>
                  <p className="text-red-200 text-xs sm:text-sm mb-4">{error}</p>
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => setError(null)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded transition-colors duration-200 text-sm"
                    >
                      Dismiss
                    </button>
                    <Link
                      to={`/admin/courses/${courseId}/videos/${currentVideoId}/edit`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded transition-colors duration-200 inline-block text-sm"
                    >
                      Re-upload Video
                    </Link>
                    <button
                      onClick={() => {
                        // Test with a sample video URL
                        const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                        const video = videoRef.current;
                        if (video) {
                          video.src = testVideoUrl;
                          setError(null);
                          // Testing with sample video
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded transition-colors duration-200 text-sm"
                    >
                      Test with Sample Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="bg-gray-800 text-white p-3 sm:p-6 flex-1">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div className="mb-4 md:mb-0">
                  <h2 className="text-lg sm:text-2xl font-bold mb-2">{currentVideo.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-300 text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{duration > 0 ? formatDuration(duration) : formatDuration(currentVideo.duration)}</span>
                    </div>
                    {currentVideo.order && (
                      <div className="flex items-center space-x-1">
                        <span>Order: {currentVideo.order}</span>
                      </div>
                    )}
                    {currentVideo.uploadedBy && (
                      <div className="flex items-center space-x-1">
                        <span>By: {currentVideo.uploadedBy}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="text-xs sm:text-sm text-gray-400">Speed:</span>
                    <select
                      value={playbackRate}
                      onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                      className="bg-gray-700 text-white rounded px-2 sm:px-3 py-1 border border-gray-600 focus:outline-none focus:border-red-500 text-xs sm:text-sm"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>Normal</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                    <span className="text-xs sm:text-sm text-gray-300 font-medium">{playbackRate}x</span>
                  </div>
                </div>
              </div>

              {/* Video Details */}
              <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-4">
                <h3 className="text-base sm:text-lg font-semibold mb-2">Video Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-400">Video ID:</span>
                    <p className="font-mono text-gray-200 text-xs">{currentVideo.id}</p>
                  </div>
                  {currentVideo.s3Key && (
                    <div>
                      <span className="text-gray-400">S3 Key:</span>
                      <p className="font-mono text-gray-200 text-xs break-all">{currentVideo.s3Key}</p>
                    </div>
                  )}
                  {currentVideo.createdAt && (
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <p className="text-gray-200 text-xs sm:text-sm">{new Date(currentVideo.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    const currentIndex = courseData.videos.findIndex(v => v.id === currentVideoId);
                    const prevVideo = courseData.videos[currentIndex - 1];
                    if (prevVideo) handleVideoSelect(prevVideo.id);
                  }}
                  disabled={courseData.videos.findIndex(v => v.id === currentVideoId) === 0}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-200 text-sm"
                >
                  Previous Video
                </button>
                <button
                  onClick={() => {
                    const currentIndex = courseData.videos.findIndex(v => v.id === currentVideoId);
                    const nextVideo = courseData.videos[currentIndex + 1];
                    if (nextVideo) handleVideoSelect(nextVideo.id);
                  }}
                  disabled={
                    (() => {
                      const currentIndex = courseData.videos.findIndex(v => v.id === currentVideoId);
                      const nextVideo = courseData.videos[currentIndex + 1];
                      return !nextVideo;
                    })()
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-colors duration-200 text-sm"
                >
                  Next Video
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className={`bg-white border-l border-gray-200 transition-all duration-300 ${
          showPlaylist ? 'w-full lg:w-80' : 'w-0'
        } ${showPlaylist ? 'block' : 'hidden lg:block'} lg:w-80`}>
          {showPlaylist && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Course Videos</h3>
                <button
                  onClick={() => setShowPlaylist(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 text-lg"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                {courseData.videos.map((video, index) => (
                  <div
                    key={video.id}
                    className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                      video.id === currentVideoId
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleVideoSelect(video.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-xs sm:text-sm">
                          {video.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDuration(video.duration)} • {video.order ? `Order: ${video.order}` : `Video ${index + 1}`}
                        </p>
                      </div>
                      {video.id === currentVideoId && (
                        <div className="ml-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Playlist Overlay */}
      {showPlaylist && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex">
          <div className="bg-white w-full sm:w-80 ml-auto h-full overflow-y-auto">
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <button
                onClick={() => setShowPlaylist(false)}
                className="text-gray-600 hover:text-gray-800 text-sm sm:text-base"
              >
                Close Playlist
              </button>
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Course Videos</h3>
              <div className="space-y-2">
                {courseData.videos.map((video, index) => (
                  <div
                    key={video.id}
                    className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                      video.id === currentVideoId
                        ? 'bg-red-100 border border-red-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      handleVideoSelect(video.id);
                      setShowPlaylist(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-xs sm:text-sm">
                          {video.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDuration(video.duration)} • {video.order ? `Order: ${video.order}` : `Video ${index + 1}`}
                        </p>
                      </div>
                      {video.id === currentVideoId && (
                        <div className="ml-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

export default AdminVideoPlayerPage; 