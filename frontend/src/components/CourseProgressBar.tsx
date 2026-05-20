import React from 'react';

interface CourseProgressBarProps {
  progress: number;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
}

const CourseProgressBar: React.FC<CourseProgressBarProps> = ({
  progress,
  completedLessons,
  totalLessons,
  isCompleted,
}) => {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{completedLessons} / {totalLessons} lessons</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isCompleted
              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

export default CourseProgressBar;
