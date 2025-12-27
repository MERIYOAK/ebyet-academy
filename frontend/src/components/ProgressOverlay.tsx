import React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface ProgressOverlayProps {
  isVisible: boolean;
  progress: number;
  status: 'loading' | 'success' | 'error';
  title: string;
  message: string;
  onOk: () => void;
  onCancel?: () => void;
}

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({
  isVisible,
  progress,
  status,
  title,
  message,
  onOk,
  onCancel
}) => {
  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${status === 'loading' ? 'select-none cursor-not-allowed' : ''}`}
      style={{ 
        pointerEvents: 'auto',
        userSelect: status === 'loading' ? 'none' : 'auto'
      }}
      onClick={(e) => {
        // Prevent any clicks during loading
        if (status === 'loading') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div 
        className={`bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 ${status === 'loading' ? 'select-none' : ''}`}
        onClick={(e) => {
          // Prevent clicks on the modal during loading
          if (status === 'loading') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Progress Bar */}
        {status === 'loading' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">{Math.min(progress, 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Icon */}
        <div className="flex items-center justify-center mb-4">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          )}
          {status === 'success' && (
            <div className="rounded-full h-8 w-8 bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-full h-8 w-8 bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          )}
        </div>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">{message}</p>

        {/* Action Buttons */}
        <div className="flex justify-center">
          {status === 'loading' ? (
            <div className="px-6 py-2 text-gray-600 font-medium">
              Processing...
            </div>
          ) : (
            <button
              onClick={onOk}
              className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                status === 'success'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : status === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressOverlay; 