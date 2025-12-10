import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Video, Edit, Trash2, Eye, Clock, User, Save, X, GripVertical, Check, AlertCircle } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';
import { formatDuration } from '../utils/durationFormatter';

interface Video {
  _id: string;
  title: string;
  duration: string;
  order: number;
  status: string;
  uploadedBy: string;
  createdAt: string;
  courseId: string;
  description?: string;
  isFreePreview?: boolean;
}

interface Course {
  _id: string;
  title: string;
  description: string;
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
  
  // Inline editing state
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    order: 0
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
      console.log('🎬 Frontend received course data:', {
        courseId: courseData._id,
        title: courseData.title,
        videoCount: courseData.videos?.length || 0,
        videos: courseData.videos?.map((v: Video) => ({ 
          id: v._id, 
          title: v.title, 
          duration: v.duration,
          status: v.status 
        })) || []
      });
      
      
      setCourse(courseData);
      setVideos(courseData.videos || []);
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

  // Start inline editing
  const startEditing = (video: Video) => {
    setEditingVideo(video._id);
    setEditForm({
      title: video.title,
      description: video.description || '',
      order: video.order || 0
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingVideo(null);
    setEditForm({ title: '', description: '', order: 0 });
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

      const response = await fetch(buildApiUrl(`/api/videos/${editingVideo}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
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
      setEditForm({ title: '', description: '', order: 0 });
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
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle progress overlay OK button
  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Course not found'}</p>
          <Link
            to="/admin/courses"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <Link
                to={`/admin/courses/${courseId}/edit`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Course</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Course Videos</h1>
                <p className="text-sm sm:text-base text-gray-600 truncate max-w-full">{course.title}</p>
              </div>
            </div>
            {/* Upload Video Button - Commented Out */}
            {/* <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
              <Link
                to={`/admin/courses/${courseId}/videos/upload`}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Upload Video</span>
                <span className="sm:hidden">Upload Video</span>
              </Link>
            </div> */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Bulk Actions - Commented Out */}
        {/* {videos.length > 0 && (
          <div className={`mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border p-3 sm:p-4 ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
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
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 w-full sm:w-auto"
                    >
                      Apply
                    </button>
                  </div>
                )}
            </div>
          </div>
        )} */}

        {/* Videos List */}
        <div className={`bg-white rounded-lg shadow-sm border ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Videos ({videos.length})
              </h2>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500">
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
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">Start building your course by uploading the first video.</p>
                {/* Upload First Video Button - Commented Out */}
                {/* <Link
                  to={`/admin/courses/${courseId}/videos/upload`}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Upload First Video</span>
                  <span className="sm:hidden">Upload First Video</span>
                </Link> */}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {videos.map((video, index) => (
                  <div key={video._id || `video-${index}-${video.title}`} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 space-y-3 sm:space-y-0 ${selectedVideos.includes(video._id) ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedVideos.includes(video._id)}
                        onChange={() => toggleVideoSelection(video._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      {/* Drag Handle */}
                      <div className="flex-shrink-0 cursor-move">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>
                      
                      <div className="flex-shrink-0">
                        <div className="w-12 h-8 sm:w-16 sm:h-10 bg-gray-100 rounded flex items-center justify-center">
                          <Video className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {editingVideo === video._id ? (
                          // Inline Edit Form
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Video title"
                            />
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Video description (optional)"
                              rows={2}
                            />
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                              <input
                                type="number"
                                value={editForm.order}
                                onChange={(e) => setEditForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Order"
                              />
                              <button
                                onClick={saveEdit}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Display Mode
                          <>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">{video.title}</h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                                {video.status}
                              </span>
                              {video.isFreePreview && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  🔓 Free Preview
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs text-gray-500">
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
                              <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                                <strong className="text-gray-700">Lesson Description:</strong> {video.description}
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
                          className="inline-flex items-center px-2 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded text-xs font-medium"
                          title="Edit video"
                        >
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">Edit</span>
                        </button>
                        <button
                          onClick={() => toggleFreePreview(video._id, video.isFreePreview || false)}
                          disabled={togglingPreview === video._id}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            video.isFreePreview 
                              ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                              : 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
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
                        {/*<button
                          onClick={() => deleteVideo(video._id)}
                          className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-medium"
                          title="Delete video"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">Delete</span>
                        </button>*/}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Course Info */}
        <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Course Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Course Details</h4>
                <p className="text-sm text-gray-900 mb-1"><strong>Title:</strong> {course.title}</p>
                <p className="text-sm text-gray-900 mb-1"><strong>Description:</strong> {course.description}</p>
                <p className="text-sm text-gray-900"><strong>Total Videos:</strong> {videos.length}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Link
                    to={`/admin/courses/${courseId}/edit`}
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit Course Details
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}`}
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Course
                  </Link>
                  {/* Upload New Video Link - Commented Out */}
                  {/* <Link
                    to={`/admin/courses/${courseId}/videos/upload`}
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    Upload New Video
                  </Link> */}
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