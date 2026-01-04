import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ShoppingCart, Tag, Eye, CheckCircle, Play } from 'lucide-react';
import { getLocalizedText } from '../utils/bilingualHelper';

interface BundleCardProps {
  bundle: {
    id: string;
    title: string | { en: string; tg: string };
    description: string | { en: string; tg: string };
    longDescription?: string | { en: string; tg: string };
    price: number;
    originalValue?: number;
    courseIds: string[];
    thumbnailURL?: string;
    category?: string;
    featured?: boolean;
    maxEnrollments?: number;
    totalEnrollments?: number;
    hasReachedMaxEnrollments?: boolean;
    isPurchased?: boolean;
  };
  className?: string;
}

const BundleCard: React.FC<BundleCardProps> = ({ bundle, className = '' }) => {
  const { t, i18n } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const currentLanguage = (i18n.language || 'en') as 'en' | 'tg';
  
  // Get localized text based on current language
  const localizedTitle = getLocalizedText(bundle.title, currentLanguage);
  const localizedDescription = getLocalizedText(bundle.description, currentLanguage);

  // Calculate savings percentage if originalValue is available
  const savingsPercentage = bundle.originalValue
    ? Math.round(((bundle.originalValue - bundle.price) / bundle.originalValue) * 100)
    : null;

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 ease-in-out transform hover:-translate-y-2 overflow-hidden group flex flex-col sm:flex-row ${className} border border-gray-200 dark:border-gray-700/50 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 relative`}
    >
      {/* Bundle Image/Thumbnail - Horizontal Layout */}
      <div className="relative overflow-hidden w-full sm:w-48 md:w-56 lg:w-64 h-48 sm:h-auto sm:min-h-[180px] flex-shrink-0">
        {bundle.thumbnailURL && !imgError ? (
          <img
            src={bundle.thumbnailURL}
            alt={localizedTitle}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-purple-600/20 dark:from-cyan-500/20 dark:via-blue-600/20 dark:to-purple-600/20 flex items-center justify-center">
            <BookOpen className="h-16 w-16 sm:h-20 sm:w-20 text-cyan-400/50 dark:text-cyan-400/50" />
          </div>
        )}
        
        {/* Savings Badge */}
        {savingsPercentage && !bundle.isPurchased && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className="text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg transform rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 ease-in-out"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.2)'
              }}
            >
              {t('bundle_card.save_percentage', `Save ${savingsPercentage}%`, { percentage: savingsPercentage })}
            </span>
          </div>
        )}

        {/* Category Badge */}
        {bundle.category && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-white/90 dark:bg-gray-900/80 backdrop-blur-sm text-cyan-700 dark:text-cyan-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-cyan-500/30">
              {bundle.category}
            </span>
          </div>
        )}

        {/* Featured Badge */}
        {bundle.featured && (
          <div className="absolute bottom-3 left-3 z-10">
            <span className="bg-yellow-500/90 text-gray-900 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {t('bundle_card.featured', 'Featured')}
            </span>
          </div>
        )}

        {/* Purchased Badge */}
        {bundle.isPurchased && (
          <>
            {/* Simple visible badge for all screens */}
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg flex items-center gap-1 animate-pulse">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                {t('bundle_card.purchased', 'Purchased')}
              </span>
            </div>
          </>
        )}
        
        {/* Sold Out Badge */}
        {bundle.hasReachedMaxEnrollments && !bundle.isPurchased && (
          <div className="absolute top-3 right-3 z-10">
            <span className="bg-red-600/90 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg">
              {t('bundle_card.sold_out', 'Sold Out')}
            </span>
          </div>
        )}
      </div>

      {/* Bundle Content - Horizontal Layout */}
      <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow min-w-0 bg-white dark:bg-gray-800">
        {/* Header Row - Badges and Course Count */}
        <div className="flex items-start justify-between mb-2 sm:mb-3 gap-3">
          <div className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {bundle.courseIds.length} {bundle.courseIds.length === 1 ? t('bundle_card.course', 'Course') : t('bundle_card.courses', 'Courses')}
            </span>
          </div>
        </div>

        {/* Bundle Title */}
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
          {localizedTitle}
        </h3>

        {/* Bundle Description */}
        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base mb-3 sm:mb-4 line-clamp-3 flex-grow">
          {localizedDescription}
        </p>

        {/* Bottom Section - Price and Buttons */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Price Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  ${bundle.price.toFixed(2)}
                </span>
                {bundle.originalValue && (
                  <span className="text-base sm:text-lg text-gray-500 dark:text-gray-400 line-through">
                    ${bundle.originalValue.toFixed(2)}
                  </span>
                )}
              </div>
              {savingsPercentage && bundle.originalValue && !bundle.isPurchased && (
                <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                  {t('bundle_card.save_amount', `Save $${(bundle.originalValue - bundle.price).toFixed(2)}`, { amount: (bundle.originalValue - bundle.price).toFixed(2) })}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
              {/* View Details Button */}
              <Link to={`/bundles/${bundle.id}`} className="block w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-cyan-500 dark:hover:border-cyan-500 flex items-center justify-center space-x-2 text-sm sm:text-base whitespace-nowrap"
                >
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{t('bundle_card.view_details', 'View Details')}</span>
                </button>
              </Link>

              {/* Buy/Continue Button */}
              {bundle.isPurchased ? (
                <Link to="/dashboard" className="block w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm sm:text-base border border-green-500 whitespace-nowrap"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>{t('bundle_card.continue_learning', 'Continue Learning')}</span>
                  </button>
                </Link>
              ) : bundle.hasReachedMaxEnrollments ? (
                <button
                  disabled
                  className="w-full sm:w-auto text-gray-400 dark:text-gray-500 font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed whitespace-nowrap"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{t('bundle_card.sold_out', 'Sold Out')}</span>
                </button>
              ) : (
                <Link to={`/bundles/${bundle.id}`} className="block w-full sm:w-auto">
                  <button
                    className="w-full sm:w-auto text-white font-semibold py-2 sm:py-2.5 px-5 sm:px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm sm:text-base border whitespace-nowrap"
                    style={{
                      backgroundColor: '#00BFFF',
                      borderColor: '#00BFFF',
                      boxShadow: '0 10px 15px -3px rgba(0, 191, 255, 0.3), 0 4px 6px -2px rgba(0, 191, 255, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00CED1';
                      e.currentTarget.style.boxShadow = '0 15px 25px -5px rgba(0, 191, 255, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#00BFFF';
                      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 191, 255, 0.3), 0 4px 6px -2px rgba(0, 191, 255, 0.2)';
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>{t('bundle_card.buy_bundle', 'Buy Bundle')}</span>
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleCard;





