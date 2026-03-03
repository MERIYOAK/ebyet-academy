/**
 * Toast Notification Component
 * Only shows deployment update notifications
 * No content updates, UI events, or manual triggers
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, Info, AlertCircle, Sparkles } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showDeploymentNotification: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { t } = useTranslation();

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration (default 5 seconds)
    const duration = toast.duration || 5000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showDeploymentNotification = (message: string) => {
    console.log('🔍 showDeploymentNotification called with message:', message);
    console.log('🌍 Current language:', localStorage.getItem('i18nextLng'));
    
    const translatedTitle = t('toast.updateAvailable', 'Update Available');
    const translatedMessage = message || t('toast.newUpdateDeployed', 'A new update has been deployed.');
    const translatedButton = t('toast.refreshNow', 'Refresh Now');
    
    console.log('🔍 Translations:', {
      title: translatedTitle,
      message: translatedMessage,
      button: translatedButton
    });
    
    showToast({
      type: 'info',
      title: translatedTitle,
      message: translatedMessage,
      icon: <Sparkles className="w-5 h-5" />,
      duration: 10000, // Show longer for deployment notifications
      action: {
        label: translatedButton,
        onClick: () => {
          window.location.reload();
        }
      }
    });
  };

  // Listen for deployment update events
  useEffect(() => {
    const handleDeploymentUpdate = (event: CustomEvent) => {
      const { message } = event.detail;
      showDeploymentNotification(message);
    };

    window.addEventListener('deploymentUpdate', handleDeploymentUpdate as EventListener);

    return () => {
      window.removeEventListener('deploymentUpdate', handleDeploymentUpdate as EventListener);
    };
  }, [showDeploymentNotification]);

  return (
    <ToastContext.Provider value={{ showToast, showDeploymentNotification }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 sm:top-6 right-4 left-4 sm:left-auto z-[9998] space-y-3 sm:space-y-4 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getToastStyles = () => {
    const baseStyles = "transform transition-all duration-300 ease-out w-full max-w-sm sm:max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 overflow-hidden backdrop-blur-sm";
    const visibilityStyles = isVisible 
      ? "translate-x-0 opacity-100 scale-100" 
      : "translate-x-full opacity-0 scale-95";
    
    return `${baseStyles} ${visibilityStyles}`;
  };

  const getIconStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-500 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'info':
      default:
        return 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
    }
  };

  const getIconComponent = (type: Toast['type']) => {
    if (toast.icon) return toast.icon;
    
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 p-2 rounded-full ${getIconStyles(toast.type)}`}>
            {getIconComponent(toast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
              {toast.title}
            </p>
            {toast.message && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={toast.action.onClick}
                  className="w-full sm:w-auto text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-all duration-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 sm:px-4 sm:py-2 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-md"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 ml-2 sm:ml-3">
            <button
              className="inline-flex text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleRemove}
            >
              <span className="sr-only">Close</span>
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
