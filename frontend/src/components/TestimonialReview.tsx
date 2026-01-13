import React from 'react';
import { Star, BookOpen } from 'lucide-react';

interface FeaturedReview {
  _id: string;
  userId: {
    name: string;
  };
  courseId: {
    title: string;
  };
  rating: number;
  comment: string;
}

interface TestimonialReviewProps {
  review: FeaturedReview;
}

const TestimonialReview: React.FC<TestimonialReviewProps> = ({ review }) => {
  // Helper function to get display text from bilingual objects
  const getDisplayText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text.en) return text.en;
    return String(text);
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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium rounded-full">
            Student Review
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {getDisplayText(review.courseId.title)}
          </span>
        </div>
        {renderStars(review.rating)}
      </div>

      {/* Review Content */}
      <blockquote className="text-gray-700 dark:text-white leading-relaxed mb-4">
        "{truncateText(getDisplayText(review.comment), 150)}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center justify-between">
        <div className="font-medium text-gray-900 dark:text-white">
          {getDisplayText(review.userId.name)}
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <BookOpen className="w-3 h-3" />
          <span>{getDisplayText(review.courseId.title)}</span>
        </div>
      </div>
    </div>
  );
};

export default TestimonialReview;
