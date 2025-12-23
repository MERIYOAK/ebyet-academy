import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ShoppingCart, Tag } from 'lucide-react';
import { Bundle } from '../data/mockBundles';

interface BundleCardProps {
  bundle: Bundle;
  className?: string;
}

const BundleCard: React.FC<BundleCardProps> = ({ bundle, className = '' }) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);

  // Calculate savings percentage if originalValue is available
  const savingsPercentage = bundle.originalValue
    ? Math.round(((bundle.originalValue - bundle.price) / bundle.originalValue) * 100)
    : null;

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <div
      className={`bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-700 ease-in-out transform hover:-translate-y-6 hover:scale-[1.02] overflow-hidden group flex flex-col ${className} shadow-gray-900/40 hover:shadow-cyan-500/20 border border-gray-700/50 hover:border-cyan-500/50 ring-1 ring-gray-700/50 hover:ring-cyan-500/50 relative will-change-transform`}
    >
      {/* Bundle Image/Thumbnail */}
      <div className="relative overflow-hidden h-48 sm:h-56 shadow-inner">
        {bundle.thumbnailURL && !imgError ? (
          <img
            src={bundle.thumbnailURL}
            alt={bundle.title}
            className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-1000 ease-in-out will-change-transform"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-purple-600/20 flex items-center justify-center">
            <BookOpen className="h-16 w-16 sm:h-20 sm:w-20 text-cyan-400/50" />
          </div>
        )}
        
        {/* Savings Badge */}
        {savingsPercentage && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className="text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg transform rotate-3 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-in-out"
              style={{
                backgroundColor: '#10b981',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.2)'
              }}
            >
              {t('bundle_card.save_percentage', { percentage: savingsPercentage }, `Save ${savingsPercentage}%`)}
            </span>
          </div>
        )}

        {/* Category Badge */}
        {bundle.category && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-gray-900/80 backdrop-blur-sm text-cyan-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-cyan-500/30">
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

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/50 bg-opacity-0 group-hover:bg-opacity-100 transition-all duration-500 ease-out flex items-center justify-center backdrop-blur-[2px] group-hover:backdrop-blur-0">
          <Link
            to={`/bundles/${bundle.id}`}
            className="opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out w-full px-4"
          >
            <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl text-center text-sm sm:text-base">
              {t('bundle_card.view_bundle', 'View Bundle')}
            </button>
          </Link>
        </div>
      </div>

      {/* Bundle Content */}
      <div className="p-4 sm:p-6 flex flex-col flex-grow bg-gray-800 sm:bg-gradient-to-b sm:from-gray-800 sm:to-gray-900/30">
        {/* Number of Courses */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-gray-400 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4" />
            <span>
              {bundle.courseIds.length} {bundle.courseIds.length === 1 ? t('bundle_card.course', 'Course') : t('bundle_card.courses', 'Courses')}
            </span>
          </div>
        </div>

        {/* Bundle Title */}
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2 h-14 sm:h-16 group-hover:text-cyan-400 transition-all duration-700 ease-in-out drop-shadow-sm group-hover:drop-shadow-md group-hover:translate-x-1">
          {bundle.title}
        </h3>

        {/* Bundle Description */}
        <p className="text-gray-300 text-sm mb-4 line-clamp-3 flex-grow">
          {bundle.description}
        </p>

        {/* Price Section */}
        <div className="mt-auto pt-4 border-t border-gray-700/50">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">
                ${bundle.price.toFixed(2)}
              </div>
              {bundle.originalValue && (
                <div className="text-sm text-gray-400 line-through">
                  ${bundle.originalValue.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <Link to={`/bundles/${bundle.id}`}>
            <button
              className="w-full text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-110 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2 text-sm sm:text-base border"
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
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-500 ease-in-out group-hover:rotate-12" />
              <span>{t('bundle_card.buy_bundle', 'Buy Bundle')}</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BundleCard;





