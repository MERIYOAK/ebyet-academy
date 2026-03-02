import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Upload, Video, Clock, User, Save, X } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';
import { getEnglishText } from '../utils/bilingualHelper';

interface Course {
  _id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
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

  // Form state - bilingual support
  const [formData, setFormData] = useState({
    titleEn: '',
    titleTg: '',
    descriptionEn: '',
    descriptionTg: '',
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
      
      // Ensure currentVersion is set (use from course or currentVersion object)
      if (!courseData.currentVersion && data.data.currentVersion?.versionNumber) {
        courseData.currentVersion = data.data.currentVersion.versionNumber;
      }
      // Also check if course has version field
      if (!courseData.currentVersion && courseData.version) {
        courseData.currentVersion = courseData.version;
      }
      
      setCourse(courseData);
      
      // Set default order to next available number
      const nextOrder = (courseData.videos?.length || 0) + 1;
      setFormData(prev => ({ ...prev, order: nextOrder }));
      
      console.log('Course loaded:', {
        courseId: courseData._id,
        currentVersion: courseData.currentVersion,
        version: courseData.version,
        videoCount: courseData.videos?.length || 0
      });
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
    
    if (!formData.titleEn.trim()) {
      validationErrors.push('Video title (English) is required');
    }
    if (!formData.titleTg.trim()) {
      validationErrors.push('Video title (Tigrinya) is required');
    }
    if (!formData.descriptionEn.trim()) {
      validationErrors.push('Video description (English) is required');
    }
    if (!formData.descriptionTg.trim()) {
      validationErrors.push('Video description (Tigrinya) is required');
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

      // Validate required fields
      if (!formData.duration || formData.duration.trim() === '') {
        throw new Error('Video duration is required. Please enter duration in MM:SS or HH:MM:SS format.');
      }

      const videoFormData = new FormData();
      // Send bilingual format for video title and description
      videoFormData.append('title', JSON.stringify({ 
        en: formData.titleEn.trim(), 
        tg: formData.titleTg.trim() 
      }));
      videoFormData.append('description', JSON.stringify({ 
        en: formData.descriptionEn.trim(), 
        tg: formData.descriptionTg.trim() 
      }));
      videoFormData.append('order', formData.order.toString());
      videoFormData.append('courseId', courseId!);
      // Get version from course (currentVersion or default to 1)
      const version = course?.currentVersion || course?.version || 1;
      videoFormData.append('version', version.toString());
      videoFormData.append('isFreePreview', formData.isFreePreview ? 'true' : 'false');
      videoFormData.append('duration', formData.duration);
      videoFormData.append('file', formData.file!);
      
      console.log('Uploading video with data:', {
        courseId,
        version,
        title: { en: formData.titleEn, tg: formData.titleTg },
        order: formData.order,
        duration: formData.duration,
        fileName: formData.file?.name
      });

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
          console.log('Upload response status:', xhr.status);
          console.log('Upload response:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            // Parse response if available
            let responseData = null;
            try {
              responseData = JSON.parse(xhr.responseText);
              console.log('Upload successful, response data:', responseData);
            } catch (e) {
              console.log('Response is not JSON, treating as success');
            }
            
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
                  message: 'Video uploaded successfully! Redirecting to videos page...'
                });
                
                // Auto-navigate after a short delay
                setTimeout(() => {
                  navigate(`/admin/courses/${courseId}/videos`);
                }, 1500);
              }
            }, 200); // Update every 200ms for smooth progress
            
            setSuccess('Video uploaded successfully! Redirecting...');
            
            // Reset form
            setFormData({
              titleEn: '',
              titleTg: '',
              descriptionEn: '',
              descriptionTg: '',
              order: (course?.videos?.length || 0) + 2,
              duration: '',
              file: null,
              isFreePreview: false
            });
          } else {
            let errorMessage = 'Failed to upload video';
            let errorDetails = '';
            try {
              const errorData = JSON.parse(xhr.responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
              // Include additional error details if available
              if (errorData.details) {
                errorDetails = `\n\nDetails: ${errorData.details}`;
              }
            } catch (parseError) {
              // If response is not JSON, use status text or default message
              errorMessage = xhr.statusText || `Server error (${xhr.status})`;
              // Try to extract error message from response text
              if (xhr.responseText && xhr.responseText.length < 500) {
                errorDetails = `\n\nResponse: ${xhr.responseText}`;
              }
            }
            console.error('Upload failed:', {
              status: xhr.status,
              statusText: xhr.statusText,
              response: xhr.responseText
            });
            setProgressOverlay({
              isVisible: true,
              progress: 100,
              status: 'error',
              title: 'Upload Failed',
              message: errorMessage + errorDetails
            });
            setError(errorMessage + errorDetails);
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
          <p className="mt-4 text-gray-300">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-orange-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Upload Video</h1>
                <p className="text-gray-400">{getEnglishText(course?.title)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center">
              <Save className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-green-300">{success}</p>
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
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-300 font-medium">Uploading video...</span>
              <span className="text-blue-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-500/20 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
          <div className={`p-6 ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
            <h2 className="text-lg font-semibold text-white mb-6">Video Information</h2>
            
            {/* Info Alert */}
            <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-300">Duration Input</h3>
                  <p className="text-sm text-blue-200 mt-1">
                    Please enter the video duration in MM:SS or HH:MM:SS format (e.g., 5:30 or 1:25:45). Duration is required.
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Title (English) */}
              <div>
                <label htmlFor="titleEn" className="block text-sm font-medium text-gray-300 mb-2">
                  Video Title (English) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="titleEn"
                  value={formData.titleEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                  required
                  className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                  placeholder="Enter video title in English"
                />
              </div>

              {/* Title (Tigrinya) */}
              <div>
                <label htmlFor="titleTg" className="block text-sm font-medium text-gray-300 mb-2">
                  Video Title (Tigrinya) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="titleTg"
                  value={formData.titleTg}
                  onChange={(e) => setFormData(prev => ({ ...prev, titleTg: e.target.value }))}
                  required
                  className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                  placeholder="Enter video title in Tigrinya"
                />
              </div>

              {/* Description (English) */}
              <div>
                <label htmlFor="descriptionEn" className="block text-sm font-medium text-gray-300 mb-2">
                  Description (English) <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                  rows={3}
                  required
                  className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                  placeholder="Enter video description in English"
                />
              </div>

              {/* Description (Tigrinya) */}
              <div>
                <label htmlFor="descriptionTg" className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Tigrinya) <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="descriptionTg"
                  value={formData.descriptionTg}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionTg: e.target.value }))}
                  rows={3}
                  required
                  className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                  placeholder="Enter video description in Tigrinya"
                />
              </div>

              {/* Order */}
              <div>
                <label htmlFor="order" className="block text-sm font-medium text-gray-300 mb-2">
                  Order *
                </label>
                <input
                  type="number"
                  id="order"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  min="1"
                  required
                  className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                  placeholder="1"
                />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-2">
                  Video Duration (MM:SS or HH:MM:SS) *
                </label>
                <input
                  type="text"
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => {
                    // Allow only numbers and colons
                    const value = e.target.value.replace(/[^0-9:]/g, '');
                    setFormData(prev => ({ ...prev, duration: value }));
                  }}
                  pattern="^(\d{1,2}:)?[0-5]?\d:[0-5]\d$"
                  required
                  className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                  placeholder="5:30 or 1:25:45"
                />
                <p className="mt-1 text-sm text-gray-400">
                  Enter duration in MM:SS format (e.g., 5:30) or HH:MM:SS format (e.g., 1:25:45). This field is required.
                </p>
              </div>

              {/* File Upload */}
              <div>
                <label htmlFor="video-file" className="block text-sm font-medium text-gray-300 mb-2">
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
                    className="flex items-center justify-center w-full px-4 py-3 bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg hover:border-cyan-500 hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-300">
                      {formData.file ? formData.file.name : 'Choose video file'}
                    </span>
                  </label>
                </div>
                {formData.file && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-gray-300">
                    <Video className="h-4 w-4" />
                    <span>{formData.file.name}</span>
                    <span>•</span>
                    <span>{(formData.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                )}
                <p className="mt-1 text-sm text-gray-400">
                  Supported formats: MP4, AVI, MOV, WMV, WebM, OGG, FLV, MKV. Max size: 500MB. Duration must be entered manually.
                </p>
              </div>

              {/* Free Preview Toggle */}
              <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isFreePreview"
                    checked={formData.isFreePreview}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFreePreview: e.target.checked }))}
                    className="h-5 w-5 text-green-500 focus:ring-green-500 border-gray-600 rounded bg-gray-700"
                  />
                  <div>
                    <label htmlFor="isFreePreview" className="text-sm font-medium text-gray-300 cursor-pointer">
                      Free Preview Lesson
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      Allow users to watch this lesson without purchasing the course
                    </p>
                  </div>
                </div>
                {formData.isFreePreview && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                    🔓 Free Preview
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <Link
                  to={`/admin/courses/${courseId}/videos`}
                  className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Course Info */}
        <div className="mt-8 bg-gray-800 rounded-lg shadow-sm border border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Course Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Course Details</h4>
                <p className="text-sm text-white mb-1"><strong>Title:</strong> {getEnglishText(course?.title)}</p>
                <p className="text-sm text-gray-300 mb-1"><strong>Description:</strong> {getEnglishText(course?.description)}</p>
                <p className="text-sm text-white"><strong>Current Videos:</strong> {course?.videos?.length || 0}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Link
                    to={`/admin/courses/${courseId}/videos`}
                    className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                  >
                    View All Videos
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}/edit`}
                    className="block text-sm text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
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