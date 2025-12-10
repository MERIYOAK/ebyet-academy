import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface LoadingMessageProps {
  message?: string;
  className?: string;
  showSpinner?: boolean;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ 
  message, 
  className = '',
  showSpinner = true 
}) => {
  const { t } = useTranslation();

  const defaultMessage = message || t('common.loading_courses', 'Loading courses, please wait...');

  return (
    <div className={`flex items-center justify-center py-8 px-4 ${className}`}>
      <div className="text-center">
        {showSpinner && (
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
        )}
        <p className="text-gray-600 text-lg font-medium">
          {defaultMessage}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {t('common.loading_subtitle', 'This may take a few seconds')}
        </p>
      </div>
    </div>
  );
};

export default LoadingMessage;
