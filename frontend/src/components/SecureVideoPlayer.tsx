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
  const { t, i18n } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const watermarkCanvasRef = useRef<HTMLCanvasElement>(null);
  const drmService = DRMSecurityService.getInstance();
  
  // Video player states
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
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

  // Security states
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
  const [antiRecordingActive, setAntiRecordingActive] = useState(false);
  const [contentObfuscation, setContentObfuscation] = useState(false);

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

        // Perform initial security check
        const securityCheck = await drmService.performSecurityCheck();
        setSecurityStatus(prev => ({ ...prev, ...securityCheck }));

        if (!securityCheck.isSecure) {
          setShowSecurityWarning(true);
          console.warn('🚨 Security violations detected:', securityCheck.violations);
        }

        // Set up periodic security checks
        const securityInterval = setInterval(async () => {
          const check = await drmService.performSecurityCheck();
          setSecurityStatus(prev => ({ ...prev, ...check }));
          
          if (!check.isSecure) {
            setShowSecurityWarning(true);
          }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(securityInterval);
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

  // Security: Disable right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Enhanced recording detection state
  const [lastDetectionTime, setLastDetectionTime] = useState(0);

  // Comprehensive recording detection function
  const detectRecordingAttempt = useCallback((source: string, details: string) => {
    const now = Date.now();
    
    // Prevent spam detection (only trigger once per 2 seconds)
    if (now - lastDetectionTime < 2000) {
      return;
    }
    
    setLastDetectionTime(now);
    console.warn(`🚨 RECORDING DETECTED from ${source}:`, details);
    
    // Immediately pause video
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      console.warn('🚨 Video paused due to recording detection');
      }
      
    // Activate all security measures
    setAntiRecordingActive(true);
    setContentObfuscation(true);
      setShowSecurityWarning(true);
    setIsBlocked(true);
    setBlockReason(`Recording detected via ${source}`);
    
      setSecurityStatus(prev => ({
        ...prev,
        isSecure: false,
      violations: [...prev.violations, `Recording attempt detected: ${source}`]
      }));

      // Activate content obfuscation
      activateContentObfuscation();
      
      // Show immediate alert
    alert(`🚫 RECORDING DETECTED AND BLOCKED! 🚫\n\nRecording attempt detected via: ${source}\n\nTo continue watching:\n1. Disable Windows Game Bar (Win+I → Gaming → Game Bar)\n2. Close all recording software (OBS, Bandicam, etc.)\n3. Disable browser extensions for video downloading\n4. Refresh this page\n\nThis content is protected and cannot be recorded.`);
  }, [lastDetectionTime]);


  // Security: Prevent drag and drop
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  // Activate content obfuscation to make recordings useless
  const activateContentObfuscation = () => {
    const container = containerRef.current;
    if (!container) return;

    // Create simple black overlay instead of colorful obfuscation
    const obfuscationOverlay = document.createElement('div');
    obfuscationOverlay.id = 'recording-obfuscation';
    obfuscationOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 30;
      pointer-events: none;
    `;

    container.appendChild(obfuscationOverlay);


    // Store references for cleanup
    (obfuscationOverlay as any).cleanup = () => {
      obfuscationOverlay.remove();
    };

    return obfuscationOverlay;
  };

  // Anti-recording content obfuscation
  useEffect(() => {
    if (!drmEnabled) return;

    const obfuscateContent = () => {
      const video = videoRef.current;
      if (!video) return;

      // Add simple black overlay instead of colorful one
      const overlay = document.createElement('div');
      overlay.id = 'anti-recording-overlay';
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.2);
        pointer-events: none;
        z-index: 25;
      `;

      // Add overlay to video container
      const container = containerRef.current;
      if (container) {
        container.appendChild(overlay);
      }

      // Add dynamic watermark that changes every second
      const dynamicWatermark = document.createElement('div');
      dynamicWatermark.id = 'dynamic-watermark';
      dynamicWatermark.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        color: rgba(255,255,255,0.3);
        font-size: 12px;
        font-family: monospace;
        z-index: 26;
        pointer-events: none;
      `;

      container?.appendChild(dynamicWatermark);

      // Add IBYET INVESTING watermark
      const academyWatermark = document.createElement('div');
      academyWatermark.id = 'academy-watermark';
      academyWatermark.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        color: rgba(255,255,255,0.15);
        font-size: 24px;
        font-weight: bold;
        font-family: 'Arial', sans-serif;
        z-index: 25;
        pointer-events: none;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        user-select: none;
      `;
      academyWatermark.textContent = t('brand.name').toUpperCase();
      container?.appendChild(academyWatermark);

      // Update watermark every second
      const updateWatermark = () => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        dynamicWatermark.textContent = `ID:${userId?.substring(0,4)}-${randomId}-${timestamp}`;
      };

      updateWatermark();
      const watermarkInterval = setInterval(updateWatermark, 1000);

      return () => {
        clearInterval(watermarkInterval);
        overlay.remove();
        dynamicWatermark.remove();
        academyWatermark.remove();
      };
    };

    const cleanup = obfuscateContent();
    return cleanup;
  }, [drmEnabled, userId, i18n.language, t]);

  // Enhanced recording detection with multiple methods
  useEffect(() => {
    if (!drmEnabled) return;

    // Variables for cleanup
    let periodicChecks: number;
    let observer: MutationObserver;
    let stopAggressiveDetection: () => void;
    let handleFocusChange: () => void;
    let handleKeyDownHighPriority: (e: KeyboardEvent) => boolean | void;

    // Add a delay before starting detection to avoid false positives during page load
    const detectionDelay = setTimeout(() => {
      console.log('🔒 Starting recording detection after delay...');
      
      // Method 1: Screen recording API detection
      const detectScreenRecording = async () => {
        try {
          const isRecording = await drmService.detectScreenRecording();
          setSecurityChecks(prev => ({ ...prev, screenRecording: isRecording }));
          
          if (isRecording) {
            detectRecordingAttempt('Screen Recording API', 'Active screen recording detected');
          }
        } catch (error) {
          console.error('❌ Screen recording detection failed:', error);
        }
      };

    // Method 2: DOM-based Game Bar detection (less aggressive)
    const detectGameBarElements = () => {
      // Check for specific Game Bar overlay elements only
      const gameBarSelectors = [
        '[class*="xbox-gamebar"]',
        '[id*="xbox-gamebar"]',
        '[class*="game-dvr-overlay"]',
        '[data-testid*="xbox-gamebar"]',
        '[aria-label*="Xbox Game Bar"]'
      ];

      for (const selector of gameBarSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Only trigger if we find multiple specific Game Bar elements
          if (elements.length >= 2) {
            detectRecordingAttempt('Game Bar DOM Elements', `Found ${elements.length} Game Bar elements`);
            return true;
          }
        }
      }
      return false;
    };

    // Method 3: Window focus/blur detection (less aggressive)
    let focusChangeTimeout: number;
    let focusChangeCount = 0;
    handleFocusChange = () => {
      clearTimeout(focusChangeTimeout);
      focusChangeTimeout = setTimeout(() => {
        // Only trigger after multiple rapid focus changes
        if (document.hidden) {
          focusChangeCount++;
          setTimeout(() => {
            if (!document.hidden && focusChangeCount >= 3) {
              detectRecordingAttempt('Window Focus Change', 'Multiple rapid focus changes detected');
              focusChangeCount = 0; // Reset counter
            }
          }, 200);
        }
      }, 100);
    };

    // Method 4: Performance monitoring for recording indicators
    const detectPerformanceAnomalies = () => {
      const performanceEntries = performance.getEntriesByType('measure');
      const suspiciousEntries = performanceEntries.filter(entry => 
        entry.name.includes('recording') || 
        entry.name.includes('capture') ||
        entry.name.includes('gamebar')
      );
      
      if (suspiciousEntries.length > 0) {
        detectRecordingAttempt('Performance Monitoring', `Found ${suspiciousEntries.length} suspicious performance entries`);
      }
    };

    // Method 5: Media stream detection
    const detectMediaStreams = () => {
      // Check for active media streams
      const videoElements = document.querySelectorAll('video');
      const hasBlobStreams = Array.from(videoElements).some(video => 
        video.src && video.src.startsWith('blob:')
      );
      
      if (hasBlobStreams) {
        detectRecordingAttempt('Media Stream Detection', 'Blob video streams detected');
      }
    };

    // Method 6: Extension detection
    const detectExtensions = async () => {
      try {
        const hasExtensions = await drmService.detectBrowserExtensions();
        setSecurityChecks(prev => ({ ...prev, extensions: hasExtensions }));
        
        if (hasExtensions) {
          detectRecordingAttempt('Browser Extensions', 'Suspicious browser extensions detected');
        }
      } catch (error) {
        console.error('❌ Extension detection failed:', error);
      }
    };

    // Method 7: Storage-based Game Bar detection
    const detectGameBarStorage = () => {
      const gameBarKeys = ['gamebar', 'xbox', 'game-dvr', 'gamebar-overlay', 'recording', 'capture'];
      for (const key of gameBarKeys) {
        if (localStorage.getItem(key) || sessionStorage.getItem(key)) {
          detectRecordingAttempt('Game Bar Storage', `Game Bar storage key found: ${key}`);
          return true;
        }
      }
      return false;
    };

    // Method 8: WebRTC detection (screen sharing)
    const detectWebRTCStreams = () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // Override getDisplayMedia to detect usage
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = function(...args) {
          detectRecordingAttempt('WebRTC Screen Sharing', 'getDisplayMedia API called');
          return originalGetDisplayMedia.apply(this, args);
        };
      }
    };

    // Method 9: Canvas fingerprinting detection
    const detectCanvasRecording = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Check if canvas is being used for recording
        const originalToDataURL = canvas.toDataURL;
        canvas.toDataURL = function(...args) {
          detectRecordingAttempt('Canvas Recording', 'Canvas toDataURL called (possible recording)');
          return originalToDataURL.apply(this, args);
        };
      }
    };

    // Method 10: Less aggressive polling for Game Bar elements
    const aggressiveGameBarDetection = () => {
      let detectionCount = 0;
      const maxDetections = 5; // Increased threshold
      
      const checkForGameBar = () => {
        if (detectGameBarElements() || detectGameBarStorage()) {
          detectionCount++;
          if (detectionCount >= maxDetections) {
            detectRecordingAttempt('Game Bar Detection', `Game Bar detected ${detectionCount} times`);
          }
        }
      };
      
      // Check every 2 seconds instead of 100ms for less aggressive detection
      const interval = setInterval(checkForGameBar, 2000);
      return () => clearInterval(interval);
    };
    
    // Assign the cleanup function
    stopAggressiveDetection = aggressiveGameBarDetection();

    // Initialize all detection methods
    console.log('🔒 Initializing enhanced recording detection...');
    
    // Initial checks
      detectScreenRecording();
      detectExtensions();
    detectGameBarElements();
    detectGameBarStorage();
    detectPerformanceAnomalies();
    detectMediaStreams();
    detectWebRTCStreams();
    detectCanvasRecording();
    
    // Set up event listeners
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);
    document.addEventListener('visibilitychange', handleFocusChange);
    
    // Method 11: DOM mutation observer for Game Bar elements
    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const className = element.className?.toString().toLowerCase() || '';
              const id = element.id?.toLowerCase() || '';
              
              if (className.includes('gamebar') || 
                  className.includes('xbox') || 
                  className.includes('recording') ||
                  className.includes('capture') ||
                  id.includes('gamebar') || 
                  id.includes('xbox') ||
                  id.includes('recording') ||
                  id.includes('capture')) {
                detectRecordingAttempt('DOM Mutation', `Game Bar element added to DOM: ${element.tagName}`);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Method 12: Periodic comprehensive checks
    periodicChecks = setInterval(() => {
      detectScreenRecording();
      detectExtensions();
      detectGameBarElements();
      detectGameBarStorage();
      detectPerformanceAnomalies();
      detectMediaStreams();
    }, 1000); // Check every second

    // Method 13: High-priority Windows key blocking during playback
    handleKeyDownHighPriority = (e: KeyboardEvent) => {
      // Block ALL Windows key combinations when video is playing
      if (isPlaying && e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.warn('🚫 HIGH PRIORITY: Windows key blocked during playback:', e.key);
        detectRecordingAttempt('High Priority Windows Key Block', `Windows key blocked: ${e.key}`);
        return false;
      }
      
      // Specifically target Win+Alt+R (even when paused)
      if (e.metaKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        detectRecordingAttempt('High Priority Keyboard', 'Win+Alt+R detected');
        return false;
      }
    };

    // Add high priority event listener
    document.addEventListener('keydown', handleKeyDownHighPriority, true);

    console.log('🔒 Enhanced recording detection initialized with 13 detection methods');
    
    }, 2000); // 2 second delay before starting detection

    return () => {
      // Cleanup all detection methods
      clearTimeout(detectionDelay);
      if (periodicChecks) clearInterval(periodicChecks);
      if (observer) observer.disconnect();
      if (stopAggressiveDetection) stopAggressiveDetection();
      if (handleFocusChange) {
        window.removeEventListener('focus', handleFocusChange);
        window.removeEventListener('blur', handleFocusChange);
        document.removeEventListener('visibilitychange', handleFocusChange);
      }
      if (handleKeyDownHighPriority) {
        document.removeEventListener('keydown', handleKeyDownHighPriority, true);
      }
    };
  }, [drmEnabled, drmService, detectRecordingAttempt]);

  // Video event handlers
  const handleLoadedData = () => {
    setIsReady(true);
    setIsLoading(false);
    onReady?.();
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowCenterPlayButton(false);
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
    setError(error ? `Video error: ${error.message}` : 'Unknown video error');
    setIsLoading(false);
    onError?.(error);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
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
      if (isPlaying) {
        videoRef.current?.pause();
      } else {
        videoRef.current?.play();
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
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto',
          WebkitFilter: antiRecordingActive ? 'blur(5px) brightness(0.3)' : 'none',
          filter: antiRecordingActive ? 'blur(5px) brightness(0.3)' : 'none',
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
            <div className="hidden sm:flex items-center space-x-1 md:space-x-2 flex-shrink-0">
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

      {/* Keyboard Shortcuts Hint */}
      {controlsVisible && showKeyboardHints && (
        <div 
          className="absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs p-3 rounded opacity-75 hover:opacity-100 transition-opacity duration-200 cursor-pointer max-w-xs"
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
