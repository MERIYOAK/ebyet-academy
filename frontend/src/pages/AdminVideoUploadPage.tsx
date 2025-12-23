import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Video, Clock, User, Save, X } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';

interface Course {
  _id: string;
  title: string;
  description: string;
  videos?: any[];
}

const AdminVideoUploadPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Progress overlay state
  const [progressOverlay, setProgressOverlay] = useState({
    isVisible: false,
    progress: 0,
    status: 'loading' as 'loading' | 'success' | 'error',
    title: '',
    message: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    order: 1,
    duration: '', // Duration in MM:SS or HH:MM:SS format
    file: null as File | null,
    isFreePreview: false
  });

  // Fetch course details
  const fetchCourse = async () => {
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
      setCourse(courseData);
      
      // Set default order to next available number
      const nextOrder = (courseData.videos?.length || 0) + 1;
      setFormData(prev => ({ ...prev, order: nextOrder }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      
             // Validate file size (max 500MB)
       if (file.size > 500 * 1024 * 1024) {
         setError('Video file size must be less than 500MB');
         return;
       }

      setFormData(prev => ({ ...prev, file }));
      setError(null);
    }
  };

  // Handle progress overlay OK button
  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
    
    // If it was a successful upload, redirect to videos page
    if (progressOverlay.status === 'success' && progressOverlay.title === 'Video Uploaded Successfully') {
      navigate(`/admin/courses/${courseId}/videos`);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show progress overlay
    setProgressOverlay({
      isVisible: true,
      progress: 0,
      status: 'loading',
      title: 'Uploading Video',
      message: 'Validating video information...'
    });
    
    // Validate required fields with user-friendly messages
    const validationErrors = [];
    
    if (!formData.title.trim()) {
      validationErrors.push('Video title is required');
    }
    if (!formData.description.trim()) {
      validationErrors.push('Video description is required');
    }
    if (!formData.file) {
      validationErrors.push('Video file is required');
    }
    if (formData.order < 1) {
      validationErrors.push('Order must be at least 1');
    }

    // If there are validation errors, show them and stop
    if (validationErrors.length > 0) {
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Validation Error',
        message: `Please fix the following errors:\n${validationErrors.join('\n')}`
      });
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      // Update progress - preparing upload
      setProgressOverlay(prev => ({
        ...prev,
        progress: 10,
        message: 'Preparing video for upload...'
      }));
      
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Update progress - creating form data
      setProgressOverlay(prev => ({
        ...prev,
        progress: 20,
        message: 'Preparing upload data...'
      }));

      const videoFormData = new FormData();
      videoFormData.append('title', formData.title);
      videoFormData.append('description', formData.description);
      videoFormData.append('order', formData.order.toString());
      videoFormData.append('courseId', courseId!);
      videoFormData.append('isFreePreview', formData.isFreePreview ? 'true' : 'false');
      if (formData.duration) {
        videoFormData.append('duration', formData.duration);
      }
      videoFormData.append('file', formData.file!);

      // Update progress - starting upload
      setProgressOverlay(prev => ({
        ...prev,
        progress: 5,
        message: `Starting upload: ${formData.file?.name}...`
      }));

      // Upload via XHR to track progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const httpProgress = Math.round((event.loaded / event.total) * 100);
          const loadedMB = (event.loaded / (1024 * 1024)).toFixed(1);
          const totalMB = (event.total / (1024 * 1024)).toFixed(1);
          
          // HTTP upload is 30% of total process (server will handle the remaining 70%)
          const overallProgress = Math.min(Math.round(httpProgress * 0.3), 30); // Cap at 30%
          
          setProgressOverlay(prev => ({
            ...prev,
            progress: Math.min(Math.max(prev.progress, overallProgress), 30), // Don't go backwards, cap at 30%
            message: `Uploading to server: ${httpProgress}% (${loadedMB}MB / ${totalMB}MB)`
          }));
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Show server processing message - start from 30% and progress to 100%
            setProgressOverlay(prev => ({
              ...prev,
              progress: 30,
              message: 'Processing on server...'
            }));

            // Simulate server processing with gradual progress
            let processingProgress = 30;
            const processingInterval = setInterval(() => {
              processingProgress += 10;
              if (processingProgress <= 100) {
                setProgressOverlay(prev => ({
                  ...prev,
                  progress: processingProgress,
                  message: processingProgress < 100 
                    ? `Processing on server... ${processingProgress}%`
                    : 'Finalizing upload...'
                }));
              } else {
                clearInterval(processingInterval);
                setProgressOverlay({
                  isVisible: true,
                  progress: 100,
                  status: 'success',
                  title: 'Video Uploaded Successfully',
                  message: formData.duration 
                    ? 'Video uploaded successfully with manual duration!'
                    : 'Video uploaded successfully! Duration automatically detected.'
                });
              }
            }, 200); // Update every 200ms for smooth progress
            
            setSuccess(formData.duration 
              ? 'Video uploaded successfully with manual duration!'
              : 'Video uploaded successfully! Duration automatically detected.');
            
            // Reset form
            setFormData({
              title: '',
              description: '',
              order: (course?.videos?.length || 0) + 2,
              duration: '',
              file: null,
              isFreePreview: false
            });
          } else {
            const errorData = JSON.parse(xhr.responseText);
            setProgressOverlay({
              isVisible: true,
              progress: 100,
              status: 'error',
              title: 'Upload Failed',
              message: errorData.message || 'Failed to upload video'
            });
            setError(errorData.message || 'Failed to upload video');
          }
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setProgressOverlay({
          isVisible: true,
          progress: 100,
          status: 'error',
          title: 'Upload Failed',
          message: 'Network error during upload'
        });
        setError('Network error during upload');
        setUploading(false);
      };

      xhr.open('POST', buildApiUrl('/api/videos/upload'));
      xhr.setRequestHeader('Authorization', `Bearer ${adminToken}`);
      xhr.send(videoFormData);

    } catch (err) {
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Failed to upload video'
      });
      setError(err instanceof Error ? err.message : 'Failed to upload video');
      setUploading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-orange-400 mb-4">{error}</p>
          <Link
            to="/admin/courses"
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-cyan-500 hover:to-blue-500"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to={`/admin/courses/${courseId}/videos`}
                className="inline-flex items-center text-gray-600 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Videos
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white">Upload Video</h1>
                <p className="text-gray-600">{course?.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Save className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-orange-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-300">Please fix the following errors:</h3>
                <div className="mt-1 text-sm text-orange-200">
                  {error.split('\n').map((line, index) => (
                    <div key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-orange-400 hover:text-orange-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-700 font-medium">Uploading video...</span>
              <span className="text-blue-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-gray-800 rounded-lg shadow-sm border">
          <div className={`p-6 ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
            <h2 className="text-lg font-semibold text-white mb-6">Video Information</h2>
            
            {/* Info Alert */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Duration Input</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You can manually enter the video duration in MM:SS or HH:MM:SS format. If left empty, duration will be automatically detected from the uploaded file.
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Video Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter video title"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter video description"
                />
              </div>

              {/* Order */}
              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2">
                  Order *
                </label>
                <input
                  type="number"
                  id="order"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  min="1"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1"
                />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Video Duration (MM:SS or HH:MM:SS)
                </label>
                <input
                  type="text"
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  pattern="^(\d{1,2}:)?[0-5]?\d:[0-5]\d$"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="5:30 or 1:25:45"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter duration in MM:SS format (e.g., 5:30) or HH:MM:SS format (e.g., 1:25:45). Leave empty for automatic detection.
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label htmlFor="video-file" className="block text-sm font-medium text-gray-700 mb-2">
                  Video File *
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="video-file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="video-file"
                    className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors duration-200 cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-600">
                      {formData.file ? formData.file.name : 'Choose video file'}
                    </span>
                  </label>
                </div>
                {formData.file && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
                    <Video className="h-4 w-4" />
                    <span>{formData.file.name}</span>
                    <span>•</span>
                    <span>{(formData.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                )}
                                 <p className="mt-1 text-sm text-gray-500">
                   Supported formats: MP4, AVI, MOV, WMV, WebM, OGG, FLV, MKV. Max size: 500MB. Duration can be manually entered or automatically detected.
                 </p>
              </div>

              {/* Free Preview Toggle */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isFreePreview"
                    checked={formData.isFreePreview}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFreePreview: e.target.checked }))}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div>
                    <label htmlFor="isFreePreview" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Free Preview Lesson
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Allow users to watch this lesson without purchasing the course
                    </p>
                  </div>
                </div>
                {formData.isFreePreview && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🔓 Free Preview
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <Link
                  to={`/admin/courses/${courseId}/videos`}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-gray-800 hover:bg-gray-900"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Course Info */}
        <div className="mt-8 bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Course Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Course Details</h4>
                <p className="text-sm text-white mb-1"><strong>Title:</strong> {course?.title}</p>
                <p className="text-sm text-white mb-1"><strong>Description:</strong> {course?.description}</p>
                <p className="text-sm text-white"><strong>Current Videos:</strong> {course?.videos?.length || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Link
                    to={`/admin/courses/${courseId}/videos`}
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    View All Videos
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}/edit`}
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit Course
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overlay */}
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

export default AdminVideoUploadPage; 