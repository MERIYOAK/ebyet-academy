import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
  persist?: boolean; // For production debugging
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 5000,
  persist = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDebugMode, setIsDebugMode] = useState(false);

  // Debug mode for production - check if we're in production and enable debugging
  useEffect(() => {
    const isProduction = import.meta.env.PROD;
    const debugToast = localStorage.getItem('debug-toast');
    setIsDebugMode(isProduction && debugToast === 'true');
    
    // Log toast events in production for debugging
    if (isProduction) {
      console.log(`🔔 Toast [${type}]: ${message}`, {
        timestamp: new Date().toISOString(),
        persist,
        duration
      });
    }
  }, [type, message, persist, duration]);

  useEffect(() => {
    if (persist) return; // Don't auto-close if persist is true
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (isDebugMode) {
          console.log(`🔔 Toast auto-closed [${type}]: ${message}`);
        }
        onClose();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose, persist, isDebugMode, type, message]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-300';
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-300';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
      default:
        return 'bg-gray-800 border-gray-700 text-gray-300';
    }
  };

  const handleClose = () => {
    if (isDebugMode) {
      console.log(`🔔 Toast manually closed [${type}]: ${message}`);
    }
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-sm w-full transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className={`rounded-lg border p-4 shadow-lg backdrop-blur-sm ${getStyles()}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">{message}</p>
            {isDebugMode && (
              <p className="text-xs text-gray-500 mt-1">
                Debug: {type} | {persist ? 'persistent' : `${duration}ms`}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-300 transition-colors rounded p-1"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {persist && (
          <div className="mt-2 pt-2 border-t border-current/10">
            <p className="text-xs text-gray-400">Debug mode - notification persists</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toast; 