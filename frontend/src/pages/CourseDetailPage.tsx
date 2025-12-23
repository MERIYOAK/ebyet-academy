import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Play, CheckCircle, Award, Download, BookOpen, ShoppingCart, Loader, Eye, Lock, X } from 'lucide-react';
import VideoPlaylist from '../components/VideoPlaylist';
import VideoProgressBar from '../components/VideoProgressBar';
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';
import { buildApiUrl } from '../config/environment';
import DRMVideoService from '../services/drmVideoService';
import { parseDurationToSeconds } from '../utils/durationFormatter';

// TEMPORARY: Sample courses for frontend (will be replaced with backend later)
const sampleCourses: Record<string, Course> = {
  'sample-course-1': {
    _id: 'sample-course-1',
    title: 'Introduction to Stock Market Investing',
    description: 'Learn the fundamentals of stock market investing, including how to analyze stocks, build a diversified portfolio, and make informed investment decisions. Perfect for beginners who want to start their investment journey.',
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    price: 49.99,
    category: 'investing',
    level: 'beginner',
    totalEnrollments: 1250,
    tags: ['Investing', 'Stocks', 'Beginner'],
    instructor: 'Expert Instructor',
    totalVideos: 4,
    videos: [
      { _id: 'v1', title: 'Introduction to Stock Market', description: 'Learn the basics of stock market investing', duration: 930 },
      { _id: 'v2', title: 'Understanding Stocks and Shares', description: 'Deep dive into how stocks work', duration: 1365 },
      { _id: 'v3', title: 'Building Your First Portfolio', description: 'Step-by-step guide to creating a portfolio', duration: 1100 },
      { _id: 'v4', title: 'Risk Management Strategies', description: 'Learn how to manage investment risks', duration: 1510 }
    ]
  },
  'sample-course-2': {
    _id: 'sample-course-2',
    title: 'Advanced Trading Strategies',
    description: 'Master advanced trading techniques including day trading, swing trading, and options strategies. Learn technical analysis, risk management, and how to develop your own trading system.',
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    price: 79.99,
    category: 'trading',
    level: 'advanced',
    totalEnrollments: 890,
    tags: ['Trading', 'Advanced', 'Strategies'],
    instructor: 'Professional Trader',
    totalVideos: 4,
    videos: [
      { _id: 'v1', title: 'Advanced Technical Analysis', description: 'Master complex chart patterns', duration: 1815 },
      { _id: 'v2', title: 'Day Trading Strategies', description: 'Learn profitable day trading techniques', duration: 1720 },
      { _id: 'v3', title: 'Swing Trading Mastery', description: 'Capture multi-day price movements', duration: 2120 },
      { _id: 'v4', title: 'Options Trading Fundamentals', description: 'Understanding options and derivatives', duration: 1970 }
    ]
  },
  'sample-course-3': {
    _id: 'sample-course-3',
    title: 'Cryptocurrency Investment Guide',
    description: 'Comprehensive guide to cryptocurrency investing. Learn about Bitcoin, Ethereum, altcoins, DeFi, NFTs, and how to safely store and trade digital assets. Stay ahead in the crypto market.',
    thumbnailURL: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=600&fit=crop',
    price: 59.99,
    category: 'investing',
    level: 'intermediate',
    totalEnrollments: 2100,
    tags: ['Cryptocurrency', 'Bitcoin', 'Blockchain'],
    instructor: 'Crypto Expert',
    totalVideos: 4,
    videos: [
      { _id: 'v1', title: 'Introduction to Cryptocurrency', description: 'Understanding digital currencies', duration: 1125 },
      { _id: 'v2', title: 'Bitcoin and Ethereum Basics', description: 'Learn about the major cryptocurrencies', duration: 1470 },
      { _id: 'v3', title: 'Altcoins and DeFi', description: 'Exploring alternative cryptocurrencies', duration: 1215 },
      { _id: 'v4', title: 'NFTs and Digital Assets', description: 'Understanding non-fungible tokens', duration: 1320 }
    ]
  },
  'sample-course-4': {
    _id: 'sample-course-4',
    title: 'Real Estate Investment Fundamentals',
    description: 'Discover how to build wealth through real estate investing. Learn about property analysis, financing options, rental properties, and real estate investment strategies for long-term wealth building.',
    thumbnailURL: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
    price: 69.99,
    category: 'investing',
    level: 'beginner',
    totalEnrollments: 1560,
    tags: ['Real Estate', 'Property', 'Investment'],
    instructor: 'Real Estate Expert',
    totalVideos: 7,
    videos: [
      { _id: 'v1', title: 'Introduction to Real Estate Investing', description: 'Getting started with property investment', duration: 1520 },
      { _id: 'v2', title: 'Property Analysis Techniques', description: 'How to evaluate investment properties', duration: 1725 },
      { _id: 'v3', title: 'Financing Your Investments', description: 'Understanding mortgage and financing options', duration: 1390 },
      { _id: 'v4', title: 'Rental Property Management', description: 'Managing your rental properties effectively', duration: 1590 },
      { _id: 'v5', title: 'Real Estate Investment Strategies', description: 'Long-term wealth building through property', duration: 1490 },
      { _id: 'v6', title: 'Tax Benefits and Legal Considerations', description: 'Maximizing tax advantages', duration: 1635 },
      { _id: 'v7', title: 'Scaling Your Real Estate Portfolio', description: 'Growing your property investments', duration: 1360 }
    ]
  },
  'sample-course-5': {
    _id: 'sample-course-5',
    title: 'Portfolio Management Mastery',
    description: 'Learn professional portfolio management techniques. Understand asset allocation, diversification strategies, risk assessment, and how to optimize your investment portfolio for maximum returns.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 89.99,
    category: 'investing',
    level: 'intermediate',
    totalEnrollments: 980,
    tags: ['Portfolio', 'Management', 'Diversification'],
    instructor: 'Portfolio Manager',
    totalVideos: 6,
    videos: [
      { _id: 'v1', title: 'Portfolio Fundamentals', description: 'Understanding portfolio basics', duration: 1215 },
      { _id: 'v2', title: 'Asset Allocation Strategies', description: 'How to allocate your investments', duration: 1470 },
      { _id: 'v3', title: 'Diversification Techniques', description: 'Reducing risk through diversification', duration: 1365 },
      { _id: 'v4', title: 'Risk Assessment and Management', description: 'Evaluating and managing portfolio risk', duration: 1580 },
      { _id: 'v5', title: 'Portfolio Optimization', description: 'Maximizing returns while minimizing risk', duration: 1270 },
      { _id: 'v6', title: 'Rebalancing Your Portfolio', description: 'Maintaining optimal asset allocation', duration: 1430 }
    ]
  },
  'sample-course-6': {
    _id: 'sample-course-6',
    title: 'Options Trading Essentials',
    description: 'Master the fundamentals of options trading. Learn about calls, puts, spreads, and advanced options strategies. Perfect for traders looking to expand their trading toolkit.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 99.99,
    category: 'trading',
    level: 'advanced',
    totalEnrollments: 720,
    tags: ['Options', 'Trading', 'Derivatives'],
    instructor: 'Options Specialist',
    totalVideos: 7,
    videos: [
      { _id: 'v1', title: 'Options Basics', description: 'Understanding calls and puts', duration: 1940 },
      { _id: 'v2', title: 'Options Pricing', description: 'How options are priced', duration: 1725 },
      { _id: 'v3', title: 'Basic Options Strategies', description: 'Simple options trading strategies', duration: 2110 },
      { _id: 'v4', title: 'Advanced Spread Strategies', description: 'Complex options spreads', duration: 1830 },
      { _id: 'v5', title: 'Options Risk Management', description: 'Protecting your options positions', duration: 1995 },
      { _id: 'v6', title: 'Volatility Trading', description: 'Trading based on volatility', duration: 1790 },
      { _id: 'v7', title: 'Options Portfolio Management', description: 'Managing multiple options positions', duration: 1885 }
    ]
  },
  'sample-course-7': {
    _id: 'sample-course-7',
    title: 'Forex Trading for Beginners',
    description: 'Start your forex trading journey with this comprehensive beginner course. Learn currency pairs, market analysis, trading platforms, and essential risk management techniques.',
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    price: 54.99,
    category: 'trading',
    level: 'beginner',
    totalEnrollments: 1340,
    tags: ['Forex', 'Currency', 'Trading'],
    instructor: 'Forex Expert',
    totalVideos: 5,
    videos: [
      { _id: 'v1', title: 'Forex Market Introduction', description: 'Understanding the forex market', duration: 1170 },
      { _id: 'v2', title: 'Currency Pairs Explained', description: 'Major and minor currency pairs', duration: 1395 },
      { _id: 'v3', title: 'Forex Trading Platforms', description: 'How to use trading platforms', duration: 1305 },
      { _id: 'v4', title: 'Forex Market Analysis', description: 'Technical and fundamental analysis', duration: 1460 },
      { _id: 'v5', title: 'Forex Risk Management', description: 'Protecting your capital in forex', duration: 1250 }
    ]
  },
  'sample-course-8': {
    _id: 'sample-course-8',
    title: 'Bond Investment Strategies',
    description: 'Understand the bond market and learn how to invest in bonds effectively. Cover government bonds, corporate bonds, bond funds, and how to build a fixed-income portfolio.',
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    price: 64.99,
    category: 'investing',
    level: 'intermediate',
    totalEnrollments: 650,
    tags: ['Bonds', 'Fixed Income', 'Investment'],
    instructor: 'Fixed Income Specialist',
    totalVideos: 6,
    videos: [
      { _id: 'v1', title: 'Introduction to Bonds', description: 'Understanding bond basics', duration: 1330 },
      { _id: 'v2', title: 'Government Bonds', description: 'Investing in government securities', duration: 1530 },
      { _id: 'v3', title: 'Corporate Bonds', description: 'Understanding corporate debt', duration: 1425 },
      { _id: 'v4', title: 'Bond Funds and ETFs', description: 'Diversified bond investments', duration: 1460 },
      { _id: 'v5', title: 'Bond Portfolio Construction', description: 'Building a bond portfolio', duration: 1295 },
      { _id: 'v6', title: 'Bond Market Analysis', description: 'Analyzing bond market trends', duration: 1600 }
    ]
  },
  'sample-course-9': {
    _id: 'sample-course-9',
    title: 'Day Trading Fundamentals',
    description: 'Learn day trading strategies and techniques. Master chart patterns, technical indicators, entry and exit points, and how to manage risk in fast-paced trading environments.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 84.99,
    category: 'trading',
    level: 'advanced',
    totalEnrollments: 1120,
    tags: ['Day Trading', 'Technical Analysis', 'Strategies'],
    instructor: 'Day Trading Pro',
    totalVideos: 7,
    videos: [
      { _id: 'v1', title: 'Day Trading Basics', description: 'Getting started with day trading', duration: 1710 },
      { _id: 'v2', title: 'Chart Patterns for Day Trading', description: 'Identifying profitable patterns', duration: 1875 },
      { _id: 'v3', title: 'Technical Indicators', description: 'Using indicators effectively', duration: 1785 },
      { _id: 'v4', title: 'Entry and Exit Strategies', description: 'Timing your trades perfectly', duration: 2000 },
      { _id: 'v5', title: 'Risk Management in Day Trading', description: 'Protecting your capital', duration: 1670 },
      { _id: 'v6', title: 'Psychology of Day Trading', description: 'Mental discipline for traders', duration: 1810 },
      { _id: 'v7', title: 'Building a Day Trading System', description: 'Creating your trading plan', duration: 1945 }
    ]
  },
  'sample-course-10': {
    _id: 'sample-course-10',
    title: 'Value Investing Principles',
    description: 'Learn the principles of value investing from legendary investors. Understand how to identify undervalued stocks, analyze company fundamentals, and build a long-term value portfolio.',
    thumbnailURL: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop',
    price: 74.99,
    category: 'investing',
    level: 'intermediate',
    totalEnrollments: 890,
    tags: ['Value Investing', 'Fundamentals', 'Analysis'],
    instructor: 'Value Investing Expert',
    totalVideos: 6,
    videos: [
      { _id: 'v1', title: 'Value Investing Philosophy', description: 'Understanding value investing principles', duration: 1580 },
      { _id: 'v2', title: 'Fundamental Analysis', description: 'Analyzing company fundamentals', duration: 1725 },
      { _id: 'v3', title: 'Identifying Undervalued Stocks', description: 'Finding hidden gems in the market', duration: 1530 },
      { _id: 'v4', title: 'Financial Statement Analysis', description: 'Reading and interpreting financials', duration: 1635 },
      { _id: 'v5', title: 'Building a Value Portfolio', description: 'Constructing a value-focused portfolio', duration: 1780 },
      { _id: 'v6', title: 'Long-term Value Strategies', description: 'Patience and discipline in investing', duration: 1490 }
    ]
  },
  'sample-course-11': {
    _id: 'sample-course-11',
    title: 'Swing Trading Masterclass',
    description: 'Master swing trading strategies that capture multi-day price movements. Learn position sizing, trade management, and how to identify high-probability swing trading setups.',
    thumbnailURL: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    price: 94.99,
    category: 'trading',
    level: 'intermediate',
    totalEnrollments: 1050,
    tags: ['Swing Trading', 'Strategies', 'Technical Analysis'],
    instructor: 'Swing Trading Expert',
    totalVideos: 6,
    videos: [
      { _id: 'v1', title: 'Swing Trading Introduction', description: 'Understanding swing trading', duration: 1815 },
      { _id: 'v2', title: 'Identifying Swing Setups', description: 'Finding high-probability trades', duration: 1710 },
      { _id: 'v3', title: 'Position Sizing Strategies', description: 'How much to risk per trade', duration: 1965 },
      { _id: 'v4', title: 'Trade Management Techniques', description: 'Managing open positions', duration: 1750 },
      { _id: 'v5', title: 'Swing Trading Indicators', description: 'Best indicators for swing trading', duration: 1870 },
      { _id: 'v6', title: 'Building a Swing Trading System', description: 'Creating your trading plan', duration: 1670 }
    ]
  },
  'sample-course-12': {
    _id: 'sample-course-12',
    title: 'Risk Management in Trading',
    description: 'Essential risk management techniques for traders. Learn position sizing, stop-loss strategies, risk-reward ratios, and how to protect your capital while maximizing profits.',
    thumbnailURL: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    price: 69.99,
    category: 'trading',
    level: 'intermediate',
    totalEnrollments: 1420,
    tags: ['Risk Management', 'Trading', 'Protection'],
    instructor: 'Risk Management Expert',
    totalVideos: 5,
    videos: [
      { _id: 'v1', title: 'Risk Management Fundamentals', description: 'Understanding trading risks', duration: 1470 },
      { _id: 'v2', title: 'Position Sizing Methods', description: 'Calculating position sizes', duration: 1575 },
      { _id: 'v3', title: 'Stop-Loss Strategies', description: 'Protecting your trades', duration: 1425 },
      { _id: 'v4', title: 'Risk-Reward Ratios', description: 'Finding profitable setups', duration: 1640 },
      { _id: 'v5', title: 'Capital Protection Techniques', description: 'Safeguarding your trading account', duration: 1430 }
    ]
  }
};

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

  // Fetch course data - USING SAMPLE DATA ONLY
  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Use sample courses only (backend fetching disabled)
        if (id && sampleCourses[id]) {
          console.log('📝 Using sample course data for:', id);
          const sampleCourse = sampleCourses[id];
          
          // Calculate total duration from videos
          if (sampleCourse.videos) {
            const totalSeconds = sampleCourse.videos.reduce((acc, video) => acc + (video.duration || 0), 0);
            sampleCourse.totalDuration = totalSeconds;
          }
          
          setCourse(sampleCourse);
          setLoading(false);
        } else {
          throw new Error(t('course_detail.course_not_found'));
        }

      } catch (error) {
        console.error('❌ Error loading course:', error);
        setError(error instanceof Error ? error.message : t('course_detail.failed_to_load_course'));
        setLoading(false);
      }
    };

    fetchCourse();
  }, [id, t]);

  // Fetch video data for the course - USING SAMPLE DATA ONLY
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id || !course) return;

      // Use sample course data only (backend fetching disabled)
      const isSampleCourse = id && sampleCourses[id];
      
      if (isSampleCourse) {
        // Convert sample course videos to the format expected by the video player
        const sampleVideos: Video[] = (course.videos || []).map((video, index) => ({
          id: video._id,
          title: video.title || `Lesson ${index + 1}`,
          duration: video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '0:00',
          videoUrl: '', // Sample courses don't have actual video URLs
          completed: false,
          locked: index > 0, // First video is free preview, rest are locked
          isFreePreview: index === 0, // First video is free preview
          requiresPurchase: true,
          progress: undefined
        }));
        
        // Build duration map for accurate display
        const durationMap: Record<string, number> = {};
        course.videos?.forEach(video => {
          if (video.duration) {
            durationMap[video._id] = video.duration;
          }
        });
        setDurationById(durationMap);
        
        const totalSecs = Object.values(durationMap).reduce((a, b) => a + (b || 0), 0);
        setTotalCourseDurationSeconds(totalSecs);
        
        setCourseData({
          title: course.title,
          videos: sampleVideos,
          userHasPurchased: false,
          overallProgress: {
            totalVideos: sampleVideos.length,
            completedVideos: 0,
            totalProgress: 0,
            lastWatchedVideo: null,
            lastWatchedPosition: 0
          }
        });
        
        // Set first video as current if available
        if (sampleVideos.length > 0) {
          setCurrentVideoId(sampleVideos[0].id);
        }
        
        return;
      }
      
      // Backend fetching disabled - if not sample course, show error
      console.log('⚠️ Course not found in sample data:', id);
      return;

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
                {course.totalEnrollments && (
                  <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">{course.totalEnrollments.toLocaleString()} {t('course_detail.students')}</span>
                  </div>
                )}
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