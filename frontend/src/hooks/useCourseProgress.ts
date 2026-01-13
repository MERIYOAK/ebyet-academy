import { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

interface CourseProgress {
  totalVideos?: number;
  completedVideos?: number;
  totalProgress?: number;
  lastWatchedVideo?: any;
  lastWatchedPosition?: number;
  courseProgressPercentage?: number;
  totalWatchedDuration?: number;
  courseTotalDuration?: number;
  isCompleted?: boolean; // Added for compatibility with CourseCard
}

export const useCourseProgress = (courseId: string | undefined) => {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setProgress(null);
      return;
    }

    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setProgress(null);
          return;
        }

        const response = await fetch(buildApiUrl(`/api/progress/course/${courseId}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('🔍 [useCourseProgress] API Response:', result);
          // Extract overallProgress from the nested response structure
          const overallProgress = result.data?.overallProgress;
          if (overallProgress) {
            // Map the backend response to the expected format
            setProgress({
              totalVideos: overallProgress.totalVideos || 0,
              completedVideos: overallProgress.completedVideos || 0,
              totalProgress: overallProgress.courseProgressPercentage || 0,
              courseProgressPercentage: overallProgress.courseProgressPercentage || 0,
              lastWatchedVideo: overallProgress.lastWatchedVideo || null,
              lastWatchedPosition: overallProgress.lastWatchedPosition || 0,
              totalWatchedDuration: overallProgress.totalWatchedDuration || 0,
              courseTotalDuration: overallProgress.courseTotalDuration || 0,
              isCompleted: (overallProgress.courseProgressPercentage || 0) >= 100 && 
                           (overallProgress.completedVideos || 0) >= (overallProgress.totalVideos || 0)
            });
          } else {
            console.warn('⚠️ [useCourseProgress] No overallProgress in response');
            setProgress(null);
          }
        } else {
          console.warn('⚠️ [useCourseProgress] API request failed:', response.status);
          setProgress(null);
        }
      } catch (error) {
        console.error('Error fetching course progress:', error);
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchProgress();
  }, [courseId]);

  // Listen for progress updates from other tabs/windows
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      if (event.detail.courseId === courseId) {
        setProgress(event.detail.progress);
      }
    };

    window.addEventListener('courseProgressUpdate', handleProgressUpdate as EventListener);
    
    return () => {
      window.removeEventListener('courseProgressUpdate', handleProgressUpdate as EventListener);
    };
  }, [courseId]);

  // Cleanup function for login/logout
  const clearProgressCache = () => {
    // Clear all course progress from cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('courseProgress_')) {
        localStorage.removeItem(key);
      }
    });
  };

  // Expose cleanup function globally
  if (typeof window !== 'undefined') {
    (window as any).clearProgressCache = clearProgressCache;
  }

  return { progress, loading };
};
