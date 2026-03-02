import React, { useState, useMemo, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { useTranslation } from 'react-i18next';

import { Link, useNavigate } from 'react-router-dom';
import { Clock, Star, Play, ShoppingCart, CheckCircle, Loader, Trophy, BookOpen } from 'lucide-react';
import { formatDuration } from '../utils/durationFormatter';
import { getLocalizedText } from '../utils/bilingualHelper';

interface CourseCardProps {
  id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
  thumbnail: string;
  price: number;
  duration: string;
  students: number;
  lessons: number;
  instructor: string;
  tags?: string[];
  className?: string;
  onPurchaseSuccess?: () => void;
  isPurchased?: boolean;
  // Dashboard-specific props (optional)
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  lastWatched?: string | null;
  videos?: any[];
  isCompleted?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  thumbnail,
  price,
  duration,
  students,
  lessons,
  instructor,
  tags = [],
  className = '',
  onPurchaseSuccess,
  isPurchased = false,
  // Dashboard-specific props
  progress,
  totalLessons,
  completedLessons,
  lastWatched,
  videos,
  isCompleted
}) => {
  // Use progress prop if provided (e.g., from dashboard), otherwise fetch via hook
  const { progress: hookProgress, loading: progressLoading } = useCourseProgress(
    isPurchased && progress === undefined ? id : undefined
  );
  
  // Use prop progress if available, otherwise use hook progress
  const courseProgress = progress !== undefined 
    ? {
        courseProgressPercentage: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0,
        totalVideos: totalLessons || lessons || 0,
        completedVideos: completedLessons || 0,
        isCompleted: isCompleted || false
      }
    : hookProgress;
  
  // Determine if we're using prop data (no loading needed) or hook data (might be loading)
  const isUsingPropProgress = progress !== undefined;
  const effectiveProgressLoading = isUsingPropProgress ? false : progressLoading;
  
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = (i18n.language || 'en') as 'en' | 'tg';
  
  // Get localized text based on current language
  const localizedTitle = getLocalizedText(title, currentLanguage);
  const localizedDescription = getLocalizedText(description, currentLanguage);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Link to course detail page
  const watchLink = `/course/${id}`;

  // Determine if course is completed using progress data
  const courseCompleted = courseProgress?.isCompleted || 
    (isPurchased && isCompleted) ||
    (isPurchased && (courseProgress?.courseProgressPercentage ?? 0) >= 100);

  // Get course condition text using progress data
  const getCourseCondition = () => {
    if (!courseProgress && !isPurchased) {
      return null;
    }

    const progressValue = courseProgress?.courseProgressPercentage ?? progress ?? 0;

    if (courseCompleted) {
      return {
        text: t('dashboard_card.review_course'),
        color: "text-green-700",
        bgColor: "bg-green-50",
        borderColor: "border-green-200"
      };
    } else if (progressValue >= 50) {
      return {
        text: t('dashboard_card.great_progress'),
        color: "text-blue-700",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200"
      };
    } else if (progressValue > 0) {
      return {
        text: t('dashboard_card.keep_going'),
        color: "text-orange-700",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200"
      };
    } else {
      return {
        text: t('dashboard_card.start_course'),
        color: "text-gray-700",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200"
      };
    }
  };

  const condition = isPurchased && !effectiveProgressLoading ? getCourseCondition() : null;

  const formattedDuration = useMemo(() => {
    return formatDuration(duration);
  }, [duration]);

  // CourseCard rendering

  const placeholderThumb = useMemo(
    () =>
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect fill='#f3f4f6' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='24' fill='#9ca3af'>" + t('course_card.thumbnail_placeholder') + "</text></svg>"
      ),
    []
  );

  const [imgSrc, setImgSrc] = useState<string>(thumbnail || placeholderThumb);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  // Track image source changes
  useEffect(() => {
    // Image source updated
  }, [imgSrc, imgLoading, imgError, title, placeholderThumb]);

  const handleImageLoad = () => {
    setImgLoading(false);
    setImgError(false);
  };

  const handleImageError = () => {
    setImgSrc(placeholderThumb);
    setImgLoading(false);
    setImgError(true);
  };

  const handleBuyClick = async () => {
    try {
      setIsLoading(true);
      setPurchaseStatus('loading');
      setErrorMessage('');

      console.log(`🔧 Initiating purchase for course: ${localizedTitle} (${id})`);

      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No authentication token found');
        navigate('/login');
        return;
      }

      // Create checkout session
      const response = await fetch(buildApiUrl('/api/payment/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      console.log(`✅ Checkout session created: ${data.sessionId}`);
      console.log(`   - Redirect URL: ${data.url}`);

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('❌ Purchase error:', error);
      setPurchaseStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Purchase failed');
      
      // Reset error after 5 seconds
      setTimeout(() => {
        setPurchaseStatus('idle');
        setErrorMessage('');
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionButton = () => {
    // If purchased, show appropriate button based on progress
    if (isPurchased) {
      // Use watch link if available, otherwise course detail page
      const continueLink = watchLink || `/course/${id}`;
      
      return (
        <Link
          to={continueLink}
          className="w-full block"
        >
          <button
            className={`w-full font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-1 xxs:space-x-2 text-sm xxs:text-base border ${
              courseCompleted
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-500'
                : 'bg-green-600 hover:bg-green-700 text-white border-green-500'
            }`}
          >
            <Play className="h-4 w-4 xxs:h-5 xxs:w-5" />
            <span>
              {courseProgress?.isCompleted 
                ? t('dashboard_card.review_course', 'Review Course')
                : (courseProgress?.courseProgressPercentage ?? 0) > 0 
                  ? t('dashboard_card.continue', 'Continue')
                  : t('dashboard_card.start_course', 'Start Course')
              }
            </span>
          </button>
        </Link>
      );
    }

    if (purchaseStatus === 'loading' || isLoading) {
      return (
        <button
          disabled
          className="w-full bg-gray-400 text-white font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 xxs:space-x-2 cursor-not-allowed text-sm xxs:text-base"
        >
          <Loader className="h-4 w-4 xxs:h-5 xxs:w-5 animate-spin" />
          <span>{t('course_card.processing')}</span>
        </button>
      );
    }

    if (purchaseStatus === 'error') {
      return (
        <div className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 xxs:space-x-2 text-sm xxs:text-base">
          <span>{t('course_card.error')}: {errorMessage}</span>
        </div>
      );
    }

    return (
             <button
         onClick={handleBuyClick}
         className="w-full text-white font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-1 xxs:space-x-2 text-sm xxs:text-base border"
         style={{
           backgroundColor: '#00BFFF',
           borderColor: '#00BFFF',
           boxShadow: '0 20px 25px -5px rgba(0, 191, 255, 0.3), 0 10px 10px -5px rgba(0, 191, 255, 0.2)'
         }}
         onMouseEnter={(e) => {
           e.currentTarget.style.backgroundColor = '#00CED1';
           e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 191, 255, 0.4)';
         }}
         onMouseLeave={(e) => {
           e.currentTarget.style.backgroundColor = '#00BFFF';
           e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 191, 255, 0.3), 0 10px 10px -5px rgba(0, 191, 255, 0.2)';
         }}
       >
        <ShoppingCart className="h-4 w-4 xxs:h-5 xxs:w-5 transition-transform duration-500 ease-in-out group-hover:rotate-12" />
        <span>{t('course_card.buy_now')}</span>
      </button>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 hover:scale-[1.01] overflow-hidden group flex flex-col w-full ${className} shadow-gray-900/40 hover:shadow-cyan-500/20 border border-gray-700/50 hover:border-cyan-500/50 ring-1 ring-gray-700/50 hover:ring-cyan-500/50 relative will-change-transform ${
      courseCompleted && isPurchased
        ? 'ring-2 ring-green-500 ring-opacity-50'
        : ''
    }`}>
      {/* Completion badge */}
      {courseCompleted && isPurchased && (
        <div className="absolute top-3 xxs:top-4 right-3 xxs:right-4 z-10">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 xxs:px-3 py-1 rounded-full text-xs xxs:text-sm font-semibold shadow-lg border border-green-400 flex items-center space-x-1">
            <Trophy className="h-3 w-3 xxs:h-4 xxs:w-4" />
            <span>{t('dashboard_card.completed', 'Completed')}</span>
          </div>
        </div>
      )}
      
      {/* Purchased badge (if not completed) */}
      {isPurchased && !courseCompleted && (
        <div className="absolute top-3 xxs:top-4 right-3 xxs:right-4 z-10">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 xxs:px-3 py-1 rounded-full text-xs xxs:text-sm font-semibold shadow-lg border border-green-400 flex items-center space-x-1">
            <CheckCircle className="h-3 w-3 xxs:h-4 xxs:w-4" />
            <span>{t('course_card.purchased', 'Purchased')}</span>
          </div>
        </div>
      )}
      
      <div className="relative overflow-hidden h-36 xxs:h-40 sm:h-44 shadow-inner">
        {imgLoading && (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <div className="text-gray-400 text-sm xxs:text-base">{t('course_card.loading')}</div>
          </div>
        )}
        <img
          src={imgSrc}
          onLoad={handleImageLoad}
          onError={handleImageError}
          alt={localizedTitle}
          className={`w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000 ease-in-out ${imgLoading ? 'hidden' : ''} will-change-transform`}
          style={{ 
            display: imgLoading ? 'none' : 'block',
            imageRendering: 'auto'
          }}
        />
        {imgError && (
          <div className="absolute top-2 left-2 bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs border border-red-700/50">
            {t('course_card.image_error')}
          </div>
        )}
        {/* Hover overlay - different for purchased vs non-purchased courses */}
        {isPurchased ? (
          // Purchased courses: Single "Continue Learning" button in center
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50 bg-opacity-0 group-hover:bg-opacity-100 transition-all duration-500 ease-out flex items-center justify-center">
            <Link
              to={watchLink || `/course/${id}`}
              onClick={(e) => e.stopPropagation()}
              className={`opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-3 xxs:py-3.5 px-6 xxs:px-8 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2 text-sm xxs:text-base border border-green-400`}
            >
              <Play className="h-4 w-4 xxs:h-5 xxs:w-5" />
              <span>{t('course_card.continue_learning', 'Continue Learning')}</span>
            </Link>
          </div>
        ) : (
          // Non-purchased courses: Show action button and view details
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50 bg-opacity-0 group-hover:bg-opacity-100 transition-all duration-500 ease-out flex items-center justify-center">
            <div className={`w-full px-3 xxs:px-4 sm:px-6 space-y-2 xxs:space-y-2.5 ${purchaseStatus === 'loading' || purchaseStatus === 'error' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'} transition-all duration-500 ease-out`}>
              {/* Show loading/error states always, but hide normal buttons until hover */}
              <div className={purchaseStatus === 'loading' || purchaseStatus === 'error' ? '' : ''}>
                {renderActionButton()}
              </div>
              
              <Link
                to={`/course/${id}`}
                onClick={(e) => e.stopPropagation()}
                className={`w-full bg-transparent hover:bg-cyan-500/20 text-white font-semibold py-2 xxs:py-2.5 px-3 xxs:px-4 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl text-center block text-xs xxs:text-sm border border-cyan-400/50 hover:border-cyan-300/70 ${purchaseStatus === 'loading' || purchaseStatus === 'error' ? '' : ''}`}
              >
                {t('course_card.view_details')}
              </Link>
            </div>
          </div>
        )}
        {/* Progress indicator for all courses */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-700 h-1">
          {isPurchased ? (
            (() => {
              const progressValue = courseProgress?.courseProgressPercentage ?? progress ?? 0;
              const isCompletedStatus = courseProgress?.isCompleted ?? isCompleted ?? false;
              const clampedProgress = Math.min(100, Math.max(0, progressValue));
              return (
                <div
                  className={`h-1 transition-all duration-500 ${
                    isCompletedStatus || progressValue >= 100
                      ? 'bg-gradient-to-r from-green-500 to-green-600' 
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{ width: `${clampedProgress}%` }}
                />
              );
            })()
          ) : (
            <div className="h-1 bg-gray-600" style={{ width: '0%' }} />
          )}
        </div>
      </div>

             <div className="p-3 xxs:p-4 pb-2 xxs:pb-3 flex flex-col flex-grow bg-gray-800 sm:bg-gradient-to-b sm:from-gray-800 sm:to-gray-900/30">
                 <h3 className="text-sm xxs:text-base sm:text-lg font-bold text-white mb-1.5 line-clamp-2 h-10 xxs:h-12 sm:h-14 group-hover:text-cyan-400 transition-all duration-700 ease-in-out drop-shadow-sm group-hover:drop-shadow-md group-hover:translate-x-1">
           {localizedTitle}
         </h3>

        <p className="text-gray-300 text-xs mb-3 xxs:mb-3.5 line-clamp-3 flex-grow min-h-[2.5rem] xxs:min-h-[3rem]">
          {localizedDescription}
        </p>

        {/* Course Tags (for unpurchased) or Progress Condition Text (for purchased) */}
        {isPurchased ? (
          // Show progress condition text for purchased courses (in tags location, styled like tags)
          condition && (
            <div className="flex flex-wrap gap-1 xxs:gap-2 mb-3 xxs:mb-3.5">
              <span className="inline-flex items-center px-2 xxs:px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 border border-blue-500/30 line-clamp-1 truncate max-w-full">
                {condition.text}
              </span>
            </div>
          )
        ) : (
          // Show tags for unpurchased courses
          tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 xxs:gap-2 mb-3 xxs:mb-3.5">
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 xxs:px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 border border-blue-500/30"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="inline-flex items-center px-2 xxs:px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 border border-gray-600">
                  +{tags.length - 3} {t('course_card.more_tags')}
                </span>
              )}
            </div>
          )
        )}

        {/* Regular info for all courses */}
        <div className="flex items-center justify-between mb-2 xxs:mb-2.5 mt-auto">
          <div className="flex items-center space-x-1 text-gray-400 text-xs xxs:text-sm">
            <Clock className="h-3 w-3 xxs:h-4 xxs:w-4" />
            <span>{isPurchased ? (courseProgress?.totalVideos || totalLessons || lessons || 0) : (lessons || 0)} {t('course_card.lessons')}</span>
          </div>
          <span className="text-xs xxs:text-sm text-gray-400">{formattedDuration}</span>
        </div>
        
      </div>
    </div>
  );
};

export default CourseCard;