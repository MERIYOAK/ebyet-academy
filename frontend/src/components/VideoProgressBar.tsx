import React from 'react';

interface VideoProgressBarProps {
  watchedPercentage: number;
  completionPercentage: number;
  isCompleted: boolean;
  className?: string;
}

const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  watchedPercentage,
  completionPercentage,
  isCompleted,
  className = ''
}) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-3 xxs:p-4 ${className}`}>
      <div className="mb-2 xxs:mb-3">
        <h3 className="text-white font-semibold text-xs xxs:text-sm mb-2">Video Progress</h3>
        <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between text-xs text-gray-400 space-y-1 xxs:space-y-0">
          <span>Current Position: {watchedPercentage}%</span>
          <span>Lesson Status: {completionPercentage}%</span>
        </div>
      </div>
      
      {/* Current Video Position Bar */}
      <div className="mb-2 xxs:mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Current Video Position</span>
          <span>{watchedPercentage}%</span>
        </div>
        <div className="bg-gray-700 rounded-full h-1.5 xxs:h-2">
          <div 
            className="bg-blue-500 h-1.5 xxs:h-2 rounded-full transition-all duration-300"
            style={{ width: `${watchedPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Lesson Completion Status Bar */}
      <div className="mb-2 xxs:mb-3">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>Lesson Completion Status</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="bg-gray-700 rounded-full h-1.5 xxs:h-2">
          <div 
            className={`h-1.5 xxs:h-2 rounded-full transition-all duration-300 ${
              isCompleted 
                ? 'bg-green-500' 
                : 'bg-gradient-to-r from-red-500 to-pink-500'
            }`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Status Indicator */}
      <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-1 xxs:space-y-0">
        <div className="flex items-center space-x-2">
          {isCompleted ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-400">Lesson Completed</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-blue-400">Lesson In Progress</span>
            </>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {isCompleted ? '100% Complete' : `${completionPercentage}% Complete`}
        </div>
      </div>
    </div>
  );
};

export default VideoProgressBar; 