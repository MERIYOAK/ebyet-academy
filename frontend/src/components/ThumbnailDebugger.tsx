import React, { useState, useEffect } from 'react';

interface ThumbnailDebuggerProps {
  thumbnailUrl: string;
  courseTitle: string;
  courseId: string;
}

const ThumbnailDebugger: React.FC<ThumbnailDebuggerProps> = ({
  thumbnailUrl,
  courseTitle,
  courseId
}) => {
  const [imageStatus, setImageStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [imageInfo, setImageInfo] = useState<any>(null);

  useEffect(() => {
    // ThumbnailDebugger component loaded

    if (!thumbnailUrl) {
      setImageStatus('error');
      return;
    }

    // Test if the image loads
    const img = new Image();
    
    img.onload = () => {
      console.log(`✅ Thumbnail loaded successfully for "${courseTitle}"`);
      console.log(`   - Natural width: ${img.naturalWidth}`);
      console.log(`   - Natural height: ${img.naturalHeight}`);
      console.log(`   - Complete: ${img.complete}`);
      
      setImageStatus('success');
      setImageInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        complete: img.complete
      });
    };

    img.onerror = () => {
      console.error(`❌ Thumbnail failed to load for "${courseTitle}"`);
      console.error(`   - Failed URL: ${thumbnailUrl}`);
      setImageStatus('error');
    };

    img.src = thumbnailUrl;
  }, [thumbnailUrl, courseTitle, courseId]);

  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-gray-50">
      <h4 className="font-semibold text-sm mb-2">🔍 Thumbnail Debug: {courseTitle}</h4>
      <div className="text-xs space-y-1">
        <div><strong>Course ID:</strong> {courseId}</div>
        <div><strong>URL:</strong> {thumbnailUrl || 'NULL/EMPTY'}</div>
        <div><strong>Status:</strong> 
          <span className={`ml-1 px-2 py-1 rounded text-xs ${
            imageStatus === 'loading' ? 'bg-yellow-100 text-yellow-800' :
            imageStatus === 'success' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {imageStatus.toUpperCase()}
          </span>
        </div>
        {imageInfo && (
          <div><strong>Dimensions:</strong> {imageInfo.width} x {imageInfo.height}</div>
        )}
        <div className="mt-2">
          <strong>Preview:</strong>
          <div className="mt-1">
            {imageStatus === 'loading' && (
              <div className="w-32 h-20 bg-gray-200 flex items-center justify-center text-xs">
                Loading...
              </div>
            )}
            {imageStatus === 'success' && (
              <img 
                src={thumbnailUrl} 
                alt={`Debug: ${courseTitle}`}
                className="w-32 h-20 object-cover border border-gray-300"
              />
            )}
            {imageStatus === 'error' && (
              <div className="w-32 h-20 bg-red-100 border border-red-300 flex items-center justify-center text-xs text-red-600">
                Failed to load
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailDebugger; 