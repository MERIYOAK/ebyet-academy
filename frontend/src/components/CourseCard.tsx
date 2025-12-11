import React, { useState, useMemo, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useTranslation } from 'react-i18next';

import { Link, useNavigate } from 'react-router-dom';
import { Clock, Users, Star, Play, ShoppingCart, CheckCircle, Loader, BookOpen } from 'lucide-react';
import { formatDuration } from '../utils/durationFormatter';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  price: number;
  duration: string;
  students: number;
  lessons: number; // Add lessons prop
  instructor: string;
  tags?: string[];
  className?: string;
  onPurchaseSuccess?: () => void;
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
  onPurchaseSuccess
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

      console.log(`🔧 Initiating purchase for course: ${title} (${id})`);

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
    if (purchaseStatus === 'loading' || isLoading) {
      return (
        <button
          disabled
          className="group/btn relative w-full bg-white text-blue-600 font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 xxs:space-x-2 cursor-not-allowed text-sm xxs:text-base overflow-hidden"
          style={{
            boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
          }}
        >
          <Loader className="h-4 w-4 xxs:h-5 xxs:w-5 animate-spin" />
          <span>{t('course_card.processing')}</span>
        </button>
      );
    }

    if (purchaseStatus === 'error') {
      return (
        <div className="w-full bg-white text-red-600 font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 xxs:space-x-2 text-sm xxs:text-base">
          <span>{t('course_card.error')}: {errorMessage}</span>
        </div>
      );
    }

    return (
      <button
        onClick={handleBuyClick}
        className="group/btn relative w-full bg-white text-blue-600 font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-500 transform hover:scale-110 overflow-hidden flex items-center justify-center space-x-1 xxs:space-x-2 text-sm xxs:text-base"
        style={{
          boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
        }}
      >
        {/* Animated gradient background on hover */}
        <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
        {/* Shimmer effect */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
        <ShoppingCart className="h-4 w-4 xxs:h-5 xxs:w-5 relative z-10 group-hover/btn:text-white transition-colors duration-300" />
        <span className="relative z-10 group-hover/btn:text-white transition-colors duration-300">{t('course_card.buy_now')} - ${price}</span>
      </button>
    );
  };

  return (
    <div 
      className={`rounded-2xl overflow-hidden group flex flex-col relative hover:-translate-y-2 transition-all duration-500 max-w-sm mx-auto ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 10px 40px rgba(30, 58, 138, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)',
        transition: 'all 0.5s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 16px 60px rgba(30, 58, 138, 0.6), 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2)';
        e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 40px rgba(30, 58, 138, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)';
        e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.3)';
      }}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden h-48 sm:h-56">
        {imgLoading && (
          <div className="w-full h-full bg-gray-800/50 flex items-center justify-center">
            <div className="text-white/70 text-sm xxs:text-base">{t('course_card.loading')}</div>
          </div>
        )}
        <img
          src={imgSrc}
          onLoad={handleImageLoad}
          onError={handleImageError}
          alt={title}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${imgLoading ? 'hidden' : ''}`}
          style={{ display: imgLoading ? 'none' : 'block' }}
        />
        {imgError && (
          <div className="absolute top-2 left-2 bg-red-500/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
            {t('course_card.image_error')}
          </div>
        )}
        
        {/* Bestseller Tag */}
        <div className="absolute top-3 left-3">
          <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm">
            Bestseller
          </span>
        </div>

        {/* Hover Overlay with Buttons */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-3">
            <Link 
              to={`/course/${id}`}
              className="group/btn relative bg-white text-blue-600 rounded-full p-3 shadow-2xl hover:scale-110 transition-all duration-500 overflow-hidden cursor-pointer"
              style={{
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated gradient background on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
              <Play className="h-6 w-6 relative z-10 group-hover/btn:text-white transition-colors duration-300" />
            </Link>
            <button
              onClick={handleBuyClick}
              disabled={isLoading || purchaseStatus === 'loading'}
              className="group/btn relative bg-white text-blue-600 rounded-full p-3 shadow-2xl hover:scale-110 transition-all duration-500 overflow-hidden cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(59, 130, 246, 0.2)'
              }}
            >
              {/* Animated gradient background on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
              {/* Shimmer effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out" />
              {isLoading || purchaseStatus === 'loading' ? (
                <Loader className="h-6 w-6 relative z-10 group-hover/btn:text-white transition-colors duration-300 animate-spin" />
              ) : (
                <ShoppingCart className="h-6 w-6 relative z-10 group-hover/btn:text-white transition-colors duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 xxs:p-6 flex flex-col flex-grow">
        {/* Category Tag */}
        {tags && tags.length > 0 && (
          <div className="mb-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/30">
              {tags[0]}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg xxs:text-xl sm:text-2xl font-bold text-white mb-3 line-clamp-2 drop-shadow-lg">
          {title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
            <Star className="h-4 w-4 text-yellow-400/50" />
          </div>
          <span className="text-white/90 text-sm">4.0 (75 {t('course_card.review') || 'Review'})</span>
        </div>

        {/* Price and Lessons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl xxs:text-3xl font-bold text-white">${price}</span>
            <span className="text-white/60 text-sm line-through">${Math.round(price * 0.75)}</span>
          </div>
          <div className="flex items-center gap-1 text-white/90 text-sm">
            <BookOpen className="h-4 w-4" />
            <span>{lessons} {t('course_card.lessons')}</span>
          </div>
        </div>

        {/* Hidden buttons that appear on hover - shown in image overlay instead */}
        <div className="hidden">
          {renderActionButton()}
          <Link
            to={`/course/${id}`}
            className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-xl text-center block text-sm xxs:text-base shadow-gray-400/40 hover:shadow-gray-500/60 border border-gray-200/50"
          >
            {t('course_card.view_details')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;