import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

import { useParams, Link } from 'react-router-dom';
import { Video, Edit, Trash2, Clock, User, Save, X, GripVertical, Check, AlertCircle, Plus } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';
import { formatDuration } from '../utils/durationFormatter';
import { getEnglishText } from '../utils/bilingualHelper';

interface Video {
  _id: string;
  title: string | { en: string; tg: string };
  duration: string;
  order: number;
  status: string;
  uploadedBy: string;
  createdAt: string;
  courseId: string;
  description?: string | { en: string; tg: string };
  isFreePreview?: boolean;
}

interface Course {
  _id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
  videos?: Video[];
}

const AdminCourseVideosPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Inline editing state - bilingual support
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    titleEn: '',
    titleTg: '',
    descriptionEn: '',
    descriptionTg: '',
    order: 0,
    duration: ''
  });
  
  // Bulk actions state
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);

  // Free preview toggle state
  const [togglingPreview, setTogglingPreview] = useState<string | null>(null);

  // Progress overlay state
  const [progressOverlay, setProgressOverlay] = useState({
    isVisible: false,
    progress: 0,
    status: 'loading' as 'loading' | 'success' | 'error',
    title: '',
    message: ''
  });

  // Fetch course and videos
  const fetchCourseAndVideos = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course');
      }

      const data = await response.json();
      const courseData = data.data.course;
      
      // Parse video titles and descriptions - handle both objects and JSON strings
      const processedVideos = (courseData.videos || []).map((video: any) => {
        let parsedTitle = video.title;
        let parsedDescription = video.description;
        
        // Handle title - could be object, JSON string, or plain string
        if (typeof video.title === 'string') {
          // Try to parse as JSON if it looks like JSON
          if (video.title.trim().startsWith('{') || video.title.trim().startsWith('"')) {
            try {
              const parsed = JSON.parse(video.title);
              if (parsed && typeof parsed === 'object') {
                parsedTitle = parsed;
              }
            } catch (e) {
              // Not valid JSON, keep as plain string
              parsedTitle = video.title;
            }
          }
          // If it's a plain string (not JSON), keep it as is
        }
        // If it's already an object, keep it as is
        
        // Handle description - could be object, JSON string, or plain string
        if (video.description && typeof video.description === 'string') {
          // Try to parse as JSON if it looks like JSON
          if (video.description.trim().startsWith('{') || video.description.trim().startsWith('"')) {
            try {
              const parsed = JSON.parse(video.description);
              if (parsed && typeof parsed === 'object') {
                parsedDescription = parsed;
              }
            } catch (e) {
              // Not valid JSON, keep as plain string
              parsedDescription = video.description;
            }
          }
          // If it's a plain string (not JSON), keep it as is
        }
        // If it's already an object, keep it as is
        
        return {
          ...video,
          title: parsedTitle,
          description: parsedDescription
        };
      });
      
      console.log('🎬 Frontend received course data:', {
        courseId: courseData._id,
        title: courseData.title,
        videoCount: processedVideos.length,
        videos: processedVideos.map((v: Video) => ({ 
          id: v._id, 
          title: v.title, 
          titleType: typeof v.title,
          description: v.description,
          duration: v.duration,
          status: v.status 
        })) || []
      });
      
      setCourse(courseData);
      setVideos(processedVideos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    try {
      // Show progress overlay
      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'loading',
        title: 'Deleting Video',
        message: 'Preparing to delete video...'
      });

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Update progress - preparing request
      setProgressOverlay(prev => ({
        ...prev,
        progress: 30,
        message: 'Preparing delete request...'
      }));

      const response = await fetch(buildApiUrl(`/api/videos/${videoId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Update progress - processing response
      setProgressOverlay(prev => ({
        ...prev,
        progress: 80,
        message: 'Processing delete response...'
      }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete video');
      }

      // Update progress - success
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Video Deleted Successfully',
        message: 'Video has been deleted successfully!'
      });

      setSuccess('Video deleted successfully!');
      
      // Invalidate React Query cache for this course and related data
      if (courseId) {
        // Invalidate course detail cache
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.detail(courseId) });
        // Invalidate course videos cache
        queryClient.invalidateQueries({ queryKey: ['videos', 'course', courseId] });
        // Invalidate all courses list cache (in case course metadata changed)
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.list({}) });
        // Invalidate featured courses cache
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.featured() });
        
        console.log('🔄 Cache invalidated for course:', courseId);
      }
      
      // Refresh videos list
      await fetchCourseAndVideos();
    } catch (err) {
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Failed to delete video'
      });
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    }
  };

  // Helper function to convert duration to display format
  const formatDurationForInput = (duration: string | number): string => {
    if (typeof duration === 'number') {
      // Convert seconds to MM:SS or HH:MM:SS
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);
      
      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // If it's already a string, return as is
    if (typeof duration === 'string' && duration) {
      return duration;
    }
    
    return '00:00';
  };

  // Helper function to convert duration from input format to seconds
  const parseDurationToSeconds = (durationString: string): number => {
    if (!durationString || !durationString.trim()) {
      return 0;
    }
    
    const parts = durationString.trim().split(':');
    
    if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    // If it's just a number, assume it's already in seconds
    const numValue = parseInt(durationString);
    return isNaN(numValue) ? 0 : numValue;
  };

  // Start inline editing - extract both English and Tigrinya
  const startEditing = (video: Video) => {
    setEditingVideo(video._id);
    
    // Handle title - could be string, object, or JSON string
    let titleEn = '';
    let titleTg = '';
    if (typeof video.title === 'string') {
      // Try to parse as JSON first (in case backend sends JSON string)
      try {
        const parsed = JSON.parse(video.title);
        if (parsed && typeof parsed === 'object' && parsed.en) {
          titleEn = parsed.en || '';
          titleTg = parsed.tg || '';
        } else {
          // Not a bilingual object, treat as English-only string
          titleEn = video.title;
        }
      } catch (e) {
        // Not JSON, treat as plain English string
        titleEn = video.title;
      }
    } else if (video.title && typeof video.title === 'object') {
      // Already an object
      titleEn = video.title.en || '';
      titleTg = video.title.tg || '';
    }
    
    // Handle description - could be string, object, or JSON string
    let descriptionEn = '';
    let descriptionTg = '';
    if (video.description) {
      if (typeof video.description === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(video.description);
          if (parsed && typeof parsed === 'object' && parsed.en) {
            descriptionEn = parsed.en || '';
            descriptionTg = parsed.tg || '';
          } else {
            // Not a bilingual object, treat as English-only string
            descriptionEn = video.description;
          }
        } catch (e) {
          // Not JSON, treat as plain English string
          descriptionEn = video.description;
        }
      } else if (video.description && typeof video.description === 'object') {
        // Already an object
        descriptionEn = video.description.en || '';
        descriptionTg = video.description.tg || '';
      }
    }
    
    console.log('📝 [startEditing] Extracted video data:', {
      videoId: video._id,
      titleEn,
      titleTg,
      descriptionEn,
      descriptionTg,
      originalTitle: video.title,
      originalTitleType: typeof video.title,
      originalDescription: video.description,
      originalDescriptionType: typeof video.description
    });
    
    setEditForm({
      titleEn,
      titleTg,
      descriptionEn,
      descriptionTg,
      order: video.order || 0,
      duration: formatDurationForInput(video.duration)
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingVideo(null);
    setEditForm({ titleEn: '', titleTg: '', descriptionEn: '', descriptionTg: '', order: 0, duration: '' });
  };

  // Save inline edits
  const saveEdit = async () => {
    if (!editingVideo) return;

    try {
      // Show progress overlay
      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'loading',
        title: 'Updating Video',
        message: 'Preparing to update video...'
      });

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Update progress - preparing request
      setProgressOverlay(prev => ({
        ...prev,
        progress: 30,
        message: 'Preparing update request...'
      }));

      // Convert form data to bilingual format
      const { titleEn, titleTg, descriptionEn, descriptionTg, ...restEditForm } = editForm;
      const updateData = {
        ...restEditForm,
        title: JSON.stringify({ en: titleEn, tg: titleTg }),
        description: JSON.stringify({ en: descriptionEn, tg: descriptionTg }),
        duration: parseDurationToSeconds(editForm.duration)
      };

      const response = await fetch(buildApiUrl(`/api/videos/${editingVideo}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      // Update progress - processing response
      setProgressOverlay(prev => ({
        ...prev,
        progress: 80,
        message: 'Processing update response...'
      }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update video');
      }

      // Update progress - success
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Video Updated Successfully',
        message: 'Video has been updated successfully!'
      });

      setSuccess('Video updated successfully!');
      setEditingVideo(null);
      setEditForm({ titleEn: '', titleTg: '', descriptionEn: '', descriptionTg: '', order: 0, duration: '' });
      await fetchCourseAndVideos();
    } catch (err) {
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Failed to update video'
      });
      setError(err instanceof Error ? err.message : 'Failed to update video');
    }
  };


  // Toggle video selection
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  // Toggle free preview status for a video
  const toggleFreePreview = async (videoId: string, currentStatus: boolean) => {
    try {
      setTogglingPreview(videoId);
      
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/videos/${videoId}/free-preview`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFreePreview: !currentStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update free preview status');
      }

      const result = await response.json();
      
      // Update the video in the local state
      setVideos(prev => prev.map(video => 
        video._id === videoId 
          ? { ...video, isFreePreview: !currentStatus }
          : video
      ));

      setSuccess(result.message || 'Free preview status updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Toggle free preview error:', error);
      setError(error instanceof Error ? error.message : 'Failed to update free preview status');
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setTogglingPreview(null);
    }
  };


  useEffect(() => {
    if (courseId) {
      fetchCourseAndVideos();
    }
  }, [courseId]);

  // Clear success/error messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'error':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  // Handle progress overlay OK button
  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-orange-400 mb-4">{error || 'Course not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Course Videos</h1>
                <p className="text-sm sm:text-base text-gray-400 truncate max-w-full">{typeof course.title === 'string' ? course.title : (course.title?.en || '')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
              <Link
                to={`/admin/courses/${courseId}/videos/upload`}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 w-full sm:w-auto transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Add Video</span>
                <span className="sm:hidden">Add Video</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-green-300">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
              <p className="text-orange-200">{error}</p>
            </div>
          </div>
        )}

        {/* Bulk Actions - Commented Out */}
        {/* {videos.length > 0 && (
          <div className={`mb-4 sm:mb-6 bg-gray-800 rounded-lg shadow-sm border p-3 sm:p-4 ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedVideos.length === videos.length}
                    onChange={selectedVideos.length === videos.length ? clearSelection : selectAllVideos}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {selectedVideos.length} of {videos.length} selected
                  </span>
                </div>
                </div>
                {selectedVideos.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 w-full sm:w-auto"
                    >
                      <option value="">Bulk Actions</option>
                      <option value="delete">Delete Selected</option>
                    </select>
                    <button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                    className="px-3 py-1 text-sm bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 w-full sm:w-auto"
                    >
                      Apply
                    </button>
                  </div>
                )}
            </div>
          </div>
        )} */}

        {/* Videos List */}
        <div className={`bg-gray-800 rounded-lg shadow-sm border border-gray-700 ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                Videos ({videos.length})
              </h2>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-400">
                  <span className="hidden sm:inline">Total Duration: </span>
                  <span className="sm:hidden">Duration: </span>
                  <span>{formatDuration(videos.reduce((acc, video) => {
                    const duration = video.duration;
                    
                    // Handle new number format (seconds)
                    if (typeof duration === 'number') {
                      return acc + duration;
                    }
                    
                    // Handle old string format
                    if (typeof duration === 'string' && duration) {
                      if (duration.includes(':')) {
                        const parts = duration.split(':');
                        if (parts.length === 2) {
                          // Format: MM:SS
                          const [minutes, seconds] = parts.map(Number);
                          return acc + (minutes * 60 + seconds);
                        } else if (parts.length === 3) {
                          // Format: HH:MM:SS
                          const [hours, minutes, seconds] = parts.map(Number);
                          return acc + (hours * 3600 + minutes * 60 + seconds);
                        }
                      }
                      // If duration is just a number (seconds)
                      const seconds = parseInt(duration) || 0;
                      return acc + seconds;
                    }
                    
                    return acc + 0;
                  }, 0))}</span>
                </div>
              </div>
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Video className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-white mb-2">No videos yet</h3>
                <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">Start building your course by uploading the first video.</p>
                <Link
                  to={`/admin/courses/${courseId}/videos/upload`}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 w-full sm:w-auto transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add First Video</span>
                  <span className="sm:hidden">Add First Video</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {videos.map((video, index) => (
                  <div key={video._id || `video-${index}-${getEnglishText(video.title)}`} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 space-y-3 sm:space-y-0 transition-colors duration-200 ${selectedVideos.includes(video._id) ? 'bg-blue-500/20 border-blue-500/50' : ''}`}>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedVideos.includes(video._id)}
                        onChange={() => toggleVideoSelection(video._id)}
                        className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      
                      {/* Drag Handle */}
                      <div className="flex-shrink-0 cursor-move">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>
                      
                      <div className="flex-shrink-0">
                        <div className="w-12 h-8 sm:w-16 sm:h-10 bg-gray-600 rounded flex items-center justify-center">
                          <Video className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {editingVideo === video._id ? (
                          // Inline Edit Form - Bilingual
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.titleEn}
                              onChange={(e) => setEditForm(prev => ({ ...prev, titleEn: e.target.value }))}
                              className="w-full px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                              placeholder="Video title (English) *"
                            />
                            <input
                              type="text"
                              value={editForm.titleTg}
                              onChange={(e) => setEditForm(prev => ({ ...prev, titleTg: e.target.value }))}
                              className="w-full px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                              placeholder="Video title (Tigrinya) *"
                            />
                            <textarea
                              value={editForm.descriptionEn}
                              onChange={(e) => setEditForm(prev => ({ ...prev, descriptionEn: e.target.value }))}
                              className="w-full px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                              placeholder="Video description (English) - optional"
                              rows={2}
                            />
                            <textarea
                              value={editForm.descriptionTg}
                              onChange={(e) => setEditForm(prev => ({ ...prev, descriptionTg: e.target.value }))}
                              className="w-full px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                              placeholder="Video description (Tigrinya) - optional"
                              rows={2}
                            />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                              <input
                                type="text"
                                value={editForm.duration}
                                onChange={(e) => {
                                  // Allow only numbers and colons
                                  const value = e.target.value.replace(/[^0-9:]/g, '');
                                  setEditForm(prev => ({ ...prev, duration: value }));
                                }}
                                className="w-24 px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                                placeholder="MM:SS or HH:MM:SS"
                                pattern="^([0-9]{1,2}:)?[0-5]?[0-9]:[0-5][0-9]$"
                                title="Format: MM:SS or HH:MM:SS (e.g., 05:30 or 1:05:30)"
                              />
                              <input
                                type="number"
                                value={editForm.order}
                                onChange={(e) => setEditForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                                className="w-20 px-2 py-1 text-sm bg-gray-800 text-white border border-gray-600 rounded focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                                placeholder="Order"
                              />
                              <button
                                onClick={saveEdit}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-400">
                              Duration format: MM:SS (e.g., 05:30) or HH:MM:SS (e.g., 1:05:30)
                            </p>
                          </div>
                        ) : (
                          // Display Mode
                          <>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <h3 className="text-sm font-medium text-white truncate">{getEnglishText(video.title)}</h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                                {video.status}
                              </span>
                              {video.isFreePreview && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                                  🔓 Free Preview
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs text-gray-400">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(video.duration)}
                              </div>
                              <div className="flex items-center">
                                <span>Order: {video.order || index + 1}</span>
                              </div>
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {video.uploadedBy}
                              </div>
                              <div>
                                {formatDate(video.createdAt)}
                              </div>
                            </div>
                            {video.description && (
                              <div className="mt-2 text-sm text-gray-300 bg-gray-800 p-2 rounded border-l-2 border-cyan-500/50">
                                <strong className="text-gray-200">Lesson Description:</strong> {getEnglishText(video.description)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {editingVideo !== video._id && (
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        {/*<Link
                          to={`/admin/courses/${courseId}/videos/${video._id}`}
                          className="inline-flex items-center px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded text-xs font-medium"
                          title="View video"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">View</span>
                          <span className="sm:hidden">View</span>
                        </Link>*/}
                        <button
                          onClick={() => startEditing(video)}
                          className="inline-flex items-center px-2 py-1 text-gray-300 hover:text-white hover:bg-gray-600 rounded text-xs font-medium transition-colors duration-200"
                          title="Edit video"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">Edit</span>
                        </button>
                        <button
                          onClick={() => toggleFreePreview(video._id, video.isFreePreview || false)}
                          disabled={togglingPreview === video._id}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                            video.isFreePreview 
                              ? 'text-green-400 hover:text-green-300 hover:bg-green-500/20' 
                              : 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/20'
                          } ${togglingPreview === video._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={video.isFreePreview ? 'Remove from free preview' : 'Mark as free preview'}
                        >
                          {togglingPreview === video._id ? (
                            <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <div className="h-3 w-3 sm:h-4 sm:w-4 mr-1">
                              {video.isFreePreview ? '🔓' : '🔒'}
                            </div>
                          )}
                          <span className="hidden sm:inline">{video.isFreePreview ? 'Free' : 'Locked'}</span>
                          <span className="sm:hidden">{video.isFreePreview ? 'Free' : 'Locked'}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${getEnglishText(video.title)}"? This action cannot be undone.`)) {
                              deleteVideo(video._id);
                            }
                          }}
                          className="inline-flex items-center px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded text-xs font-medium transition-colors duration-200"
                          title="Delete video"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Course Info */}
        <div className="mt-6 sm:mt-8 bg-gray-800 rounded-lg shadow-sm border border-gray-700">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Course Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Course Details</h4>
                <p className="text-sm text-white mb-1"><strong>Title:</strong> {typeof course.title === 'string' ? course.title : (course.title?.en || '')}</p>
                <p className="text-sm text-gray-300 mb-1"><strong>Description:</strong> {getEnglishText(course.description)}</p>
                <p className="text-sm text-white"><strong>Total Videos:</strong> {videos.length}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Link
                    to={`/admin/courses/${courseId}/edit`}
                    className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    Edit Course Details
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}`}
                    className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    View Course
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}/videos/upload`}
                    className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    Add New Video
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProgressOverlay
        isVisible={progressOverlay.isVisible}
        progress={progressOverlay.progress}
        status={progressOverlay.status}
        title={progressOverlay.title}
        message={progressOverlay.message}
        onOk={handleProgressOverlayOk}
      />
    </div>
  );
};

export default AdminCourseVideosPage; 