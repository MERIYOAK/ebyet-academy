import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReviewFormProps {
  courseId: string;
  courseTitle: string;
  onSubmit: (review: { rating: number; comment: string }) => void;
  onCancel: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ courseTitle, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0 || !comment.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      // Reset form after successful submission
      setRating(0);
      setHoveredRating(0);
      setComment('');
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarButton = ({ value }: { value: number }) => (
    <button
      type="button"
      className="p-1 transition-colors duration-200"
      onClick={() => setRating(value)}
      onMouseEnter={() => setHoveredRating(value)}
      onMouseLeave={() => setHoveredRating(0)}
    >
      <Star
        className={`w-6 h-6 transition-colors duration-200 ${
          value <= (hoveredRating || rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-300'
        }`}
      />
    </button>
  );

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6"
    >
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 break-words">
        {t('reviews.leave_review')} "{courseTitle}"
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('reviews.rating_label')} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:gap-1">
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(value => (
                <StarButton key={value} value={value} />
              ))}
            </div>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {rating > 0 
                ? `${rating} ${rating !== 1 ? t('reviews.stars') : t('reviews.star')}` 
                : t('reviews.select_rating')}
            </span>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('reviews.review_label')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => {
              e.stopPropagation();
            }}
            onBlur={(e) => {
              e.stopPropagation();
            }}
            placeholder={t('reviews.share_experience_placeholder')}
            rows={4}
            maxLength={250}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-700 dark:text-white dark:placeholder-gray-300"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {comment.length}/250 {t('reviews.characters')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3 sm:gap-0">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 rounded-lg border border-gray-300 dark:border-gray-600 sm:border-none"
          >
            {t('reviews.cancel')}
          </button>
          <button
            type="submit"
            disabled={rating === 0 || !comment.trim() || isSubmitting}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('reviews.submitting') : t('reviews.submit_review')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
