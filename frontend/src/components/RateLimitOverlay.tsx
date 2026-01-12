import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RateLimitOverlayProps {
  isVisible: boolean;
  onDismiss: () => void;
  resetTime?: string;
  retryAfter?: number;
}

const RateLimitOverlay: React.FC<RateLimitOverlayProps> = ({ 
  isVisible, 
  onDismiss, 
  resetTime, 
  retryAfter = 900 // Default 15 minutes
}) => {
  const { t } = useTranslation();
  const [timeRemaining, setTimeRemaining] = useState(retryAfter);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss(); // Auto-dismiss when timer reaches zero
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, retryAfter, onDismiss]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getResetTime = () => {
    if (!resetTime) return null;
    const reset = new Date(resetTime);
    return reset.toLocaleTimeString();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('rate_limit.title', 'Rate Limit Exceeded')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('rate_limit.subtitle', 'Too many requests')}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Timer Display */}
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <Clock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('rate_limit.time_remaining', 'Time remaining')}
            </p>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t('rate_limit.why_title', 'Why this happened?')}
            </h4>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('rate_limit.reason_1', 'Too many requests made in a short time')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('rate_limit.reason_2', 'Security protection against abuse')}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{t('rate_limit.reason_3', 'Prevents server overload')}</span>
              </li>
            </ul>
          </div>

          {/* Reset Time */}
          {getResetTime() && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('rate_limit.reset_time', 'Resets at')}: <span className="font-medium">{getResetTime()}</span>
              </p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onDismiss}
            disabled={timeRemaining > 0}
            className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            {timeRemaining > 0 
              ? t('rate_limit.wait_button', 'Please wait...')
              : t('rate_limit.continue_button', 'Continue')
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateLimitOverlay;
