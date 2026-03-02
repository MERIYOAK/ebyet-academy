/**
 * Toast Notification Component
 * Displays real-time content update notifications
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, Info, AlertCircle, Sparkles, BookOpen, Video, Package, Megaphone, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

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
  showContentUpdateToast: (type: string, data: any, message: string) => void;
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

  const showContentUpdateToast = (type: string, data: any, message: string) => {
    let icon = <Info className="w-5 h-5" />;
    let toastType: Toast['type'] = 'info';
    let title = 'New Content Available';

    switch (type) {
      case 'NEW_COURSE':
        icon = <BookOpen className="w-5 h-5" />;
        toastType = 'success';
        title = 'New Course Available';
        break;
      case 'COURSE_UPDATED':
        icon = <BookOpen className="w-5 h-5" />;
        toastType = 'info';
        title = 'Course Updated';
        break;
      case 'NEW_VIDEO':
        icon = <Video className="w-5 h-5" />;
        toastType = 'success';
        title = 'New Video Added';
        break;
      case 'VIDEO_UPDATED':
        icon = <Video className="w-5 h-5" />;
        toastType = 'info';
        title = 'Video Updated';
        break;
      case 'NEW_BUNDLE':
        icon = <Package className="w-5 h-5" />;
        toastType = 'success';
        title = 'New Bundle Available';
        break;
      case 'BUNDLE_UPDATED':
        icon = <Package className="w-5 h-5" />;
        toastType = 'info';
        title = 'Bundle Updated';
        break;
      case 'NEW_ANNOUNCEMENT':
        icon = <Megaphone className="w-5 h-5" />;
        toastType = 'warning';
        title = 'New Announcement';
        break;
      case 'ANNOUNCEMENT_UPDATED':
        icon = <Megaphone className="w-5 h-5" />;
        toastType = 'info';
        title = 'Announcement Updated';
        break;
      case 'REVIEW_APPROVED':
        icon = <ThumbsUp className="w-5 h-5" />;
        toastType = 'success';
        title = 'Review Approved';
        break;
      case 'REVIEW_REJECTED':
        icon = <ThumbsDown className="w-5 h-5" />;
        toastType = 'warning';
        title = 'Review Rejected';
        break;
      case 'REVIEW_REPLY_ADDED':
        icon = <MessageSquare className="w-5 h-5" />;
        toastType = 'info';
        title = 'Admin Reply Added';
        break;
      case 'COURSE_MATERIALS_UPDATED':
        icon = <BookOpen className="w-5 h-5" />;
        toastType = 'info';
        title = 'Course Materials Updated';
        break;
      case 'WHATSAPP_GROUP_UPDATED':
        icon = <MessageSquare className="w-5 h-5" />;
        toastType = 'info';
        title = 'WhatsApp Group Updated';
        break;
      default:
        icon = <Sparkles className="w-5 h-5" />;
        title = 'Content Update';
    }

    showToast({
      type: toastType,
      title,
      message,
      icon,
      duration: 6000,
      action: data.id ? {
        label: 'View Content',
        onClick: () => {
          // Navigate to content based on type
          const basePath = window.location.origin;
          switch (type) {
            case 'NEW_COURSE':
            case 'COURSE_UPDATED':
              window.location.href = `${basePath}/courses/${data.id}`;
              break;
            case 'NEW_BUNDLE':
            case 'BUNDLE_UPDATED':
              window.location.href = `${basePath}/bundles/${data.id}`;
              break;
            case 'NEW_ANNOUNCEMENT':
            case 'ANNOUNCEMENT_UPDATED':
              window.location.href = `${basePath}/announcements`;
              break;
            default:
              window.location.reload();
          }
        }
      } : undefined
    });
  };

  return (
    <ToastContext.Provider value={{ showToast, showContentUpdateToast }}>
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
    <div className="fixed top-16 right-2 left-2 sm:top-20 sm:right-4 sm:left-auto z-[9998] space-y-2 pointer-events-none">
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
    const baseStyles = "transform transition-all duration-300 ease-in-out w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden sm:max-w-sm";
    const visibilityStyles = isVisible 
      ? "translate-x-0 opacity-100 scale-100" 
      : "translate-x-full opacity-0 scale-95";
    
    return `${baseStyles} ${visibilityStyles}`;
  };

  const getIconStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-500 bg-green-50';
      case 'warning':
        return 'text-yellow-500 bg-yellow-50';
      case 'error':
        return 'text-red-500 bg-red-50';
      case 'info':
      default:
        return 'text-blue-500 bg-blue-50';
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
      <div className="p-3 sm:p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 p-1 rounded-full ${getIconStyles(toast.type)}`}>
            {getIconComponent(toast.type)}
          </div>
          <div className="ml-2 sm:ml-3 w-0 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-2">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <div className="mt-2 sm:mt-3">
                <button
                  onClick={toast.action.onClick}
                  className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  {toast.action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-2 sm:ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors p-1"
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
