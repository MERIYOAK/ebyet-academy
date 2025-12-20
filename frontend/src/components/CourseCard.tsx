import React, { useState, useMemo, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useTranslation } from 'react-i18next';

import { Link, useNavigate } from 'react-router-dom';
import { Clock, Users, Star, Play, ShoppingCart, CheckCircle, Loader } from 'lucide-react';
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
    <div className={`bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-700 ease-in-out transform hover:-translate-y-6 hover:scale-[1.02] overflow-hidden group flex flex-col ${className} shadow-gray-900/40 hover:shadow-cyan-500/20 border border-gray-700/50 hover:border-cyan-500/50 ring-1 ring-gray-700/50 hover:ring-cyan-500/50 relative will-change-transform`}>
             <div className="relative overflow-hidden h-36 xxs:h-40 sm:h-48 shadow-inner">
        {imgLoading && (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <div className="text-gray-400 text-sm xxs:text-base">{t('course_card.loading')}</div>
          </div>
        )}
        <img
          src={imgSrc}
          onLoad={handleImageLoad}
          onError={handleImageError}
          alt={title}
          className={`w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000 ease-in-out ${imgLoading ? 'hidden' : ''} will-change-transform`}
          style={{ display: imgLoading ? 'none' : 'block' }}
        />
        {imgError && (
          <div className="absolute top-2 left-2 bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs border border-red-700/50">
            {t('course_card.image_error')}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50 bg-opacity-0 group-hover:bg-opacity-100 transition-all duration-500 ease-out flex items-center justify-center backdrop-blur-[2px] group-hover:backdrop-blur-0">
          <div className={`w-full px-3 xxs:px-4 sm:px-6 space-y-2 xxs:space-y-2.5 ${purchaseStatus === 'loading' || purchaseStatus === 'error' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'} transition-all duration-500 ease-out`}>
            {/* Show loading/error states always, but hide normal buttons until hover */}
            <div className={purchaseStatus === 'loading' || purchaseStatus === 'error' ? '' : ''}>
              {renderActionButton()}
            </div>
            
            <Link
              to={`/course/${id}`}
              onClick={(e) => e.stopPropagation()}
              className={`w-full bg-transparent hover:bg-cyan-500/20 text-white font-semibold py-2 xxs:py-2.5 px-3 xxs:px-4 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl text-center block text-xs xxs:text-sm backdrop-blur-sm border border-cyan-400/50 hover:border-cyan-300/70 ${purchaseStatus === 'loading' || purchaseStatus === 'error' ? '' : ''}`}
            >
              {t('course_card.view_details')}
            </Link>
          </div>
        </div>
                 <div className="absolute top-3 xxs:top-4 right-3 xxs:right-4 z-10">
           <span className="text-white px-2 xxs:px-3 py-1 rounded-full text-xs xxs:text-sm font-semibold shadow-lg transform rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-in-out group-hover:shadow-xl will-change-transform"
           style={{
             backgroundColor: '#00BFFF',
             boxShadow: '0 10px 15px -3px rgba(0, 191, 255, 0.3), 0 4px 6px -2px rgba(0, 191, 255, 0.2)'
           }}
           onMouseEnter={(e) => {
             e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 191, 255, 0.4), 0 10px 10px -5px rgba(0, 191, 255, 0.3)';
           }}
           onMouseLeave={(e) => {
             e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 191, 255, 0.3), 0 4px 6px -2px rgba(0, 191, 255, 0.2)';
           }}>
             ${price}
           </span>
         </div>
      </div>

             <div className="p-4 xxs:p-6 flex flex-col flex-grow bg-gray-800 sm:bg-gradient-to-b sm:from-gray-800 sm:to-gray-900/30">
                 <div className="flex items-center justify-between mb-2">
           <div className="flex items-center space-x-1 text-gray-400 text-xs xxs:text-sm">
             <Users className="h-3 w-3 xxs:h-4 xxs:w-4" />
             <span>{students.toLocaleString()} {t('course_card.students')}</span>
           </div>
         </div>

                 <h3 className="text-base xxs:text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2 h-12 xxs:h-14 sm:h-16 group-hover:text-cyan-400 transition-all duration-700 ease-in-out drop-shadow-sm group-hover:drop-shadow-md group-hover:translate-x-1">
           {title}
         </h3>

        <p className="text-gray-300 text-xs xxs:text-sm mb-3 xxs:mb-4 line-clamp-3 flex-grow">
          {description}
        </p>

        {/* Course Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 xxs:gap-2 mb-3 xxs:mb-4">
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
        )}

        <div className="flex items-center justify-between mb-3 xxs:mb-4">
          <div className="flex items-center space-x-1 text-gray-400 text-xs xxs:text-sm">
            <Clock className="h-3 w-3 xxs:h-4 xxs:w-4" />
            <span>{lessons} {t('course_card.lessons')}</span>
          </div>
          <span className="text-xs xxs:text-sm text-gray-400">{formattedDuration}</span>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;