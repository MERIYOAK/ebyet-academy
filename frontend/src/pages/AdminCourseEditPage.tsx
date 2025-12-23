import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Upload, Image, Video, Plus, Trash2, Eye, Edit, Check, AlertCircle } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';

interface Video {
  _id: string;
  title: string;
  duration: string;
  order: number;
  status: string;
  uploadedBy: string;
  createdAt: string;
  description?: string;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  status: 'active' | 'inactive' | 'archived';
  category?: string;
  level?: string;
  tags?: string[];
  thumbnailURL?: string;
  videos?: Video[];
  version: number;
  currentVersion: number;
  totalEnrollments: number;
  createdBy: string;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
  hasWhatsappGroup?: boolean;
  whatsappGroupLink?: string;
}

const AdminCourseEditPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

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
    price: 0,
    status: 'active' as 'active' | 'inactive' | 'archived',
    category: '',
    level: '',
    tags: [] as string[],
    hasWhatsappGroup: false,
    whatsappGroupLink: '',
  });

  // Tags input state
  const [tagsInput, setTagsInput] = useState<string>('');

  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailHistory, setThumbnailHistory] = useState<string[]>([]);
  const [showThumbnailHistory, setShowThumbnailHistory] = useState(false);

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
      
      // Set form data
      setFormData({
        title: courseData.title || '',
        description: courseData.description || '',
        price: courseData.price || 0,
        status: courseData.status || 'active',
        category: courseData.category || '',
        level: courseData.level || '',
        tags: courseData.tags || [],
        hasWhatsappGroup: Boolean(courseData.hasWhatsappGroup),
        whatsappGroupLink: courseData.whatsappGroupLink || '',
      });
      
      // Initialize tags input
      setTagsInput(courseData.tags ? courseData.tags.join(', ') : '');

      // Set thumbnail preview
      if (courseData.thumbnailURL) {
        setThumbnailPreview(courseData.thumbnailURL);
        // Initialize thumbnail history with current thumbnail
        setThumbnailHistory([courseData.thumbnailURL]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  // Update course
  const updateCourse = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Show progress overlay
      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'loading',
        title: 'Updating Course',
        message: 'Validating course information...'
      });
      
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Update progress - validation
      setProgressOverlay(prev => ({
        ...prev,
        progress: 20,
        message: 'Validating course information...'
      }));

      // Validate required fields with user-friendly messages
      const validationErrors = [];
      
      if (!formData.title.trim()) {
        validationErrors.push('Course title is required');
      }
      if (!formData.description.trim()) {
        validationErrors.push('Course description is required');
      }
      if (formData.price < 0) {
        validationErrors.push('Price must be a positive number');
      }
      if (!formData.category.trim()) {
        validationErrors.push('Course category is required');
      }
      if (!formData.level.trim()) {
        validationErrors.push('Course level is required');
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
        setSaving(false);
        return;
      }

      // Update progress - preparing request
      setProgressOverlay(prev => ({
        ...prev,
        progress: 40,
        message: 'Preparing to update course...'
      }));

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Update progress - processing response
      setProgressOverlay(prev => ({
        ...prev,
        progress: 80,
        message: 'Processing server response...'
      }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update course');
      }

      // Update progress - success
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Course Updated Successfully',
        message: 'Your course has been updated successfully!'
      });
      
      setSuccess('Course updated successfully!');
      
    } catch (err) {
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Failed to update course'
      });
      setError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  // Upload thumbnail
  const uploadThumbnail = async () => {
    if (!thumbnailFile) return;

    try {
      setUploadingThumbnail(true);
      setError(null);
      
      // Show progress overlay
      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'loading',
        title: 'Uploading Thumbnail',
        message: 'Preparing to upload thumbnail...'
      });
      
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Update progress - preparing form data
      setProgressOverlay(prev => ({
        ...prev,
        progress: 20,
        message: 'Preparing thumbnail for upload...'
      }));

      const formData = new FormData();
      formData.append('file', thumbnailFile);

      // Update progress - uploading
      setProgressOverlay(prev => ({
        ...prev,
        progress: 40,
        message: 'Uploading thumbnail to server...'
      }));

      const response = await fetch(buildApiUrl(`/api/courses/thumbnail/${courseId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
        body: formData,
      });

      // Update progress - processing response
      setProgressOverlay(prev => ({
        ...prev,
        progress: 80,
        message: 'Processing upload response...'
      }));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload thumbnail');
      }

      const data = await response.json();
      const newThumbnailURL = data.thumbnailURL;
      const oldThumbnailURL = data.oldThumbnailURL;
      
      setThumbnailPreview(newThumbnailURL);
      setThumbnailFile(null);
      
      // Add old thumbnail to history if it exists
      if (oldThumbnailURL && !thumbnailHistory.includes(oldThumbnailURL)) {
        setThumbnailHistory(prev => [oldThumbnailURL, ...prev]);
      }
      
      // Update progress - success
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Thumbnail Uploaded Successfully',
        message: 'Thumbnail uploaded successfully! Old thumbnails are preserved for future use.'
      });
      
      setSuccess('Thumbnail uploaded successfully! Old thumbnails are preserved for future use.');
      
      // Refresh course data
      await fetchCourse();
    } catch (err) {
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'error',
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Failed to upload thumbnail'
      });
      setError(err instanceof Error ? err.message : 'Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Restore previous thumbnail
  const restoreThumbnail = async (thumbnailURL: string) => {
    try {
      setUploadingThumbnail(true);
      setError(null);
      
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Update course with the restored thumbnail URL
      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          thumbnailURL: thumbnailURL
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore thumbnail');
      }

      setThumbnailPreview(thumbnailURL);
      setSuccess('Thumbnail restored successfully!');
      setShowThumbnailHistory(false);
      
      // Refresh course data
      await fetchCourse();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Handle thumbnail file selection
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }

      setThumbnailFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'price' ? parseFloat(value) || 0 : value,
    }));
    setError(null); // Clear error when user starts typing
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value);
  };

  const handleTagsBlur = () => {
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    // Limit to maximum 3 tags
    const limitedTags = tags.slice(0, 3);
    setFormData(prev => ({
      ...prev,
      tags: limitedTags,
    }));
    // Update input to reflect the limited tags
    setTagsInput(limitedTags.join(', '));
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };



  // Handle progress overlay OK button
  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
    
    // If it was a successful course update, redirect to course view
    if (progressOverlay.status === 'success' && progressOverlay.title === 'Course Updated Successfully') {
      navigate(`/admin/courses/${courseId}`);
    }
  };

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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <Link
                to={`/admin/courses/${courseId}`}
                className="inline-flex items-center text-gray-600 hover:text-white text-sm sm:text-base"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Course</span>
                <span className="sm:hidden">Back</span>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Edit Course</h1>
                <p className="text-sm sm:text-base text-gray-600 truncate max-w-full">{course?.title}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
              <button
                onClick={() => navigate(`/admin/courses/${courseId}`)}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-900"
              >
                <X className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">Cancel</span>
              </button>
              <button
                onClick={updateCourse}
                disabled={saving}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
                <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 ${progressOverlay.isVisible ? 'pointer-events-none' : ''}`}>
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-green-700">{success}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
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

            {/* Course Information Form */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Course Information</h2>
                
                <form className="space-y-4 sm:space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter course title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter course description"
                    />
                  </div>

                  {/* Price and Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                        Price (USD) *
                      </label>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                        Status *
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category || ''}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Category</option>
                      <option value="youtube">YouTube Mastery</option>
                      <option value="camera">Camera</option>
                      <option value="photo">Photo Editing</option>
                      <option value="video">Video Editing</option>
                      <option value="computer">Basic Computer Learning</option>
                      <option value="english">English</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Level */}
                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                      Level *
                    </label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level || ''}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (max 3)
                    </label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      value={tagsInput}
                      onChange={handleTagsChange}
                      onBlur={handleTagsBlur}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="tag1, tag2, tag3 (comma separated)"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Enter tags separated by commas (maximum 3 tags)
                    </p>
                    {tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag).length > 3 && (
                      <p className="mt-1 text-sm text-orange-600">
                        ⚠️ Only the first 3 tags will be saved
                      </p>
                    )}
                    {formData.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
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
                          name="hasWhatsappGroup"
                          checked={formData.hasWhatsappGroup || false}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="hasWhatsappGroup" className="ml-2 block text-sm text-white">
                          Enable WhatsApp Group for this course
                        </label>
                      </div>

                      {/* WhatsApp Group Link */}
                      {formData.hasWhatsappGroup && (
                        <div>
                          <label htmlFor="whatsappGroupLink" className="block text-sm font-medium text-gray-700 mb-2">
                            WhatsApp Group Link *
                          </label>
                          <input
                            type="url"
                            id="whatsappGroupLink"
                            name="whatsappGroupLink"
                            value={formData.whatsappGroupLink || ''}
                            onChange={handleInputChange}
                            required={formData.hasWhatsappGroup}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                </form>
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Course Thumbnail</h2>
                
                <div className="space-y-4">
                  {/* Current Thumbnail */}
                  {thumbnailPreview && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Thumbnail
                      </label>
                      <div className="relative inline-block">
                        <img
                          src={thumbnailPreview}
                          alt="Course thumbnail"
                          className="w-48 h-32 object-cover rounded-lg border"
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload New Thumbnail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload New Thumbnail
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-900 cursor-pointer w-full sm:w-auto justify-center"
                      >
                        <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Choose Image</span>
                        <span className="sm:hidden">Choose Image</span>
                      </label>
                      {thumbnailFile && (
                        <button
                          onClick={uploadThumbnail}
                          disabled={uploadingThumbnail}
                          className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto justify-center"
                        >
                          <Image className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{uploadingThumbnail ? 'Uploading...' : 'Upload Thumbnail'}</span>
                          <span className="sm:hidden">{uploadingThumbnail ? 'Uploading...' : 'Upload'}</span>
                        </button>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500">
                        Recommended size: 1280x720px, Max size: 5MB
                      </p>
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 <strong>Note:</strong> Old thumbnails are preserved in S3 for potential future use. 
                        You can always revert to previous thumbnails if needed.
                      </p>
                    </div>
                  </div>

                  {/* Thumbnail History */}
                  {thumbnailHistory.length > 1 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Previous Thumbnails
                        </label>
                        <button
                          onClick={() => setShowThumbnailHistory(!showThumbnailHistory)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {showThumbnailHistory ? 'Hide' : 'Show'} History
                        </button>
                      </div>
                      
                      {showThumbnailHistory && (
                        <div className="space-y-3">
                          {thumbnailHistory.slice(1).map((thumbnailURL, index) => (
                            <div key={`thumbnail-${index}-${thumbnailURL.substring(0, 20)}`} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                              <img
                                src={thumbnailURL}
                                alt={`Previous thumbnail ${index + 1}`}
                                className="w-16 h-10 object-cover rounded border"
                              />
                              <div className="flex-1">
                                <p className="text-sm text-gray-600">
                                  Previous thumbnail {index + 1}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Click restore to use this thumbnail again
                                </p>
                              </div>
                              <button
                                onClick={() => restoreThumbnail(thumbnailURL)}
                                disabled={uploadingThumbnail}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-900 disabled:opacity-50"
                              >
                                Restore
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Video Management */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Course Videos</h2>
                  <Link
                    to={`/admin/courses/${courseId}/videos`}
                    className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Manage Videos</span>
                    <span className="sm:hidden">Manage Videos</span>
                  </Link>
                </div>
                
                {course?.videos && course.videos.length > 0 ? (
                  <div className="space-y-3">
                    {course.videos.map((video, index) => (
                      <div key={video._id || `video-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-6 sm:w-12 sm:h-8 bg-gray-100 rounded flex items-center justify-center">
                              <Video className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-white truncate">{video.title}</h3>
                            <p className="text-xs text-gray-500">
                              Duration: {video.duration} • Order: {video.order || index + 1}
                            </p>
                            {video.description && (
                              <p className="text-xs text-gray-600 mt-1 bg-gray-900 p-1 rounded truncate">
                                <strong>Description:</strong> {video.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            video.status === 'active' ? 'bg-green-100 text-green-800' :
                            video.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-500/20 text-orange-300'
                          }`}>
                            {video.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Video className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-white mb-2">No videos yet</h3>
                    <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">Add videos to your course to get started.</p>
                    <Link
                      to={`/admin/courses/${courseId}/videos`}
                      className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Add First Video</span>
                      <span className="sm:hidden">Add First Video</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Course Stats */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Course Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version:</span>
                    <span className="text-sm font-medium">v{course?.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Enrollments:</span>
                    <span className="text-sm font-medium">{course?.totalEnrollments || 0}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Videos:</span>
                    <span className="text-sm font-medium">{course?.videos?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Details */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Course Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Created by:</span>
                    <p className="text-sm font-medium">{course?.createdBy}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Last modified by:</span>
                    <p className="text-sm font-medium">{course?.lastModifiedBy}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created:</span>
                    <p className="text-sm font-medium">{course?.createdAt ? formatDate(course.createdAt) : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Last updated:</span>
                    <p className="text-sm font-medium">{course?.updatedAt ? formatDate(course.updatedAt) : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    to={`/admin/courses/${courseId}/videos`}
                    className="inline-flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Manage Videos
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}`}
                    className="inline-flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Course
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

export default AdminCourseEditPage; 