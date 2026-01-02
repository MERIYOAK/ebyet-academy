import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';
import Toast from '../components/Toast';
import { getEnglishText } from '../utils/bilingualHelper';

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  thumbnailURL?: string;
}

const AdminBundleUploadPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [bundle, setBundle] = useState({
    title: { en: '', tg: '' },
    description: { en: '', tg: '' },
    longDescription: { en: '', tg: '' },
    price: 0,
    originalValue: 0,
    courseIds: [] as string[],
    category: '',
    tags: [] as string[],
    featured: false,
    isPublic: true,
    maxEnrollments: ''
  });
  
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Progress overlay state
  const [progressOverlay, setProgressOverlay] = useState({
    isVisible: false,
    progress: 0,
    status: 'loading' as 'loading' | 'success' | 'error',
    title: '',
    message: ''
  });

  // Fetch available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        const adminToken = localStorage.getItem('adminToken');
        
        if (!adminToken) {
          throw new Error('Admin token not found');
        }

        const response = await fetch(buildApiUrl('/api/courses?status=active&limit=1000'), {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }

        const data = await response.json();
        setAvailableCourses(data.data?.courses || data.courses || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setToast({
          message: err instanceof Error ? err.message : 'Failed to load courses',
          type: 'error'
        });
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Calculate original value when courses change
  useEffect(() => {
    if (bundle.courseIds.length > 0) {
      const selectedCourses = availableCourses.filter(c => bundle.courseIds.includes(c._id));
      const totalPrice = selectedCourses.reduce((sum, course) => sum + (course.price || 0), 0);
      setBundle(prev => ({ ...prev, originalValue: totalPrice }));
    } else {
      setBundle(prev => ({ ...prev, originalValue: 0 }));
    }
  }, [bundle.courseIds, availableCourses]);

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCourseToggle = (courseId: string) => {
    setBundle(prev => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter(id => id !== courseId)
        : [...prev.courseIds, courseId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // Validation
    if (!bundle.title.en?.trim() || !bundle.title.tg?.trim()) {
      setError('Bundle title in both English and Tigrinya is required');
      setIsLoading(false);
      return;
    }
    if (!bundle.description.en?.trim() || !bundle.description.tg?.trim()) {
      setError('Bundle description in both English and Tigrinya is required');
      setIsLoading(false);
      return;
    }
    if (bundle.courseIds.length === 0) {
      setError('Please select at least one course');
      setIsLoading(false);
      return;
    }
    if (bundle.price < 0) {
      setError('Price must be a positive number');
      setIsLoading(false);
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'loading',
        title: 'Creating Bundle',
        message: 'Creating bundle in database...'
      });

      // Step 1: Create the bundle
      const bundlePayload = {
        title: JSON.stringify(bundle.title),
        description: JSON.stringify(bundle.description),
        longDescription: JSON.stringify(bundle.longDescription.en || bundle.longDescription.tg ? bundle.longDescription : bundle.description),
        price: bundle.price,
        originalValue: bundle.originalValue || undefined,
        courseIds: bundle.courseIds,
        category: bundle.category || undefined,
        tags: bundle.tags,
        featured: bundle.featured,
        isPublic: bundle.isPublic,
        maxEnrollments: bundle.maxEnrollments ? parseInt(bundle.maxEnrollments) : undefined
      };

      setProgressOverlay(prev => ({ ...prev, progress: 20, message: 'Creating bundle...' }));

      const bundleResponse = await fetch(buildApiUrl('/api/bundles'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(bundlePayload)
      });

      if (!bundleResponse.ok) {
        const errorData = await bundleResponse.json();
        throw new Error(errorData.message || 'Failed to create bundle');
      }

      const bundleData = await bundleResponse.json();
      const bundleId = bundleData.data?.bundle?.id || bundleData._id;

      setProgressOverlay(prev => ({ ...prev, progress: 50, message: 'Bundle created successfully' }));

      // Step 2: Upload thumbnail if provided
      if (thumbnail && bundleId) {
        setProgressOverlay(prev => ({ ...prev, progress: 60, message: 'Uploading thumbnail...' }));

        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', thumbnail);

        const thumbnailResponse = await fetch(buildApiUrl(`/api/bundles/thumbnail/${bundleId}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          },
          body: thumbnailFormData
        });

        if (!thumbnailResponse.ok) {
          console.warn('Failed to upload thumbnail, but bundle was created');
        } else {
          setProgressOverlay(prev => ({ ...prev, progress: 90, message: 'Thumbnail uploaded' }));
        }
      }

      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Bundle Created Successfully',
        message: `Bundle "${bundle.title.en}" has been created successfully!`
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/bundles');
      }, 2000);

    } catch (err) {
      console.error('Error creating bundle:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bundle');
      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'error',
        title: 'Error Creating Bundle',
        message: err instanceof Error ? err.message : 'Failed to create bundle'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
    if (progressOverlay.status === 'success') {
      navigate('/admin/bundles');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16 sm:pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Create New Bundle</h1>
          <p className="text-gray-400 mt-2">Create a new course bundle with multiple courses</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-orange-400 mr-2 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-orange-300 font-semibold mb-1">Error</h3>
                <p className="text-orange-200 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-orange-400 hover:text-orange-300 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bundle Title (English) *
                </label>
                <input
                  type="text"
                  value={bundle.title.en}
                  onChange={(e) => setBundle(prev => ({ ...prev, title: { ...prev.title, en: e.target.value } }))}
                  required
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g., Complete Trading Mastery Bundle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bundle Title (Tigrinya) *
                </label>
                <input
                  type="text"
                  value={bundle.title.tg}
                  onChange={(e) => setBundle(prev => ({ ...prev, title: { ...prev.title, tg: e.target.value } }))}
                  required
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g., ምሉእ ናይ ንግዲ ምስላል ባንድል"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Description (English) *
                </label>
                <textarea
                  value={bundle.description.en}
                  onChange={(e) => setBundle(prev => ({ ...prev, description: { ...prev.description, en: e.target.value } }))}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Brief description of the bundle (English)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Description (Tigrinya) *
                </label>
                <textarea
                  value={bundle.description.tg}
                  onChange={(e) => setBundle(prev => ({ ...prev, description: { ...prev.description, tg: e.target.value } }))}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Brief description of the bundle (Tigrinya)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Long Description (English)
                </label>
                <textarea
                  value={bundle.longDescription.en}
                  onChange={(e) => setBundle(prev => ({ ...prev, longDescription: { ...prev.longDescription, en: e.target.value } }))}
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Detailed description for the bundle detail page (English)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Long Description (Tigrinya)
                </label>
                <textarea
                  value={bundle.longDescription.tg}
                  onChange={(e) => setBundle(prev => ({ ...prev, longDescription: { ...prev.longDescription, tg: e.target.value } }))}
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Detailed description for the bundle detail page (Tigrinya)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Bundle Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bundle.price}
                    onChange={(e) => setBundle(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                    className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Original Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bundle.originalValue}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                    title="Automatically calculated from selected courses"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated from selected courses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Select Courses *</h2>
            
            {coursesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading courses...</p>
              </div>
            ) : availableCourses.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No courses available. Please create courses first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-700 rounded-lg p-4">
                {availableCourses.map((course) => (
                  <label
                    key={course._id}
                    className="flex items-start p-3 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-cyan-500/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={bundle.courseIds.includes(course._id)}
                      onChange={() => handleCourseToggle(course._id)}
                      className="mt-1 mr-3 h-4 w-4 text-cyan-400 focus:ring-cyan-500 border-gray-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium">{getEnglishText(course.title)}</h3>
                        <span className="text-cyan-400 font-semibold">${course.price.toFixed(2)}</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-1">{getEnglishText(course.description)}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            {bundle.courseIds.length > 0 && (
              <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-300 text-sm">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {bundle.courseIds.length} course{bundle.courseIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail Upload */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Bundle Thumbnail</h2>
            
            <div className="space-y-4">
              {thumbnailPreview && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-700">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnail(null);
                      setThumbnailPreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <label className="block">
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-400 transition-colors">
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-400">
                      {thumbnail ? 'Change thumbnail' : 'Upload thumbnail image'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Additional Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={bundle.category}
                  onChange={(e) => setBundle(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g., Trading, Investing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                    setBundle(prev => ({ ...prev, tags }));
                  }}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="e.g., Trading, Advanced, Strategies"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundle.featured}
                    onChange={(e) => setBundle(prev => ({ ...prev, featured: e.target.checked }))}
                    className="h-4 w-4 text-cyan-400 focus:ring-cyan-500 border-gray-600 rounded"
                  />
                  <span className="ml-2 text-gray-300">Featured Bundle</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bundle.isPublic}
                    onChange={(e) => setBundle(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="h-4 w-4 text-cyan-400 focus:ring-cyan-500 border-gray-600 rounded"
                  />
                  <span className="ml-2 text-gray-300">Public</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Enrollments (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  min="1"
                  value={bundle.maxEnrollments}
                  onChange={(e) => setBundle(prev => ({ ...prev, maxEnrollments: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link
              to="/admin/bundles"
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Bundle'}
            </button>
          </div>
        </form>

        {/* Progress Overlay */}
        {progressOverlay.isVisible && (
          <ProgressOverlay
            isVisible={progressOverlay.isVisible}
            progress={progressOverlay.progress}
            status={progressOverlay.status}
            title={progressOverlay.title}
            message={progressOverlay.message}
            onOk={handleProgressOverlayOk}
          />
        )}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminBundleUploadPage;








