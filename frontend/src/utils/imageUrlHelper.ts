// Utility functions to handle presigned URL expiry for images

export const isPresignedUrlExpired = (url: string): boolean => {
  if (!url || url === 'undefined' || url === '') {
    return true; // Consider empty/invalid URLs as expired
  }

  try {
    const urlObj = new URL(url);
    
    // Check for AWS presigned URL parameters
    const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
    const dateParam = urlObj.searchParams.get('X-Amz-Date');
    
    if (expiresParam && dateParam) {
      const expiryTime = parseInt(expiresParam);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Add 5-minute buffer before expiry
      const isExpired = currentTime >= (expiryTime - 300);
      
      console.log('🔍 [ImageURL] URL expiry check:', {
        url,
        expiryTime: new Date(expiryTime * 1000).toISOString(),
        currentTime: new Date(currentTime * 1000).toISOString(),
        isExpired,
        timeRemaining: expiryTime - currentTime
      });
      
      return isExpired;
    }
    
    // If we can't parse expiry, assume it's not expired
    return false;
  } catch (error) {
    console.warn('🔍 [ImageURL] Could not parse URL for expiry check:', error);
    return false;
  }
};

export const refreshImageUrl = async (imageUrl: string, courseId?: string, videoId?: string): Promise<string> => {
  if (!imageUrl || isPresignedUrlExpired(imageUrl)) {
    console.log('🔄 [ImageURL] Image URL expired or invalid, refreshing:', { imageUrl, courseId, videoId });
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('🔄 [ImageURL] No token available for image URL refresh');
        return imageUrl; // Return original URL as fallback
      }

      let refreshUrl: string;
      if (courseId && videoId) {
        // Refresh video thumbnail
        refreshUrl = `/api/videos/${videoId}`;
      } else if (courseId) {
        // Refresh course thumbnail
        refreshUrl = `/api/courses/${courseId}`;
      } else {
        console.warn('🔄 [ImageURL] No identifiers provided for image refresh');
        return imageUrl;
      }

      const response = await fetch(refreshUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.warn('🔄 [ImageURL] Failed to refresh image URL:', response.status);
        return imageUrl; // Return original URL as fallback
      }

      const result = await response.json();
      
      // Extract the new image URL from response
      let newImageUrl = imageUrl;
      if (result.data?.video?.thumbnailURL || result.data?.video?.thumbnail) {
        newImageUrl = result.data.video.thumbnailURL || result.data.video.thumbnail;
      } else if (result.data?.course?.thumbnailURL || result.data?.course?.thumbnail) {
        newImageUrl = result.data.course.thumbnailURL || result.data.course.thumbnail;
      } else if (result.data?.thumbnailURL || result.data?.thumbnail) {
        newImageUrl = result.data.thumbnailURL || result.data.thumbnail;
      }

      if (newImageUrl && newImageUrl !== imageUrl) {
        console.log('✅ [ImageURL] Successfully refreshed image URL:', {
          oldUrl: imageUrl,
          newUrl: newImageUrl
        });
        return newImageUrl;
      } else {
        console.warn('🔄 [ImageURL] No new image URL found in response:', result);
        return imageUrl;
      }
    } catch (error) {
      console.error('❌ [ImageURL] Error refreshing image URL:', error);
      return imageUrl;
    }
  }

  // Return original URL if not expired
  return imageUrl;
};

export const getValidImageUrl = async (
  imageUrl: string, 
  courseId?: string, 
  videoId?: string
): Promise<string> => {
  if (!imageUrl) {
    return imageUrl;
  }

  // Check if URL is expired and refresh if needed
  const validUrl = await refreshImageUrl(imageUrl, courseId, videoId);
  return validUrl;
};
