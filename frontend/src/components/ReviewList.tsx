import React from 'react';
import { Star, Calendar, User, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Review {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  rating: number;
  title?: string;
  comment: string;
  adminReply?: string;
  adminReplyAt?: string;
  createdAt: string;
  pinned?: boolean;
}

interface ReviewListProps {
  reviews: Review[];
  stats?: {
    averageRating: number;
    totalReviews: number;
  };
  loading?: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews, stats, loading }) => {
  const { t } = useTranslation();
  
  // Debug logging
  console.log('ReviewList - Stats received:', stats);
  console.log('ReviewList - Reviews received:', reviews);
  console.log('ReviewList - Average rating:', stats?.averageRating);
  console.log('ReviewList - Total reviews:', stats?.totalReviews);
  
  // Helper function to get display text - for review content, keep original language (no translation)
  const getDisplayText = (text: any): string => {
    if (!text) return '';
    // For review comments and replies, always return as-is (original language)
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text.en) return text.en;
    return String(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">{t('reviews.no_reviews')}</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-white">{t('reviews.no_reviews_message')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header - Always show */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 sm:p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {(stats?.averageRating || 0).toFixed(1)}
              </div>
              <div className="flex flex-col">
                {renderStars(Math.round(stats?.averageRating || 0))}
                <span className="text-xs sm:text-sm text-gray-600 dark:text-white">
                  {stats?.totalReviews || 0} {(stats?.totalReviews || 0) !== 1 ? t('reviews.reviews_plural') : t('reviews.review')}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs sm:text-sm text-gray-600 dark:text-white">
            <div className="font-medium">{t('reviews.course_rating')}</div>
            <div className="hidden sm:block">{t('reviews.average_from_reviews')}</div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.map((review) => (
        <div
          key={review._id}
          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow duration-200 ${
            review.pinned ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-4 gap-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {getDisplayText(review.userId.name)}
                </div>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {renderStars(review.rating)}
                  <span className="text-yellow-500 font-medium">
                    {review.rating}.0
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">{formatDate(review.createdAt)}</span>
              {review.pinned && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                  {t('reviews.pinned')}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          {review.title && (
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {getDisplayText(review.title)}
            </h4>
          )}

          {/* Comment */}
          <p className="text-sm sm:text-base text-gray-700 dark:text-white leading-relaxed break-words">
            {getDisplayText(review.comment)}
          </p>

          {/* Instructor Reply */}
          {review.adminReply && (
            <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
              <div className="flex items-start space-x-2">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                    <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {t('reviews.instructor_reply')}
                    </span>
                    {review.adminReplyAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(review.adminReplyAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed break-words">
                    {getDisplayText(review.adminReply)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
