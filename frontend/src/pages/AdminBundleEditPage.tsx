import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Save, X, Upload, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';
import Toast from '../components/Toast';
import { getEnglishText, getTigrinyaText } from '../utils/bilingualHelper';

interface Course {
  _id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
  price: number;
  thumbnailURL?: string;
}

interface Bundle {
  _id: string;
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  originalValue?: number;
  status: 'active' | 'inactive' | 'archived';
  category?: string;
  featured?: boolean;
  tags?: string[];
  courseIds: Array<{ _id: string }>;
  isPublic?: boolean;
  maxEnrollments?: number;
}

const AdminBundleEditPage: React.FC = () => {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();
  
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = useState({
    titleEn: '',
    titleTg: '',
    descriptionEn: '',
    descriptionTg: '',
    longDescriptionEn: '',
    longDescriptionTg: '',
    price: 0,
    originalValue: 0,
    courseIds: [] as string[],
    category: '',
    tags: [] as string[],
    featured: false,
    status: 'active' as 'active' | 'inactive' | 'archived',
    isPublic: true,
    maxEnrollments: ''
  });
  
  const [tagsInput, setTagsInput] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [progressOverlay, setProgressOverlay] = useState({
    isVisible: false,
    progress: 0,
    status: 'loading' as 'loading' | 'success' | 'error',
    title: '',
    message: ''
  });

  // Fetch bundle and courses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const adminToken = localStorage.getItem('adminToken');
        
        if (!adminToken) {
          throw new Error('Admin token not found');
        }

        // Fetch bundle
        const bundleResponse = await fetch(buildApiUrl(`/api/bundles/${bundleId}`), {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!bundleResponse.ok) {
          throw new Error('Failed to fetch bundle');
        }

        const bundleData = await bundleResponse.json();
        const bundleInfo = bundleData.data.bundle;
        setBundle(bundleInfo);
        
        // Helper function to parse and extract text from bilingual data
        const parseBilingual = (text: any): { en: string; tg: string } => {
          if (!text) return { en: '', tg: '' };
          
          // If it's a JSON string, parse it first
          let parsedText = text;
          if (typeof text === 'string' && (text.startsWith('{') || text.startsWith('"'))) {
            try {
              parsedText = JSON.parse(text);
            } catch (e) {
              // Not JSON, treat as plain string
              return { en: text, tg: '' };
            }
          }
          
          // If it's a bilingual object
          if (typeof parsedText === 'object' && parsedText !== null) {
            return {
              en: parsedText.en || '',
              tg: parsedText.tg || ''
            };
          }
          
          // If it's a plain string, assume it's English
          if (typeof parsedText === 'string') {
            return { en: parsedText, tg: '' };
          }
          
          return { en: '', tg: '' };
        };
        
        // Parse all bilingual fields
        const titleData = parseBilingual(bundleInfo.title);
        const descriptionData = parseBilingual(bundleInfo.description);
        const longDescriptionData = bundleInfo.longDescription 
          ? parseBilingual(bundleInfo.longDescription)
          : { en: descriptionData.en, tg: descriptionData.tg };
        
        // Set form data - extract both English and Tigrinya text from bilingual objects
        setFormData({
          titleEn: titleData.en,
          titleTg: titleData.tg,
          descriptionEn: descriptionData.en,
          descriptionTg: descriptionData.tg,
          longDescriptionEn: longDescriptionData.en,
          longDescriptionTg: longDescriptionData.tg,
          price: bundleInfo.price || 0,
          originalValue: bundleInfo.originalValue || 0,
          courseIds: bundleInfo.courseIds.map((c: any) => c._id || c),
          category: bundleInfo.category || '',
          tags: bundleInfo.tags || [],
          featured: bundleInfo.featured || false,
          status: bundleInfo.status || 'active',
          isPublic: bundleInfo.isPublic !== false,
          maxEnrollments: bundleInfo.maxEnrollments?.toString() || ''
        });
        
        setTagsInput(bundleInfo.tags ? bundleInfo.tags.join(', ') : '');
        if (bundleInfo.thumbnailURL) {
          setThumbnailPreview(bundleInfo.thumbnailURL);
        }

        // Fetch available courses
        const coursesResponse = await fetch(buildApiUrl('/api/courses?status=active&limit=1000'), {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setAvailableCourses(coursesData.data?.courses || coursesData.courses || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bundle');
      } finally {
        setLoading(false);
      }
    };

    if (bundleId) {
      fetchData();
    }
  }, [bundleId]);

  // Calculate original value when courses change
  useEffect(() => {
    if (formData.courseIds.length > 0) {
      const selectedCourses = availableCourses.filter(c => formData.courseIds.includes(c._id));
      const totalPrice = selectedCourses.reduce((sum, course) => sum + (course.price || 0), 0);
      setFormData(prev => ({ ...prev, originalValue: totalPrice }));
    }
  }, [formData.courseIds, availableCourses]);

  const handleCourseToggle = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      courseIds: prev.courseIds.includes(courseId)
        ? prev.courseIds.filter(id => id !== courseId)
        : [...prev.courseIds, courseId]
    }));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB');
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnailPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'loading',
        title: 'Updating Bundle',
        message: 'Updating bundle information...'
      });

      // Update bundle - convert to bilingual format
      const updatePayload = {
        title: JSON.stringify({ en: formData.titleEn, tg: formData.titleTg }),
        description: JSON.stringify({ en: formData.descriptionEn, tg: formData.descriptionTg }),
        longDescription: JSON.stringify({ en: formData.longDescriptionEn || formData.descriptionEn, tg: formData.longDescriptionTg || formData.descriptionTg }),
        price: formData.price,
        originalValue: formData.originalValue || undefined,
        courseIds: formData.courseIds,
        category: formData.category || undefined,
        tags: formData.tags,
        featured: formData.featured,
        status: formData.status,
        isPublic: formData.isPublic,
        maxEnrollments: formData.maxEnrollments ? parseInt(formData.maxEnrollments) : undefined
      };

      setProgressOverlay(prev => ({ ...prev, progress: 30, message: 'Saving bundle...' }));

      const updateResponse = await fetch(buildApiUrl(`/api/bundles/${bundleId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Failed to update bundle');
      }

      setProgressOverlay(prev => ({ ...prev, progress: 60, message: 'Bundle updated successfully' }));

      // Upload thumbnail if changed
      if (thumbnailFile && bundleId) {
        setUploadingThumbnail(true);
        setProgressOverlay(prev => ({ ...prev, progress: 70, message: 'Uploading thumbnail...' }));

        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', thumbnailFile);

        const thumbnailResponse = await fetch(buildApiUrl(`/api/bundles/thumbnail/${bundleId}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`
          },
          body: thumbnailFormData
        });

        if (!thumbnailResponse.ok) {
          console.warn('Failed to upload thumbnail');
        } else {
          setProgressOverlay(prev => ({ ...prev, progress: 90, message: 'Thumbnail uploaded' }));
        }
        setUploadingThumbnail(false);
      }

      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Bundle Updated Successfully',
        message: 'Bundle has been updated successfully!'
      });

      setTimeout(() => {
        navigate(`/admin/bundles/${bundleId}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bundle');
      setProgressOverlay({
        isVisible: true,
        progress: 0,
        status: 'error',
        title: 'Error Updating Bundle',
        message: err instanceof Error ? err.message : 'Failed to update bundle'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleProgressOverlayOk = () => {
    setProgressOverlay(prev => ({ ...prev, isVisible: false }));
    if (progressOverlay.status === 'success') {
      navigate(`/admin/bundles/${bundleId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading bundle...</p>
        </div>
      </div>
    );
  }

  if (error && !bundle) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-orange-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16 sm:pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Edit Bundle</h1>
          <p className="text-gray-400 mt-2">Update bundle information</p>
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
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title (English) *</label>
                <input
                  type="text"
                  value={formData.titleEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter bundle title in English"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title (Tigrinya) *</label>
                <input
                  type="text"
                  value={formData.titleTg}
                  onChange={(e) => setFormData(prev => ({ ...prev, titleTg: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter bundle title in Tigrinya"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (English) *</label>
                <textarea
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter bundle description in English"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (Tigrinya) *</label>
                <textarea
                  value={formData.descriptionTg}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionTg: e.target.value }))}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter bundle description in Tigrinya"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Long Description (English)</label>
                <textarea
                  value={formData.longDescriptionEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, longDescriptionEn: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter detailed description in English (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Long Description (Tigrinya)</label>
                <textarea
                  value={formData.longDescriptionTg}
                  onChange={(e) => setFormData(prev => ({ ...prev, longDescriptionTg: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter detailed description in Tigrinya (optional)"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    required
                    className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Original Value ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.originalValue}
                    readOnly
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                    title="Automatically calculated from selected courses"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Course Selection */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Select Courses *</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-700 rounded-lg p-4">
              {availableCourses.map((course) => (
                <label
                  key={course._id}
                  className="flex items-start p-3 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-cyan-500/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.courseIds.includes(course._id)}
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
            {formData.courseIds.length > 0 && (
              <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-300 text-sm">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {formData.courseIds.length} course{formData.courseIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Thumbnail</h2>
            {thumbnailPreview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-700 mb-4">
                <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(bundle?.thumbnailURL || null);
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
                    {thumbnailFile ? 'Change thumbnail' : 'Upload thumbnail image'}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </div>
            </label>
          </div>

          {/* Additional Settings */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Additional Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                    setFormData(prev => ({ ...prev, tags }));
                  }}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                    className="h-4 w-4 text-cyan-400 focus:ring-cyan-500 border-gray-600 rounded"
                  />
                  <span className="ml-2 text-gray-300">Featured Bundle</span>
                </label>

                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
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
                  value={formData.maxEnrollments}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxEnrollments: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-700">
            <Link
              to={`/admin/bundles/${bundleId}`}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleUpdate}
              disabled={saving || uploadingThumbnail}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || uploadingThumbnail ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

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

export default AdminBundleEditPage;











