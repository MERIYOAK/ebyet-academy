import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatDuration } from '../utils/durationFormatter';
import DRMSecurityService from '../services/drmSecurityService';

interface SecureVideoPlayerProps {
  src: string;
  title?: string;
  userId?: string;
  videoId?: string;
  courseId?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: MediaError | null) => void;
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (watchedDuration: number, totalDuration: number) => void;
  playing?: boolean;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  className?: string;
  initialTime?: number;
  showControls?: boolean;
  onControlsToggle?: (visible: boolean) => void;
  drmEnabled?: boolean;
  watermarkData?: string;
  forensicWatermark?: any;
}

const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  src,
  title,
  userId,
  videoId,
  courseId,
  onPlay,
  onPause,
  onEnded,
  onError,
  onReady,
  onTimeUpdate,
  onProgress,
  playing = false,
  playbackRate = 1,
  onPlaybackRateChange,
  className = '',
  initialTime = 0,
  showControls = true,
  onControlsToggle,
  drmEnabled = true,
  watermarkData,
  forensicWatermark
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const drmService = DRMSecurityService.getInstance();
  
  // Video player states
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Start muted on mobile, unmuted on desktop for better UX
  const [isMuted, setIsMuted] = useState(
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  );
  const [volume, setVolume] = useState(1);
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(playbackRate);
  const [showSettings, setShowSettings] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(showControls);
  const [controlsTimeout, setControlsTimeout] = useState<number | null>(null);
  const [showCenterPlayButton, setShowCenterPlayButton] = useState(true);

  // Security states (recording detection disabled per client request)
  const [securityStatus, setSecurityStatus] = useState<{
    isSecure: boolean;
    violations: string[];
    drmSession: any;
  }>({
    isSecure: true,
    violations: [],
    drmSession: null
  });
  const [securityChecks, setSecurityChecks] = useState({
    screenRecording: false,
    extensions: false,
    developerTools: false,
    virtualMachine: false
  });
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [watermarkVisible, setWatermarkVisible] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>('');
  // Recording detection states removed per client request

  // Progress tracking
  const lastProgressUpdate = useRef(0);
  const PROGRESS_UPDATE_INTERVAL = 30000; // 30 seconds

  // Initialize DRM and security
  useEffect(() => {
    const initializeSecurity = async () => {
      if (!drmEnabled || !userId || !videoId) return;

      try {
        // Initialize DRM session
        const drmSession = await drmService.initializeSession(userId, videoId);
        setSecurityStatus(prev => ({ ...prev, drmSession }));

        // Log security context with course information
        if (courseId) {
          console.log(`🔒 DRM session initialized for course: ${courseId}, video: ${videoId}, user: ${userId}`);
        }

        // Skip security check to avoid recording detection
        console.log('🔒 Recording detection disabled per client request');

      } catch (error) {
        console.error('❌ Failed to initialize security:', error);
        setError('Security initialization failed');
      }
    };

    initializeSecurity();
  }, [drmEnabled, userId, videoId, courseId, drmService]);

  // Create watermark overlay
  useEffect(() => {
    if (!drmEnabled || !watermarkData || !containerRef.current) return;

    const createWatermark = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10';
      canvas.style.opacity = watermarkVisible ? '0.1' : '0';
      canvas.style.transition = 'opacity 0.3s ease';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set watermark properties
      ctx.font = '24px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Create watermark pattern with course context
      const spacing = 200;
      const watermarkText = courseId ? `${watermarkData} | C:${courseId}` : watermarkData;
      for (let x = 0; x < rect.width; x += spacing) {
        for (let y = 0; y < rect.height; y += spacing) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 6); // 30 degree rotation
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
      }

      // Add forensic watermark if available
      if (forensicWatermark) {
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillText(`F:${forensicWatermark.hash}`, 10, rect.height - 10);
      }

      container.appendChild(canvas);
      // Store reference to canvas for cleanup
      (watermarkCanvasRef as any).current = canvas;

      return canvas;
    };

    const canvas = createWatermark();

    // Update watermark on resize
    const handleResize = () => {
      if (canvas && containerRef.current) {
        canvas.remove();
        createWatermark();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.remove();
      }
    };
  }, [drmEnabled, watermarkData, forensicWatermark, watermarkVisible]);

  // iOS-specific video event listeners for debugging and compatibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // iOS-specific event listeners for debugging
    const handleiOSDebug = (event: Event) => {
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        console.log('📱 iOS video event:', {
          type: event.type,
          readyState: video.readyState,
          networkState: video.networkState,
          currentTime: video.currentTime,
          duration: video.duration,
          muted: video.muted,
          paused: video.paused,
          src: video.src
        });
      }
    };

    // Add iOS-specific event listeners
    video.addEventListener('loadstart', handleiOSDebug);
    video.addEventListener('loadedmetadata', handleiOSDebug);
    video.addEventListener('loadeddata', handleiOSDebug);
    video.addEventListener('canplay', handleiOSDebug);
    video.addEventListener('canplaythrough', handleiOSDebug);
    video.addEventListener('play', handleiOSDebug);
    video.addEventListener('pause', handleiOSDebug);
    video.addEventListener('ended', handleiOSDebug);
    video.addEventListener('error', handleiOSDebug);
    video.addEventListener('stalled', handleiOSDebug);
    video.addEventListener('waiting', handleiOSDebug);

    return () => {
      // Cleanup event listeners
      video.removeEventListener('loadstart', handleiOSDebug);
      video.removeEventListener('loadedmetadata', handleiOSDebug);
      video.removeEventListener('loadeddata', handleiOSDebug);
      video.removeEventListener('canplay', handleiOSDebug);
      video.removeEventListener('canplaythrough', handleiOSDebug);
      video.removeEventListener('play', handleiOSDebug);
      video.removeEventListener('pause', handleiOSDebug);
      video.removeEventListener('ended', handleiOSDebug);
      video.removeEventListener('error', handleiOSDebug);
      video.removeEventListener('stalled', handleiOSDebug);
      video.removeEventListener('waiting', handleiOSDebug);
    };
  }, [src]);

  // Security: Disable right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Recording detection disabled per client request
  const detectRecordingAttempt = useCallback((source: string, details: string) => {
    console.log(`🔒 Recording detection disabled - would have triggered from ${source}:`, details);
    // Do nothing - recording detection feature removed
  }, []);

  // Security: Prevent drag and drop
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  // Anti-recording content obfuscation disabled per client request
  useEffect(() => {
    if (!drmEnabled) return;

    console.log('🔒 Content obfuscation disabled per client request');
    
    return () => {
      // Cleanup - no active obfuscation to clean up
    };
  }, [drmEnabled]);

  // Enhanced recording detection disabled per client request
  useEffect(() => {
    if (!drmEnabled) return;

    console.log('🔒 Recording detection disabled per client request');
    
    return () => {
      // Cleanup - no active detection to clean up
    };
  }, [drmEnabled]);

  // Video event handlers
  const handleLoadedData = () => {
    setIsReady(true);
    setIsLoading(false);
    onReady?.();
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowCenterPlayButton(false);
    
    // iOS-specific play handling
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      const video = videoRef.current;
      if (video) {
        // Ensure video plays inline on iOS
        console.log('📱 iOS video playback started:', {
          muted: video.muted,
          playsInline: video.hasAttribute('playsInline'),
          currentTime: video.currentTime
        });
        
        // Handle iOS Safari autoplay restrictions
        if (video.paused) {
          // Attempt to play with user interaction fallback
          video.play().catch(error => {
            console.warn('📱 iOS autoplay blocked, requiring user interaction:', error);
            setError('Tap the play button to start video on iOS devices');
          });
        }
      }
    }
    
    onPlay?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowCenterPlayButton(true);
    onPause?.();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowCenterPlayButton(true);
    onEnded?.();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;
    const total = video.duration;
    
    setCurrentTime(current);
    setDuration(total);
    onTimeUpdate?.(current, total);

    // Update progress
    if (total > 0) {
      onProgress?.(current, total);
    }
  };

  const handleNativeError = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    const error = video.error;
    
    // iPhone-specific error handling
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      console.warn('📱 iOS video error detected:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        videoSrc: video.src,
        muted: video.muted,
        playsInline: video.hasAttribute('playsInline'),
        webkitPlaysinline: video.hasAttribute('webkit-playsinline')
      });
      
      // Common iOS video error solutions
      if (error?.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
        setError('Video format not supported on iOS. Please try a different browser or contact support.');
      } else if (error?.code === 3) { // MEDIA_ERR_DECODE
        setError('Video decoding failed on iOS. Please refresh the page and try again.');
      } else {
        setError(error ? `iOS Video error: ${error.message}` : 'Unknown iOS video error');
      }
    } else {
      setError(error ? `Video error: ${error.message}` : 'Unknown video error');
    }
    
    setIsLoading(false);
    onError?.(error);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    
    // iOS-specific video optimization
    if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      const video = videoRef.current;
      if (video) {
        // Ensure video is ready for iOS playback
        console.log('📱 iOS video ready for playback:', {
          src: video.src,
          muted: video.muted,
          playsInline: video.hasAttribute('playsInline'),
          readyState: video.readyState,
          networkState: video.networkState
        });
        
        // Force video to load metadata for iOS
        if (video.readyState < 2) {
          video.load();
        }
      }
    }
  };

  // Mouse movement handlers for controls
  const handleMouseMove = () => {
    setControlsVisible(true);
    setShowCenterPlayButton(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = window.setTimeout(() => {
      setControlsVisible(false);
      setShowCenterPlayButton(false);
    }, 3000);
    setControlsTimeout(timeout);
  };

  const handleMouseLeave = () => {
    const timeout = window.setTimeout(() => {
      setControlsVisible(false);
      setShowCenterPlayButton(false);
    }, 1000);
    setControlsTimeout(timeout);
  };

  const handleContainerClick = () => {
    if (isBlocked) {
      console.warn('🚫 Video playback blocked due to security violation');
      return;
    }
    
    if (isReady) {
      const video = videoRef.current;
      
      // iOS-specific user interaction handling
      if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
        if (video) {
          // Ensure video is muted for iOS autoplay
          if (!video.muted) {
            video.muted = true;
            setIsMuted(true);
          }
          
          // Direct play with user interaction
          if (isPlaying) {
            video.pause();
          } else {
            // Ensure proper iOS play sequence
            video.play().then(() => {
              console.log('📱 iOS video playback successful');
            }).catch(error => {
              console.warn('📱 iOS video play failed:', error);
              setError('Unable to play video on iOS. Please tap the play button again.');
            });
          }
        }
      } else {
        // Non-iOS handling
        if (isPlaying) {
          video?.pause();
        } else {
          video?.play();
        }
      }
    }
  };

  // Control handlers
  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (video) {
      video.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Enhanced keyboard shortcut detection with video controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle keyboard shortcuts if video is blocked
    if (isBlocked) {
      return;
    }

    // Check if user is typing in an input field, textarea, or other editable element
    const target = e.target as HTMLElement;
    const isEditableElement = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable ||
      target.closest('input, textarea, [contenteditable="true"]') !== null;

    // Block common download/save shortcuts
    const blockedShortcuts = [
      'F12', // Developer tools
      'Ctrl+Shift+I', // Developer tools
      'Ctrl+Shift+J', // Console
      'Ctrl+U', // View source
      'Ctrl+S', // Save
      'Ctrl+Shift+S', // Save as
      'Ctrl+P', // Print
      'Ctrl+Shift+P', // Print
      'F5', // Refresh
      'Ctrl+R', // Refresh
      'Ctrl+Shift+R' // Hard refresh
    ];

    const keyCombo = e.key + (e.ctrlKey ? '+Ctrl' : '') + (e.shiftKey ? '+Shift' : '') + (e.altKey ? '+Alt' : '') + (e.metaKey ? '+Win' : '');
    
    // CRITICAL: Block ALL Windows key combinations when video is playing
    // (Still block security-related shortcuts even when typing in forms)
    if (isPlaying && e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.warn('🚫 Windows key blocked during video playback:', keyCombo);
      
      // Show warning for Windows key usage during playback
      detectRecordingAttempt('Windows Key During Playback', `Windows key combination blocked: ${keyCombo}`);
      return false;
    }
    
    // Enhanced Game Bar shortcut detection (for when video is paused)
    // (Still block security-related shortcuts even when typing in forms)
    const isGameBarShortcut = (
      // Win+Alt+R (Start/Stop recording) - PRIMARY TARGET
      (e.metaKey && e.altKey && (e.key === 'r' || e.key === 'R')) ||
      // Win+Alt+G (Record last 30 seconds)
      (e.metaKey && e.altKey && (e.key === 'g' || e.key === 'G')) ||
      // Win+Alt+PrtScn (Take screenshot)
      (e.metaKey && e.altKey && e.key === 'PrintScreen') ||
      // Win+Alt+T (Show/hide recording timer)
      (e.metaKey && e.altKey && (e.key === 't' || e.key === 'T')) ||
      // Win+G (Open Game Bar)
      (e.metaKey && (e.key === 'g' || e.key === 'G')) ||
      // Alternative Alt+R (some systems)
      (e.altKey && (e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.shiftKey)
    );

    if (isGameBarShortcut) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      detectRecordingAttempt('Keyboard Shortcut', `Key combination: ${keyCombo}`);
      return false;
    }
    
    if (blockedShortcuts.some(shortcut => keyCombo.includes(shortcut))) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('🚫 Blocked shortcut:', keyCombo);
      return false;
    }

    // Skip video control shortcuts if user is typing in an editable element
    // This allows users to type normally in forms, textareas, etc.
    if (isEditableElement) {
      return;
    }

    // Video control keyboard shortcuts (only if no modifier keys are pressed)
    if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ': // Space bar - Play/Pause
          e.preventDefault();
          e.stopPropagation();
          if (isPlaying) {
            video.pause();
          } else {
            video.play().catch(console.error);
          }
          break;

        case 'm': // M - Mute/Unmute
          e.preventDefault();
          e.stopPropagation();
          video.muted = !video.muted;
          setIsMuted(video.muted);
          break;

        case 'f': // F - Fullscreen
          e.preventDefault();
          e.stopPropagation();
          toggleFullscreen();
          break;

        case 'arrowleft': // Left arrow - Seek backward 10 seconds
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;

        case 'arrowright': // Right arrow - Seek forward 10 seconds
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;

        case 'arrowup': // Up arrow - Volume up
          e.preventDefault();
          e.stopPropagation();
          const newVolumeUp = Math.min(1, video.volume + 0.1);
          video.volume = newVolumeUp;
          setVolume(newVolumeUp);
          setIsMuted(false);
          break;

        case 'arrowdown': // Down arrow - Volume down
          e.preventDefault();
          e.stopPropagation();
          const newVolumeDown = Math.max(0, video.volume - 0.1);
          video.volume = newVolumeDown;
          setVolume(newVolumeDown);
          setIsMuted(newVolumeDown === 0);
          break;

        case 'k': // K - Play/Pause (alternative)
          e.preventDefault();
          e.stopPropagation();
          if (isPlaying) {
            video.pause();
          } else {
            video.play().catch(console.error);
          }
          break;

        case 'j': // J - Seek backward 10 seconds (alternative)
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;

        case 'l': // L - Seek forward 10 seconds (alternative)
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;

        case '0': // 0 - Seek to beginning
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = 0;
          break;

        case '9': // 9 - Seek to 90% of video
          e.preventDefault();
          e.stopPropagation();
          video.currentTime = video.duration * 0.9;
          break;
      }
    }
  }, [detectRecordingAttempt, isBlocked, isPlaying, toggleFullscreen]);

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
      setCurrentPlaybackRate(rate);
      onPlaybackRateChange?.(rate);
    }
  };

  // Sync external playing state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (playing && !isPlaying) {
      video.play().catch(console.error);
    } else if (!playing && isPlaying) {
      video.pause();
    }
  }, [playing, isPlaying, isReady]);

  // Sync playback rate
  useEffect(() => {
    const video = videoRef.current;
    if (video && isReady) {
      video.playbackRate = playbackRate;
      setCurrentPlaybackRate(playbackRate);
    }
  }, [playbackRate, isReady]);

  // Set initial time
  useEffect(() => {
    const video = videoRef.current;
    if (video && isReady && initialTime > 0) {
      video.currentTime = initialTime;
      setCurrentTime(initialTime);
    }
  }, [initialTime, isReady]);

  // Add event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleNativeError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    // Security event listeners
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleNativeError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <>
      <div 
        ref={containerRef}
        className={`secure-video-player relative bg-black w-full h-full ${className}`}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleContainerClick}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          width: '100%',
          height: '100%',
          minHeight: '200px',
        }}
      >
      {/* Security Warning Overlay */}
      {showSecurityWarning && (
        <div className="absolute inset-0 bg-black bg-opacity-95 flex items-center justify-center z-40 p-2 sm:p-4 overflow-y-auto">
          <div className="text-center text-white p-2 sm:p-3 md:p-4 w-full max-w-xs sm:max-w-sm md:max-w-lg mx-auto my-4">
            <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-red-400 mx-auto mb-2 sm:mb-3" />
            <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3 text-red-300">🚨 RECORDING BLOCKED 🚨</h3>
            <p className="text-xs sm:text-sm md:text-base mb-2 sm:mb-3 font-semibold">
              Unauthorized recording has been detected and blocked!
            </p>
            <div className="bg-gray-800 bg-opacity-70 p-2 sm:p-3 rounded-lg mb-2 sm:mb-3">
              <p className="text-xs text-red-100 mb-1 sm:mb-2">
                <strong>⚠️ IMMEDIATE ACTION REQUIRED:</strong>
              </p>
              <div className="text-left text-xs space-y-1">
                <p>• <strong>Windows Game Bar:</strong> Press Win+I → Gaming → Game Bar → Turn OFF</p>
                <p>• <strong>Recording Software:</strong> Close OBS, Bandicam, Fraps, etc.</p>
                <p>• <strong>Browser Extensions:</strong> Disable video download extensions</p>
                <p>• <strong>System Recording:</strong> Disable all screen recording tools</p>
              </div>
            </div>
            <div className="bg-black bg-opacity-50 p-2 rounded mb-2 sm:mb-3">
              <p className="text-xs text-yellow-200">
                <strong>Block Reason:</strong> {blockReason}
              </p>
            </div>
            <div className="space-y-1 text-xs mb-2 sm:mb-3">
              {securityStatus.violations.map((violation, index) => (
                <div key={index} className="text-gray-300 bg-gray-800 bg-opacity-50 p-1 rounded">
                  • {violation}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setShowSecurityWarning(false);
                  setIsBlocked(false);
                  setBlockReason('');
                }}
                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-xs sm:text-sm"
              >
                I've Disabled Recording Tools
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-xs sm:text-sm"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Security Status Indicator - Hidden */}
      {false && drmEnabled && (
        <div className="absolute top-4 left-4 z-20">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            securityStatus.isSecure 
              ? 'bg-green-900 bg-opacity-75 text-green-300' 
              : 'bg-red-900 bg-opacity-75 text-red-300'
          }`}>
            <Shield className="w-3 h-3" />
            <span>{securityStatus.isSecure ? 'Secure' : 'Warning'}</span>
          </div>
        </div>
      )}

      {/* Windows Key Blocking Indicator - Hidden */}
      {false && isPlaying && (
        <div className="absolute top-4 left-32 z-20">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-blue-900 bg-opacity-75 text-blue-300">
            <Shield className="w-3 h-3" />
            <span>Windows Key Blocked</span>
          </div>
        </div>
      )}

      {/* Watermark Toggle - Hidden */}
      {false && drmEnabled && watermarkData && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setWatermarkVisible(!watermarkVisible)}
            className="flex items-center space-x-1 px-3 py-1 rounded-full bg-black bg-opacity-75 text-white text-xs hover:bg-opacity-90"
            title={watermarkVisible ? 'Hide watermark' : 'Show watermark'}
          >
            {watermarkVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>Watermark</span>
          </button>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        preload="metadata"
        crossOrigin="anonymous"
        muted={isMuted}
        playsInline
        webkit-playsinline
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto',
          WebkitFilter: 'none',
          filter: 'none',
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
      />

      {/* Center Play/Pause Button */}
      {(showCenterPlayButton || !isPlaying) && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <button
            onClick={isBlocked ? () => {
              console.warn('🚫 Playback blocked due to security violation');
              setShowSecurityWarning(true);
            } : (isPlaying ? handlePause : handlePlay)}
            className={`group transition-all duration-300 transform hover:scale-110 pointer-events-auto ${
              isBlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            disabled={isBlocked}
          >
            <div className="bg-black bg-opacity-60 rounded-full p-2 sm:p-3 md:p-4 group-hover:bg-opacity-80 transition-all duration-300">
              {isBlocked ? (
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-red-400" />
              ) : isPlaying ? (
                <Pause className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white" />
              ) : (
                <Play className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white ml-0.5 sm:ml-1" />
              )}
            </div>
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p>Loading Secure Video Player...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center text-white p-4">
            <p className="text-lg mb-2">Video Error</p>
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      {controlsVisible && showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 sm:p-3 md:p-4 z-20">
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 text-white">
            {/* Play/Pause Button */}
            <button
              onClick={isBlocked ? () => {
                console.warn('🚫 Playback blocked due to security violation');
                setShowSecurityWarning(true);
              } : (isPlaying ? handlePause : handlePlay)}
              className={`transition-colors flex-shrink-0 ${isBlocked ? 'text-red-400 cursor-not-allowed' : 'text-white hover:text-gray-300'}`}
              disabled={isBlocked}
            >
              {isBlocked ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : (isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />)}
            </button>

            {/* Time Display */}
            <div className="text-[10px] sm:text-xs md:text-sm font-mono flex-shrink-0">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 bg-gray-600 rounded-full h-1.5 sm:h-2 cursor-pointer min-w-0" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newTime = (clickX / rect.width) * duration;
              handleSeek(newTime);
            }}>
              <div 
                className="bg-gradient-to-r from-cyan-600 to-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-200"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* Volume Control - Hidden on very small screens */}
            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-12 md:w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Playback Rate - Hidden on very small screens */}
            <div className="hidden md:block relative flex-shrink-0">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <div className="absolute bottom-8 right-0 bg-black bg-opacity-90 rounded p-2 min-w-32">
                  <div className="text-xs text-gray-400 mb-2">Playback Speed</div>
                  {playbackRates.map(rate => (
                    <button
                      key={rate}
                      onClick={() => {
                        changePlaybackRate(rate);
                        setShowSettings(false);
                      }}
                      className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-700 ${
                        currentPlaybackRate === rate ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white' : 'text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <Maximize className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint - Hidden on mobile */}
      {controlsVisible && showKeyboardHints && (
        <div 
          className="absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded opacity-75 hover:opacity-100 transition-opacity duration-200 cursor-pointer max-w-xs hidden sm:block"
          onClick={() => setShowKeyboardHints(false)}
          title="Click to hide"
        >
          <div className="font-semibold mb-1">🎮 Keyboard Controls:</div>
          <div>Space/K: Play/Pause</div>
          <div>M: Mute/Unmute</div>
          <div>←/→ or J/L: Skip ±10s</div>
          <div>↑/↓: Volume ±10%</div>
          <div>F: Fullscreen</div>
          <div>0: Start | 9: 90%</div>
          {false && isPlaying && (
            <div className="mt-2 pt-2 border-t border-gray-600 text-yellow-300">
              <div className="font-semibold">🔒 Security Active:</div>
              <div>Windows Key Blocked</div>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
};

export default SecureVideoPlayer;
