import React, { useState } from 'react';
import { buildApiUrl } from '../config/environment';

import { Plus, Upload, X } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';

interface Video {
  id: string;
  title: string;
  description: string;
  file?: File;
  isFreePreview?: boolean;
  duration?: string; // Duration in MM:SS format
}

interface Course {
  title: string;
  description: string;
  price: number;
  category: string;
  level: string;
  tags: string[];
  thumbnail?: File;
  videos: Video[];
  hasWhatsappGroup: boolean;
  whatsappGroupLink: string;
}

// Small helper to timeout fetches to avoid infinite pending state
const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) => {
  const { timeoutMs = 60000, ...rest } = init as any;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
};

// Upload via XHR to get upload progress events
const xhrUpload = (options: {
  url: string;
  method?: 'POST' | 'PUT';
  formData: FormData;
  headers?: Record<string, string>;
  timeoutMs?: number;
  onProgress?: (loaded: number, total: number) => void;
}): Promise<{ status: number; responseText: string }> => {
  const { url, method = 'POST', formData, headers = {}, timeoutMs = 10 * 60 * 1000, onProgress } = options;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(evt.loaded, evt.total);
      }
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ status: xhr.status, responseText: xhr.responseText });
        } else {
          reject(new Error(xhr.responseText || `Upload failed with status ${xhr.status}`));
        }
      }
    };
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};

const AdminUploadPage = () => {
  const [course, setCourse] = useState<Course>({
    title: '',
    description: '',
    price: 0,
    category: '',
    level: '',
    tags: [],
    videos: [],
    hasWhatsappGroup: false,
    whatsappGroupLink: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadDetail, setUploadDetail] = useState<string>('');
  const [tagsInput, setTagsInput] = useState<string>(''); // Separate state for tags input
  const [error, setError] = useState<string | null>(null); // New state for error messages

  // Progress overlay state
  const [progressOverlay, setProgressOverlay] = useState({
    isVisible: false,
    progress: 0,
    status: 'loading' as 'loading' | 'success' | 'error',
    title: '',
    message: ''
  });
 
  const addVideo = () => {
    const newVideo: Video = {
      id: Date.now().toString(),
      title: '',
      description: '',
      isFreePreview: false // Default to false
    };
    setCourse(prev => ({
      ...prev,
      videos: [...prev.videos, newVideo]
    }));
  };

  const removeVideo = (videoId: string) => {
    setCourse(prev => ({
      ...prev,
      videos: prev.videos.filter(v => v.id !== videoId)
    }));
  };

  // Handle progress overlay OK button
  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
    
    // If it was a successful upload, redirect to admin courses page
    if (progressOverlay.status === 'success' && progressOverlay.title === 'Course Uploaded Successfully') {
      window.location.href = '/admin/courses';
    }
  };

  const updateVideo = (videoId: string, updates: Partial<Video>) => {
    setCourse(prev => ({
      ...prev,
      videos: prev.videos.map(v => 
        v.id === videoId ? { ...v, ...updates } : v
      )
    }));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCourse(prev => ({ ...prev, thumbnail: file }));
      console.debug('[UI] thumbnail selected:', file.name, file.size, 'bytes');
    }
  };

  const handleVideoUpload = (videoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateVideo(videoId, { file });
      console.debug('[UI] video selected:', file.name, file.size, 'bytes', 'for id:', videoId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Show progress overlay
    setProgressOverlay({
      isVisible: true,
      progress: 0,
      status: 'loading',
      title: 'Uploading Course',
      message: 'Validating course information...'
    });
    
    console.debug('[UI] submit start:', { title: course.title, videos: course.videos.length, hasThumbnail: !!course.thumbnail });
    
    try {
      // Get admin token from localStorage
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found. Please login again.');
      }

      // Update progress - validation
      setProgressOverlay(prev => ({
        ...prev,
        progress: 0,
        message: 'Validating course information...'
      }));

      // Validate required fields with user-friendly messages
      const validationErrors = [];
      
      if (!course.title.trim()) {
        validationErrors.push('Course title is required');
      }
      if (!course.description.trim()) {
        validationErrors.push('Course description is required');
      }
      if (course.price < 0) {
        validationErrors.push('Price must be a positive number');
      }
      if (!course.category.trim()) {
        validationErrors.push('Course category is required');
      }
      if (!course.level.trim()) {
        validationErrors.push('Course level is required');
      }
      if (!course.thumbnail) {
        validationErrors.push('Course thumbnail is required');
      }
      if (course.videos.length === 0) {
        validationErrors.push('At least one video is required');
      }
      
      // Check each video for required fields
      course.videos.forEach((video, index) => {
        if (!video.title.trim()) {
          validationErrors.push(`Video ${index + 1}: Title is required`);
        }
        if (!video.file) {
          validationErrors.push(`Video ${index + 1}: Video file is required`);
        }
      });

      // If there are validation errors, show them and stop
      if (validationErrors.length > 0) {
        setProgressOverlay({
          isVisible: true,
          progress: 100,
          status: 'error',
          title: 'Validation Error',
          message: `Please fix the following errors:\n${validationErrors.join('\n')}`
        });
        setIsLoading(false);
        return;
      }

      // Update progress - preparing upload
      setProgressOverlay(prev => ({
        ...prev,
        progress: 0,
        message: 'Preparing course data for upload...'
      }));

      // Compute total bytes for progress accounting
      const thumbnailBytes = course.thumbnail?.size || 0;
      const videosBytes = course.videos.reduce((sum, v) => sum + (v.file?.size || 0), 0);
      const totalBytesToUpload = thumbnailBytes + videosBytes;
      let uploadedBytesCompleted = 0;
      console.debug('[UI] bytes:', { thumbnailBytes, videosBytes, totalBytesToUpload });

      // Prepare course data
      const coursePayload = {
        title: course.title,
        description: course.description,
        price: course.price,
        category: course.category,
        level: course.level,
        tags: course.tags,
        hasWhatsappGroup: course.hasWhatsappGroup,
        whatsappGroupLink: course.whatsappGroupLink
      };

      console.debug('[UI] sending course data:', coursePayload);

      // Update progress - creating course
      setProgressOverlay(prev => ({
        ...prev,
        progress: 0,
        message: 'Creating course in database...'
      }));

      // Step 1: Create the course
      const courseResponse = await fetchWithTimeout(buildApiUrl('/api/courses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(coursePayload),
        timeoutMs: 20000
      });
      console.debug('[UI] createCourse status:', courseResponse.status);

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json();
        console.debug('[UI] createCourse error:', errorData);
        throw new Error(errorData.message || 'Failed to create course');
      }

      const courseData = await courseResponse.json();
      console.debug('[UI] course creation response:', courseData);
      const courseId = courseData.data?.course?.id || courseData._id;
      console.debug('[UI] created courseId:', courseId);

      if (!courseId) {
        console.error('[UI] No courseId found in response:', courseData);
        throw new Error('Failed to get course ID from server response');
      }

      // Step 2: Upload thumbnail if provided
      if (course.thumbnail) {
        setProgressOverlay(prev => ({
          ...prev,
          progress: Math.round((uploadedBytesCompleted / totalBytesToUpload) * 100),
          message: `Uploading thumbnail: ${course.thumbnail.name}...`
        }));
        
        console.debug('[UI] upload thumbnail start:', course.thumbnail.name);
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', course.thumbnail);
        thumbnailFormData.append('version', '1');

        await xhrUpload({
          url: buildApiUrl(`/api/courses/thumbnail/${courseId}`),
          method: 'PUT',
          formData: thumbnailFormData,
          headers: { 'Authorization': `Bearer ${adminToken}` },
          timeoutMs: 2 * 60 * 1000,
          onProgress: (loaded, total) => {
            if (totalBytesToUpload > 0) {
              const currentPercent = Math.round(((uploadedBytesCompleted + loaded) / totalBytesToUpload) * 100);
              setProgressOverlay(prev => ({
                ...prev,
                progress: currentPercent,
                message: `Uploading thumbnail: ${Math.round((loaded / total) * 100)}%`
              }));
            }
            console.debug('[UI] thumb progress:', { loaded, total, currentPercent: Math.round(((uploadedBytesCompleted + loaded) / totalBytesToUpload) * 100) });
          }
        });
        console.debug('[UI] upload thumbnail done');
        uploadedBytesCompleted += thumbnailBytes;
      }

      // Step 3: Upload videos
      for (let i = 0; i < course.videos.length; i++) {
        const video = course.videos[i];
        if (video.file && video.title) {
          setProgressOverlay(prev => ({
            ...prev,
            progress: Math.round((uploadedBytesCompleted / totalBytesToUpload) * 100),
            message: `Uploading video ${i + 1}/${course.videos.length}: ${video.file.name}...`
          }));
          
          console.debug('[UI] upload video start:', video.file.name);
          const videoFormData = new FormData();
          videoFormData.append('title', video.title);
          videoFormData.append('description', video.description);
          videoFormData.append('courseId', courseId);
          videoFormData.append('order', (i + 1).toString());
          videoFormData.append('isFreePreview', video.isFreePreview ? 'true' : 'false');
          if (video.duration) {
            videoFormData.append('duration', video.duration);
          }
          videoFormData.append('file', video.file);

          await xhrUpload({
            url: buildApiUrl('/api/videos/upload'),
            method: 'POST',
            formData: videoFormData,
            headers: { 'Authorization': `Bearer ${adminToken}` },
            timeoutMs: 35 * 60 * 1000, // 35 minutes for large files
            onProgress: (loaded, total) => {
              if (totalBytesToUpload > 0) {
                // Calculate progress more accurately
                const httpUploadPercent = Math.round((loaded / total) * 100);
                const currentVideoProgress = Math.round((uploadedBytesCompleted / totalBytesToUpload) * 100);
                
                // Show HTTP upload progress for current video, but don't let total progress exceed realistic bounds
                // HTTP upload typically completes quickly, so we cap the progress to show server processing time
                const httpUploadWeight = 0.3; // HTTP upload is only 30% of the total process
                const serverProcessingWeight = 0.7; // Server processing is 70% of the total process
                
                const httpProgress = Math.round((httpUploadPercent / 100) * httpUploadWeight * 100);
                const totalProgress = Math.min(
                  currentVideoProgress + httpProgress,
                  currentVideoProgress + Math.round(httpUploadWeight * 100) // Cap at HTTP upload completion
                );
                
                setProgressOverlay(prev => ({
                  ...prev,
                  progress: Math.max(prev.progress, totalProgress), // Don't go backwards
                  message: `Uploading video ${i + 1}/${course.videos.length}: ${httpUploadPercent}% (Sending to server...)`
                }));
              }
              console.debug('[UI] video progress:', { 
                index: i, 
                loaded, 
                total, 
                httpUploadPercent: Math.round((loaded / total) * 100),
                totalProgress: Math.round(((uploadedBytesCompleted + loaded) / totalBytesToUpload) * 100) 
              });
            }
          });
          console.debug('[UI] upload video done:', video.file.name);
          
          // Show server processing message
          setProgressOverlay(prev => ({
            ...prev,
            message: `Video ${i + 1}/${course.videos.length}: Processing on server...`
          }));
          
          uploadedBytesCompleted += (video.file.size || 0);
          
          // Update progress to show this video is complete
          setProgressOverlay(prev => ({
            ...prev,
            progress: Math.round((uploadedBytesCompleted / totalBytesToUpload) * 100),
            message: `Video ${i + 1}/${course.videos.length} uploaded successfully!`
          }));
          
          // Add a small delay to show the completion message
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Update progress - finalizing
      setProgressOverlay(prev => ({
        ...prev,
        progress: Math.round((uploadedBytesCompleted / totalBytesToUpload) * 100),
        message: 'Finalizing course upload...'
      }));

      // Update progress - success
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Course Uploaded Successfully',
        message: 'Your course has been uploaded successfully! You can now manage it from the admin dashboard.'
      });

      console.debug('[UI] upload complete');
      
      try {
        window.dispatchEvent(new Event('course:created'));
      } catch {}
      
      // Reset form
      setCourse({
        title: '',
        description: '',
        price: 0,
        category: '',
        level: '',
        tags: [],
        videos: []
      });
      setTagsInput(''); // Clear tags input

    } catch (error) {
      console.error('Upload error:', error);
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Upload Failed',
        message: `Error uploading course: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setError(`Error uploading course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      console.debug('[UI] submit end');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-20 pb-12">
      <div className={`max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 ${isLoading || progressOverlay.isVisible ? 'blur-[2px] pointer-events-none' : ''}`}>
        <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-700">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Upload New Course</h1>
            <p className="text-gray-300 mt-2 text-sm sm:text-base">Create and publish your educational content</p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8" noValidate>
            {/* Error Notification */}
            {error && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-300">Please fix the following errors:</h3>
                    <div className="mt-2 text-sm text-orange-200">
                      {error.split('\n').map((line, index) => (
                        <div key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ml-auto pl-3">
                    <button
                      onClick={() => setError(null)}
                      className="inline-flex text-orange-400 hover:text-orange-300"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Course Basic Info */}
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 border-b border-gray-200 pb-2">
                Course Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={course.title}
                    onChange={(e) => setCourse(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                    placeholder="Enter course title"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={course.description}
                    onChange={(e) => setCourse(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                    placeholder="Describe what students will learn in this course"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={course.price}
                    onChange={(e) => setCourse(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                    placeholder="99.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Category *
                  </label>
                  <select
                    value={course.category}
                    onChange={(e) => setCourse(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="youtube">YouTube Mastery</option>
                    <option value="camera">Camera</option>
                    <option value="photo">Photo Editing</option>
                    <option value="video">Video Editing</option>
                    <option value="computer">Basic Computer Learning</option>
                    <option value="english">English</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Level *
                  </label>
                  <select
                    value={course.level}
                    onChange={(e) => setCourse(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                    required
                  >
                    <option value="">Select a level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Tags (comma-separated, max 3)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    onBlur={() => {
                      const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
                      // Limit to maximum 3 tags
                      const limitedTags = tags.slice(0, 3);
                      setCourse(prev => ({ ...prev, tags: limitedTags }));
                      // Update input to reflect the limited tags
                      setTagsInput(limitedTags.join(', '));
                    }}
                    onFocus={() => {
                      // Initialize input with current tags when focused
                      if (course.tags.length > 0) {
                        setTagsInput(course.tags.join(', '));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                    placeholder="e.g., beginner, advanced, javascript, react"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Enter tags separated by commas (maximum 3 tags)
                  </p>
                  {tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag).length > 3 && (
                    <p className="mt-1 text-sm text-orange-600">
                      ⚠️ Only the first 3 tags will be saved
                    </p>
                  )}
                  {course.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {course.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* WhatsApp Group Settings */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">WhatsApp Group Settings</h3>
                  
                  <div className="space-y-4">
                    {/* Enable WhatsApp Group */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="hasWhatsappGroup"
                        checked={course.hasWhatsappGroup || false}
                        onChange={(e) => setCourse(prev => ({ ...prev, hasWhatsappGroup: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="hasWhatsappGroup" className="ml-2 block text-sm text-white">
                        Enable WhatsApp Group for this course
                      </label>
                    </div>

                    {/* WhatsApp Group Link */}
                    {course.hasWhatsappGroup && (
                      <div>
                        <label htmlFor="whatsappGroupLink" className="block text-sm font-medium text-gray-300 mb-2">
                          WhatsApp Group Link *
                        </label>
                        <input
                          type="url"
                          id="whatsappGroupLink"
                          value={course.whatsappGroupLink || ''}
                          onChange={(e) => setCourse(prev => ({ ...prev, whatsappGroupLink: e.target.value }))}
                          required={course.hasWhatsappGroup}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                          placeholder="https://chat.whatsapp.com/your-group-link"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Enter the WhatsApp group invite link. Students will get secure, temporary access to join.
                        </p>
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800">
                                Security Features
                              </h3>
                              <div className="mt-1 text-sm text-blue-700">
                                <ul className="list-disc list-inside space-y-1">
                                  <li>Links expire in 30 minutes</li>
                                  <li>One-time use only</li>
                                  <li>Only enrolled students can access</li>
                                  <li>Links cannot be shared after use</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Thumbnail *
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-cyan-400 transition-colors duration-200 cursor-pointer"
                    >
                      <Upload className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600">
                        {course.thumbnail ? course.thumbnail.name : 'Upload thumbnail'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Lessons */}
            <div className="space-y-6">

              {/* Free Preview Info Alert */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Free Preview Lessons</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Mark lessons as "Free Preview" to allow users to watch them without purchasing the course. This helps attract potential students by giving them a taste of your content.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800 border-b border-gray-200 pb-2">
                  Video Lessons
                </h2>
                <button
                  type="button"
                  onClick={addVideo}
                  className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Video</span>
                </button>
              </div>

              {course.videos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No videos added yet. Click "Add Video" to get started.</p>
                </div>
              )}

              {course.videos.map((video, index) => (
                <div key={video.id} className="bg-gray-900 rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Video {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeVideo(video.id)}
                      className="text-orange-400 hover:text-orange-300 transition-colors duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Video Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={video.title}
                      onChange={(e) => updateVideo(video.id, { title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                      placeholder="Enter video title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Lesson Description
                    </label>
                    <textarea
                      value={video.description}
                      onChange={(e) => updateVideo(video.id, { description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                      placeholder="Describe what this lesson covers..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Video Duration (MM:SS)
                    </label>
                    <input
                      type="text"
                      value={video.duration || ''}
                      onChange={(e) => updateVideo(video.id, { duration: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200"
                      placeholder="e.g., 5:30 or 1:25:45"
                      pattern="^(\d{1,2}:)?[0-5]?\d:[0-5]\d$"
                      title="Format: MM:SS or HH:MM:SS (e.g., 5:30 or 1:25:45)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter duration in MM:SS format (e.g., 5:30) or HH:MM:SS for longer videos
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Video File *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoUpload(video.id, e)}
                        className="hidden"
                        id={`video-upload-${video.id}`}
                      />
                      <label
                        htmlFor={`video-upload-${video.id}`}
                        className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-cyan-400 transition-colors duration-200 cursor-pointer"
                      >
                        <Upload className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-600">
                          {video.file ? video.file.name : 'Upload video file'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Free Preview Toggle */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`free-preview-${video.id}`}
                        checked={video.isFreePreview || false}
                        onChange={(e) => updateVideo(video.id, { isFreePreview: e.target.checked })}
                        className="h-5 w-5 text-cyan-400 focus:ring-cyan-500 border-gray-700 rounded"
                      />
                      <div>
                        <label htmlFor={`free-preview-${video.id}`} className="text-sm font-medium text-gray-300 cursor-pointer">
                          Free Preview Lesson
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Allow users to watch this lesson without purchasing the course
                        </p>
                      </div>
                    </div>
                    {video.isFreePreview && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        🔓 Free Preview
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-cyan-500 hover:to-blue-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  'Upload Course'
                )}
              </button>
            </div>
          </form>
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

export default AdminUploadPage;