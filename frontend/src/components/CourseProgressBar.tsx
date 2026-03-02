import React from 'react';
import { useTranslation } from 'react-i18next';

interface CourseProgressBarProps {
  progress: number;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
  className?: string;
}

const CourseProgressBar: React.FC<CourseProgressBarProps> = ({
  progress,
  completedLessons,
  totalLessons,
  isCompleted,
  className = ''
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={`${className}`}>
      {/* Progress Info */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600">{t('course_progress.course_progress')}</span>
        <span className={`font-semibold ${
          isCompleted ? 'text-green-600' : 'text-red-600'
        }`}>
          {progress}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 relative ${
            isCompleted 
              ? 'bg-gradient-to-r from-green-500 to-green-600' 
              : 'bg-gradient-to-r from-red-500 to-pink-500'
          }`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-0 w-2 h-2 bg-white rounded-full shadow-sm transform translate-x-1"></div>
        </div>
      </div>
      
      {/* Lessons Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{completedLessons}/{totalLessons} {t('course_progress.lessons_completed')}</span>
        {isCompleted && (
          <span className="text-green-600 font-medium">✓ {t('course_progress.completed')}</span>
        )}
      </div>
    </div>
  );
};

export default CourseProgressBar; 