/**
 * Version Update Notification Component
 * Shows notification when a new app version is available
 */

import React, { useState } from 'react';
import { X, RefreshCw, Info } from 'lucide-react';

interface VersionInfo {
  version: string;
  buildTime: string;
  buildHash: string;
}

interface UpdateNotificationProps {
  currentVersion: VersionInfo | null;
  newVersion: VersionInfo;
  message: string;
}

const VersionUpdateNotification: React.FC<UpdateNotificationProps> = ({
  currentVersion,
  newVersion,
  message
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Debug logging
  console.log('🔍 VersionUpdateNotification props:', {
    currentVersion,
    newVersion,
    message
  });

  const handleRefresh = () => {
    console.log('🔄 Refreshing to get latest version...');
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const formatBuildTime = (buildTime: string) => {
    try {
      if (!buildTime || buildTime === 'Invalid Date') {
        return 'Unknown';
      }
      const date = new Date(buildTime);
      if (isNaN(date.getTime())) {
        return buildTime;
      }
      
      // Use shorter format for mobile, longer for desktop
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        // Very compact mobile format: "Feb 28, 8:55 PM"
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }) + ', ' + date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleString();
      }
    } catch {
      return buildTime || 'Unknown';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 right-4 left-2 sm:top-20 sm:right-4 sm:left-auto z-[9999] w-full max-w-sm sm:max-w-md md:max-w-lg bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div className="relative p-3 sm:p-4">
        {/* Dismiss button - top right on mobile */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 sm:hidden inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded p-1"
          title="Dismiss"
        >
          <span className="sr-only">Dismiss</span>
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start pr-8 sm:pr-0">
          <div className="flex-shrink-0 p-2 bg-blue-50 rounded-full">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="ml-2 sm:ml-3 w-0 flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
              New Version Available
            </p>
            <p className="mt-1 text-sm sm:text-sm text-gray-500 line-clamp-2 break-words">
              {message}
            </p>
            
            {showDetails && (
              <div className="mt-2 sm:mt-3 space-y-3 sm:space-y-3 text-sm text-gray-600">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <span className="font-medium text-sm sm:text-sm block mb-1">Current:</span>
                    <div className="font-mono text-sm sm:text-sm truncate" title={currentVersion?.version || 'unknown'}>
                      v{currentVersion?.version || 'unknown'}
                    </div>
                    <div className="text-gray-400 text-sm truncate mt-1" title={formatBuildTime(currentVersion?.buildTime || '')}>
                      {formatBuildTime(currentVersion?.buildTime || '')}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-sm sm:text-sm block mb-1">Available:</span>
                    <div className="font-mono text-sm sm:text-sm truncate text-green-600" title={newVersion.version}>
                      v{newVersion.version}
                    </div>
                    <div className="text-green-600 text-sm truncate mt-1" title={formatBuildTime(newVersion.buildTime)}>
                      {formatBuildTime(newVersion.buildTime)}
                    </div>
                  </div>
                </div>
                
                {newVersion.buildHash && (
                  <div className="mt-3 sm:mt-4">
                    <span className="font-medium text-sm sm:text-sm block mb-1">Build:</span>
                    <code className="inline-block ml-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono break-all max-w-full" title={newVersion.buildHash}>
                      {newVersion.buildHash.substring(0, 10)}...
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons - bottom right, hidden X on mobile */}
        <div className="flex justify-end mt-3 sm:mt-4 space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded p-2 sm:p-1"
            title="Toggle details"
          >
            <span className="sr-only">Toggle details</span>
            <Info className="w-4 h-4 sm:w-4 sm:h-4" />
          </button>
          
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 sm:px-3 sm:py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 min-w-0"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4 sm:w-4 sm:h-4 mr-2 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Refresh</span>
          </button>
          
          {/* X button only visible on desktop */}
          <button
            onClick={handleDismiss}
            className="hidden sm:inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded p-1"
            title="Dismiss"
          >
            <span className="sr-only">Dismiss</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionUpdateNotification;
