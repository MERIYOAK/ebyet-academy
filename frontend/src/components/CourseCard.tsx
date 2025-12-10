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
         className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2 xxs:py-3 px-4 xxs:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-2xl hover:shadow-3xl flex items-center justify-center space-x-1 xxs:space-x-2 text-sm xxs:text-base shadow-red-500/40 hover:shadow-red-600/60 border border-red-500/20"
       >
        <ShoppingCart className="h-4 w-4 xxs:h-5 xxs:w-5" />
        <span>{t('course_card.buy_now')} - ${price}</span>
      </button>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-4 hover:rotate-1 overflow-hidden group flex flex-col ${className} shadow-gray-300/60 hover:shadow-gray-400/80 border border-gray-200 sm:border-gray-100/50 ring-1 ring-gray-200 sm:ring-0`}>
             <div className="relative overflow-hidden h-36 xxs:h-40 sm:h-48 shadow-inner">
        {imgLoading && (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-gray-500 text-sm xxs:text-base">{t('course_card.loading')}</div>
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
          <div className="absolute top-2 left-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
            {t('course_card.image_error')}
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <Link 
               to={`/course/${id}`}
               className="bg-white rounded-full p-2 xxs:p-3 shadow-2xl hover:shadow-3xl hover:bg-gray-100 hover:scale-125 transition-all duration-500 cursor-pointer shadow-gray-400/60 hover:shadow-gray-500/80 transform hover:-translate-y-1"
               onClick={(e) => e.stopPropagation()}
             >
              <Play className="h-5 w-5 xxs:h-6 xxs:w-6 text-red-600" />
            </Link>
          </div>
        </div>
                 <div className="absolute top-3 xxs:top-4 right-3 xxs:right-4">
           <span className="bg-red-600 text-white px-2 xxs:px-3 py-1 rounded-full text-xs xxs:text-sm font-semibold shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
             ${price}
           </span>
         </div>
      </div>

             <div className="p-4 xxs:p-6 flex flex-col flex-grow bg-white sm:bg-gradient-to-b sm:from-white sm:to-gray-50/30">
                 <div className="flex items-center justify-between mb-2">
           <div className="flex items-center space-x-1 text-gray-500 text-xs xxs:text-sm">
             <Users className="h-3 w-3 xxs:h-4 xxs:w-4" />
             <span>{students.toLocaleString()} {t('course_card.students')}</span>
           </div>
         </div>

                 <h3 className="text-base xxs:text-lg sm:text-xl font-bold text-gray-800 mb-2 line-clamp-2 h-12 xxs:h-14 sm:h-16 group-hover:text-red-600 transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md">
           {title}
         </h3>

        <p className="text-gray-600 text-xs xxs:text-sm mb-3 xxs:mb-4 line-clamp-3 flex-grow">
          {description}
        </p>

        {/* Course Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 xxs:gap-2 mb-3 xxs:mb-4">
            {tags.slice(0, 3).map((tag, index) => (
                             <span
                 key={index}
                 className="inline-flex items-center px-2 xxs:px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
               >
                {tag}
              </span>
            ))}
                         {tags.length > 3 && (
               <span className="inline-flex items-center px-2 xxs:px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
                 +{tags.length - 3} {t('course_card.more_tags')}
               </span>
             )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 xxs:mb-4">
          <div className="flex items-center space-x-1 text-gray-500 text-xs xxs:text-sm">
            <Clock className="h-3 w-3 xxs:h-4 xxs:w-4" />
            <span>{lessons} {t('course_card.lessons')}</span>
          </div>
          <span className="text-xs xxs:text-sm text-gray-500">{formattedDuration}</span>
        </div>

        <div className="space-y-2 xxs:space-y-3">
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