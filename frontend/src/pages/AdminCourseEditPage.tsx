import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Save, X, Upload, Image, Video, Plus, Trash2, Eye, Edit, Check, AlertCircle, FileText, Download, Power, PowerOff, ExternalLink } from 'lucide-react';
import ProgressOverlay from '../components/ProgressOverlay';
import { getEnglishText, getTigrinyaText } from '../utils/bilingualHelper';

interface Video {
  _id: string;
  title: string | { en: string; tg: string };
  duration: string;
  order: number;
  status: string;
  uploadedBy: string;
  createdAt: string;
  description?: string | { en: string; tg: string };
}

interface Enrollment {
  userId: string;
  enrolledAt: string;
  versionEnrolled: number;
  status: 'active' | 'completed' | 'cancelled';
  lastAccessedAt?: string;
  progress?: number;
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
  enrolledStudents?: Enrollment[];
  createdBy: string;
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
  hasWhatsappGroup?: boolean;
  whatsappGroupLink?: string;
  deactivatedAt?: string;
  archiveGracePeriod?: string;
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
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);

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
  const [thumbnailKey, setThumbnailKey] = useState<number>(0); // Force remount on update

  // Materials state
  const [materials, setMaterials] = useState<any[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState({
    titleEn: '',
    titleTg: '',
    descriptionEn: '',
    descriptionTg: '',
    order: 1,
    file: null as File | null
  });
  const [editMaterialForm, setEditMaterialForm] = useState({
    titleEn: '',
    titleTg: '',
    descriptionEn: '',
    descriptionTg: '',
    order: 1
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
      
      // Helper function to parse bilingual data (handles objects, JSON strings, or plain strings)
      const parseBilingual = (value: any): { en: string; tg: string } => {
        if (!value) return { en: '', tg: '' };
        
        // If it's already an object with en/tg properties
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return {
            en: value.en || '',
            tg: value.tg || ''
          };
        }
        
        // If it's a string, try to parse as JSON
        if (typeof value === 'string') {
          // Check if it looks like JSON (starts with { or ")
          if (value.trim().startsWith('{') || value.trim().startsWith('"')) {
            try {
              const parsed = JSON.parse(value);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return {
                  en: parsed.en || '',
                  tg: parsed.tg || ''
                };
              }
            } catch (e) {
              // Not valid JSON, treat as plain English string
              return { en: value, tg: '' };
            }
          }
          // Plain string - treat as English only
          return { en: value, tg: '' };
        }
        
        return { en: '', tg: '' };
      };
      
      // Set form data - extract both English and Tigrinya from bilingual objects/JSON strings
      const titleParsed = parseBilingual(courseData.title);
      const descriptionParsed = parseBilingual(courseData.description);
      
      const titleEn = titleParsed.en;
      const titleTg = titleParsed.tg;
      const descriptionEn = descriptionParsed.en;
      const descriptionTg = descriptionParsed.tg;
      
      setFormData({
        titleEn,
        titleTg,
        descriptionEn,
        descriptionTg,
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
        // Reset thumbnail key to ensure proper rendering
        setThumbnailKey(0);
      }

      // Fetch materials (use courseData directly since state update is async)
      await fetchMaterials(courseData.currentVersion || courseData.version || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course');
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials
  const fetchMaterials = async (version?: number) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken || !courseId) return;

      // Use provided version, or fallback to course state, or default to 1
      const versionNumber = version !== undefined 
        ? version 
        : (course?.currentVersion || course?.version || 1);

      const response = await fetch(buildApiUrl(`/api/materials/course/${courseId}?version=${versionNumber}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaterials(data.data?.materials || []);
        console.log('📦 Materials fetched:', data.data?.materials?.length || 0, 'materials');
      } else {
        console.error('Failed to fetch materials, status:', response.status);
        setMaterials([]);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setMaterials([]);
    }
  };

  // Upload material
  const uploadMaterial = async () => {
    // Validate all required fields
    if (!materialForm.file) {
      setError('Please select a file to upload');
      return;
    }
    if (!materialForm.titleEn.trim()) {
      setError('Title (English) is required');
      return;
    }
    if (!materialForm.titleTg.trim()) {
      setError('Title (Tigrinya) is required');
      return;
    }
    if (!materialForm.descriptionEn.trim()) {
      setError('Description (English) is required');
      return;
    }
    if (!materialForm.descriptionTg.trim()) {
      setError('Description (Tigrinya) is required');
      return;
    }

    try {
      setUploadingMaterial(true);
      setError(null);

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const formData = new FormData();
      formData.append('file', materialForm.file);
      formData.append('courseId', courseId!);
      formData.append('version', String(course?.currentVersion || course?.version || 1));
      // Send bilingual format for materials
      formData.append('title', JSON.stringify({ 
        en: materialForm.titleEn.trim(), 
        tg: materialForm.titleTg.trim()
      }));
      formData.append('description', JSON.stringify({ 
        en: materialForm.descriptionEn.trim(), 
        tg: materialForm.descriptionTg.trim()
      }));
      formData.append('order', String(materialForm.order));

      const response = await fetch(buildApiUrl('/api/materials/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload material');
      }

      setSuccess('Material uploaded successfully');
      setMaterialForm({ titleEn: '', titleTg: '', descriptionEn: '', descriptionTg: '', order: materials.length + 1, file: null });
      await fetchCourse(); // Refresh course to update version if needed (this will also fetch materials)
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload material');
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Start editing material
  const startEditingMaterial = (material: any) => {
    setEditingMaterialId(material.id);
    
    // Extract English and Tigrinya text
    let titleEn = '';
    let titleTg = '';
    if (typeof material.title === 'string') {
      titleEn = material.title;
    } else if (material.title && typeof material.title === 'object') {
      titleEn = material.title.en || '';
      titleTg = material.title.tg || '';
    }
    
    let descriptionEn = '';
    let descriptionTg = '';
    if (material.description) {
      if (typeof material.description === 'string') {
        descriptionEn = material.description;
      } else if (material.description && typeof material.description === 'object') {
        descriptionEn = material.description.en || '';
        descriptionTg = material.description.tg || '';
      }
    }
    
    setEditMaterialForm({
      titleEn,
      titleTg,
      descriptionEn,
      descriptionTg,
      order: material.order || 1
    });
  };

  // Cancel editing material
  const cancelEditingMaterial = () => {
    setEditingMaterialId(null);
    setEditMaterialForm({
      titleEn: '',
      titleTg: '',
      descriptionEn: '',
      descriptionTg: '',
      order: 1
    });
  };

  // Update material
  const updateMaterial = async (materialId: string) => {
    try {
      setUploadingMaterial(true);
      setError(null);
      setSuccess(null);

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Send bilingual format
      const response = await fetch(buildApiUrl(`/api/materials/${materialId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: JSON.stringify({
            en: editMaterialForm.titleEn || '',
            tg: editMaterialForm.titleTg || ''
          }),
          description: JSON.stringify({
            en: editMaterialForm.descriptionEn || '',
            tg: editMaterialForm.descriptionTg || ''
          }),
          order: editMaterialForm.order
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update material');
      }

      setSuccess('Material updated successfully');
      setEditingMaterialId(null);
      await fetchCourse(); // Refresh course to get updated materials
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update material');
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Delete material
  const deleteMaterial = async (materialId: string) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/materials/${materialId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete material');
      }

      setSuccess('Material deleted successfully');
      await fetchCourse(); // Refresh course to update version if needed (this will also fetch materials)
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete material');
    }
  };

  // Deactivate course
  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate this course? Enrolled students will still have access, but the course will be hidden from public listings. After 6 months, it will be automatically archived.')) {
      return;
    }

    try {
      setDeactivating(true);
      setError(null);

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}/deactivate`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Admin request' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deactivate course');
      }

      setSuccess('Course deactivated successfully. Enrolled students can still access it.');
      await fetchCourse(); // Refresh course data
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate course');
    } finally {
      setDeactivating(false);
    }
  };

  // Reactivate course
  const handleReactivate = async () => {
    try {
      setReactivating(true);
      setError(null);

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}/reactivate`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reactivate course');
      }

      setSuccess('Course reactivated successfully. It is now visible in public listings.');
      await fetchCourse(); // Refresh course data
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate course');
    } finally {
      setReactivating(false);
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
      
      if (!formData.titleEn.trim()) {
        validationErrors.push('Course title (English) is required');
      }
      if (!formData.titleTg.trim()) {
        validationErrors.push('Course title (Tigrinya) is required');
      }
      if (!formData.descriptionEn.trim()) {
        validationErrors.push('Course description (English) is required');
      }
      if (!formData.descriptionTg.trim()) {
        validationErrors.push('Course description (Tigrinya) is required');
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

      // Convert form data to bilingual format
      const { titleEn, titleTg, descriptionEn, descriptionTg, ...restFormData } = formData;
      const updatePayload = {
        ...restFormData,
        title: JSON.stringify({ en: titleEn, tg: titleTg }),
        description: JSON.stringify({ en: descriptionEn, tg: descriptionTg }),
      };

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
        method: 'PUT',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(updatePayload),
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
      // IMPORTANT: Send the current version so the server updates the course document correctly
      const currentVersion = course?.currentVersion || course?.version || 1;
      formData.append('version', String(currentVersion));
      console.log('📸 [uploadThumbnail] Uploading thumbnail for version:', currentVersion);

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
      console.log('📸 [uploadThumbnail] Server response:', data);
      
      // Handle both response structures (data.data.thumbnailURL or data.thumbnailURL)
      const newThumbnailURL = data.data?.thumbnailURL || data.thumbnailURL;
      const oldThumbnails = data.data?.oldThumbnails || {};
      const oldThumbnailURL = oldThumbnails.course || oldThumbnails.version || data.oldThumbnailURL;
      
      if (!newThumbnailURL) {
        throw new Error('No thumbnail URL returned from server');
      }
      
      console.log('📸 [uploadThumbnail] New thumbnail URL:', newThumbnailURL);
      console.log('📸 [uploadThumbnail] Old thumbnail URL:', oldThumbnailURL);
      
      // Update course state immediately to reflect the change
      if (course) {
        setCourse(prev => prev ? { ...prev, thumbnailURL: newThumbnailURL } : null);
      }
      
      // For presigned URLs (which already have query parameters), we don't need cache-busting
      // The presigned URL itself is unique and will work
      // For public URLs, we can add cache-busting if needed
      const isPresignedUrl = newThumbnailURL.includes('X-Amz-') || newThumbnailURL.includes('AWSAccessKeyId');
      let thumbnailURLToUse = newThumbnailURL;
      
      if (!isPresignedUrl) {
        // Only add cache-busting for non-presigned URLs
        const separator = newThumbnailURL.includes('?') ? '&' : '?';
        thumbnailURLToUse = `${newThumbnailURL}${separator}_t=${Date.now()}`;
        console.log('📸 [uploadThumbnail] Added cache-busting to public URL:', thumbnailURLToUse);
      } else {
        console.log('📸 [uploadThumbnail] Using presigned URL (no cache-busting needed):', thumbnailURLToUse.substring(0, 100) + '...');
      }
      
      // Update thumbnail preview and force remount by updating the key
      setThumbnailPreview(thumbnailURLToUse);
      setThumbnailKey(prev => prev + 1); // Increment key to force React to remount the image
      setThumbnailFile(null);
      
      // Update progress - success
      setProgressOverlay({
        isVisible: true,
        progress: 100,
        status: 'success',
        title: 'Thumbnail Uploaded Successfully',
        message: 'Thumbnail uploaded successfully!'
      });
      
      setSuccess('Thumbnail uploaded successfully!');
      
      // Note: We don't call fetchCourse() here because:
      // 1. We already have the updated thumbnailURL from the server response
      // 2. fetchCourse() might overwrite thumbnailPreview with stale cached data
      // 3. The course state is already updated above
      // If other course data needs refreshing, it can be done manually or on next page load
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Edit Course</h1>
                <p className="text-sm sm:text-base text-gray-400 truncate max-w-full">{getEnglishText(course?.title)}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
              <button
                onClick={() => navigate(`/admin/courses/${courseId}`)}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
              >
                <X className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">Cancel</span>
              </button>
              <button
                onClick={updateCourse}
                disabled={saving}
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-colors duration-200"
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
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-green-300">{success}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
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
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
              <div className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Course Information</h2>
                
                <form className="space-y-4 sm:space-y-6">
                  {/* Title - English */}
                  <div>
                    <label htmlFor="titleEn" className="block text-sm font-medium text-gray-300 mb-2">
                      Course Title (English) *
                    </label>
                    <input
                      type="text"
                      id="titleEn"
                      name="titleEn"
                      value={formData.titleEn}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                      placeholder="Enter course title in English"
                    />
                  </div>

                  {/* Title - Tigrinya */}
                  <div>
                    <label htmlFor="titleTg" className="block text-sm font-medium text-gray-300 mb-2">
                      Course Title (Tigrinya) *
                    </label>
                    <input
                      type="text"
                      id="titleTg"
                      name="titleTg"
                      value={formData.titleTg}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                      placeholder="Enter course title in Tigrinya"
                    />
                  </div>

                  {/* Description - English */}
                  <div>
                    <label htmlFor="descriptionEn" className="block text-sm font-medium text-gray-300 mb-2">
                      Description (English) *
                    </label>
                    <textarea
                      id="descriptionEn"
                      name="descriptionEn"
                      value={formData.descriptionEn}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                      placeholder="Enter course description in English"
                    />
                  </div>

                  {/* Description - Tigrinya */}
                  <div>
                    <label htmlFor="descriptionTg" className="block text-sm font-medium text-gray-300 mb-2">
                      Description (Tigrinya) *
                    </label>
                    <textarea
                      id="descriptionTg"
                      name="descriptionTg"
                      value={formData.descriptionTg}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                      placeholder="Enter course description in Tigrinya"
                    />
                  </div>

                  {/* Price and Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
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
                        className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
                        Status *
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category || ''}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Select Category</option>
                      <option value="crypto">Crypto</option>
                      <option value="investing">Investing</option>
                      <option value="trading">Trading</option>
                      <option value="stock-market">Stock Market</option>
                      <option value="etf">ETF</option>
                      <option value="option-trading">Option Trading</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Level */}
                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-300 mb-2">
                      Level *
                    </label>
                    <select
                      id="level"
                      name="level"
                      value={formData.level || ''}
                      onChange={handleInputChange}
                      required
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                    >
                      <option value="">Select Level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                      Tags (max 3)
                    </label>
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      value={tagsInput}
                      onChange={handleTagsChange}
                      onBlur={handleTagsBlur}
                      className="block w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                      placeholder="tag1, tag2, tag3 (comma separated)"
                    />
                    <p className="mt-1 text-sm text-gray-400">
                      Enter tags separated by commas (maximum 3 tags)
                    </p>
                    {tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag).length > 3 && (
                      <p className="mt-1 text-sm text-orange-400">
                        ⚠️ Only the first 3 tags will be saved
                      </p>
                    )}
                    {formData.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Group Settings */}
                  <div className="border-t border-gray-700 pt-6">
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
                          className="h-4 w-4 text-cyan-500 focus:ring-cyan-500 border-gray-600 rounded bg-gray-700"
                        />
                        <label htmlFor="hasWhatsappGroup" className="ml-2 block text-sm text-gray-300">
                          Enable WhatsApp Group for this course
                        </label>
                      </div>

                      {/* WhatsApp Group Link */}
                      {formData.hasWhatsappGroup && (
                        <div>
                          <label htmlFor="whatsappGroupLink" className="block text-sm font-medium text-gray-300 mb-2">
                            WhatsApp Group Link *
                          </label>
                          <input
                            type="url"
                            id="whatsappGroupLink"
                            name="whatsappGroupLink"
                            value={formData.whatsappGroupLink || ''}
                            onChange={handleInputChange}
                            required={formData.hasWhatsappGroup}
                            className="block w-full px-3 py-2 bg-gray-700 text-white border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-400"
                            placeholder="https://chat.whatsapp.com/your-group-link"
                          />
                          <p className="mt-1 text-sm text-gray-400">
                            Enter the WhatsApp group invite link. Students will get secure, temporary access to join.
                          </p>
                          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-300">
                                  Security Features
                                </h3>
                                <div className="mt-1 text-sm text-blue-200">
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
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
              <div className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Course Thumbnail</h2>
                
                <div className="space-y-4">
                  {/* Current Thumbnail */}
                  {thumbnailPreview && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Thumbnail
                      </label>
                      <div className="relative inline-block">
                        <img
                          key={`thumbnail-${thumbnailKey}-${thumbnailPreview}`}
                          src={thumbnailPreview}
                          alt="Course thumbnail"
                          className="w-48 h-32 object-cover rounded-lg border border-gray-600"
                          onLoad={() => {
                            console.log('📸 [Thumbnail] Image loaded successfully:', thumbnailPreview);
                          }}
                          onError={(e) => {
                            console.error('📸 [Thumbnail] Image failed to load:', thumbnailPreview);
                            // If image fails to load, try without cache-busting parameter
                            const urlWithoutCache = thumbnailPreview?.split('?')[0]?.split('&')[0];
                            if (urlWithoutCache && e.currentTarget.src !== urlWithoutCache) {
                              console.log('📸 [Thumbnail] Retrying without cache-busting:', urlWithoutCache);
                              e.currentTarget.src = urlWithoutCache;
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload New Thumbnail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 cursor-pointer w-full sm:w-auto justify-center transition-colors duration-200"
                      >
                        <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Choose Image</span>
                        <span className="sm:hidden">Choose Image</span>
                      </label>
                      {thumbnailFile && (
                        <button
                          onClick={uploadThumbnail}
                          disabled={uploadingThumbnail}
                          className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto justify-center transition-colors duration-200"
                        >
                          <Image className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">{uploadingThumbnail ? 'Uploading...' : 'Upload Thumbnail'}</span>
                          <span className="sm:hidden">{uploadingThumbnail ? 'Uploading...' : 'Upload'}</span>
                        </button>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-400">
                        Recommended size: 1280x720px, Max size: 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Materials Management */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-hidden">
                <h2 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Course Materials</h2>
                
                {/* Upload Form */}
                <div className="mb-6 p-4 bg-gray-700/50 border border-gray-600 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      File <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.txt,.zip,.rar,.json,.png,.jpg,.jpeg,.mp3,.py"
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                      required
                      className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-600 file:text-white hover:file:bg-gray-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Allowed: PDF, Excel, Word, PowerPoint, CSV, ZIP, images, audio, Python files (Max: 100MB)
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title (English) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={materialForm.titleEn}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="Enter material title in English"
                      required
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title (Tigrinya) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={materialForm.titleTg}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, titleTg: e.target.value }))}
                      placeholder="Enter material title in Tigrinya"
                      required
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (English) <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={materialForm.descriptionEn}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, descriptionEn: e.target.value }))}
                      placeholder="Enter material description in English"
                      rows={2}
                      required
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (Tigrinya) <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={materialForm.descriptionTg}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, descriptionTg: e.target.value }))}
                      placeholder="Enter material description in Tigrinya"
                      rows={2}
                      required
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Order <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={materialForm.order}
                      onChange={(e) => setMaterialForm(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                      min="1"
                      required
                      className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  
                  <button
                    onClick={uploadMaterial}
                    disabled={uploadingMaterial || !materialForm.file || !materialForm.titleEn.trim() || !materialForm.titleTg.trim() || !materialForm.descriptionEn.trim() || !materialForm.descriptionTg.trim()}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingMaterial ? 'Uploading...' : 'Upload Material'}
                  </button>
                </div>

                {/* Materials List */}
                {materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material, index) => (
                      <div key={material.id || `material-${index}`} className="bg-gray-700/50 border border-gray-600 rounded-lg overflow-hidden">
                        {editingMaterialId === material.id ? (
                          // Edit Form
                          <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-medium text-white">Edit Material</h3>
                              <button
                                onClick={cancelEditingMaterial}
                                className="text-gray-400 hover:text-white"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Title (English) *
                              </label>
                              <input
                                type="text"
                                value={editMaterialForm.titleEn}
                                onChange={(e) => setEditMaterialForm(prev => ({ ...prev, titleEn: e.target.value }))}
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                                required
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Title (Tigrinya) (optional)
                              </label>
                              <input
                                type="text"
                                value={editMaterialForm.titleTg}
                                onChange={(e) => setEditMaterialForm(prev => ({ ...prev, titleTg: e.target.value }))}
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description (English) (optional)
                              </label>
                              <textarea
                                value={editMaterialForm.descriptionEn}
                                onChange={(e) => setEditMaterialForm(prev => ({ ...prev, descriptionEn: e.target.value }))}
                                rows={2}
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description (Tigrinya) (optional)
                              </label>
                              <textarea
                                value={editMaterialForm.descriptionTg}
                                onChange={(e) => setEditMaterialForm(prev => ({ ...prev, descriptionTg: e.target.value }))}
                                rows={2}
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Order
                              </label>
                              <input
                                type="number"
                                value={editMaterialForm.order}
                                onChange={(e) => setEditMaterialForm(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                                min="1"
                                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2 pt-2">
                              <button
                                onClick={() => updateMaterial(material.id)}
                                disabled={uploadingMaterial || !editMaterialForm.titleEn.trim()}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {uploadingMaterial ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button
                                onClick={cancelEditingMaterial}
                                className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Display View
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 space-y-2 sm:space-y-0">
                            <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-6 sm:w-12 sm:h-8 bg-gray-600 rounded flex items-center justify-center">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <h3 className="text-sm font-medium text-white truncate break-words">{getEnglishText(material.title)}</h3>
                                <p className="text-xs text-gray-400 truncate">
                                  {material.formattedSize || `${(material.fileSize / 1024).toFixed(2)} KB`} • {material.fileType?.type || 'File'}
                                </p>
                                {material.description && (
                                  <p className="text-xs text-gray-300 mt-1 bg-gray-800 p-2 rounded break-words overflow-hidden line-clamp-2 max-w-full">
                                    {getEnglishText(material.description)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                onClick={() => startEditingMaterial(material)}
                                className="inline-flex items-center px-2 py-1 border border-cyan-600 text-xs font-medium rounded text-cyan-300 bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors duration-200 whitespace-nowrap"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </button>
                              {material.downloadUrl && (
                                <a
                                  href={material.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 border border-gray-600 text-xs font-medium rounded text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors duration-200 whitespace-nowrap"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Open
                                </a>
                              )}
                              <button
                                onClick={() => deleteMaterial(material.id)}
                                className="inline-flex items-center px-2 py-1 border border-red-600 text-xs font-medium rounded text-red-300 bg-red-500/20 hover:bg-red-500/30 transition-colors duration-200 whitespace-nowrap"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-white mb-2">No materials yet</h3>
                    <p className="text-sm sm:text-base text-gray-400">Upload course materials like PDFs, spreadsheets, or documents.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Management */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Course Videos</h2>
                  <Link
                    to={`/admin/courses/${courseId}/videos`}
                    className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 w-full sm:w-auto transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Manage Videos</span>
                    <span className="sm:hidden">Manage Videos</span>
                  </Link>
                </div>
                
                {course?.videos && course.videos.length > 0 ? (
                  <div className="space-y-3">
                    {course.videos.map((video, index) => (
                      <div key={video._id || `video-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-700/50 border border-gray-600 rounded-lg space-y-2 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-6 sm:w-12 sm:h-8 bg-gray-600 rounded flex items-center justify-center">
                              <Video className="h-3 w-3 sm:h-4 sm:w-4 text-gray-300" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-white truncate">{getEnglishText(video.title)}</h3>
                            <p className="text-xs text-gray-400">
                              Duration: {video.duration} • Order: {video.order || index + 1}
                            </p>
                            {video.description && (
                              <p className="text-xs text-gray-300 mt-1 bg-gray-800 p-2 rounded break-words overflow-hidden line-clamp-3 max-w-full">
                                <strong className="text-gray-200">Description:</strong> {getEnglishText(video.description)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            video.status === 'active' ? 'bg-green-500/20 text-green-300' :
                            video.status === 'processing' ? 'bg-yellow-500/20 text-yellow-300' :
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
                    <Video className="h-10 w-10 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-white mb-2">No videos yet</h3>
                    <p className="text-sm sm:text-base text-gray-400 mb-3 sm:mb-4">Add videos to your course to get started.</p>
                    <Link
                      to={`/admin/courses/${courseId}/videos`}
                      className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 w-full sm:w-auto transition-colors duration-200"
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
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Course Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Version:</span>
                    <span className="text-sm font-medium text-white">v{course?.currentVersion || course?.version || 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Enrollments:</span>
                    <span className="text-sm font-medium text-white">
                      {course?.enrolledStudents 
                        ? course.enrolledStudents.filter(
                            (enrollment: Enrollment) => 
                              enrollment.versionEnrolled === (course.currentVersion || course.version || 1) &&
                              enrollment.status !== 'cancelled'
                          ).length
                        : 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Videos:</span>
                    <span className="text-sm font-medium text-white">{course?.videos?.length || 0}</span>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Total Enrollments:</span>
                      <span className="text-sm font-medium text-white">{course?.totalEnrollments || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Details */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Course Details</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-400">Created by:</span>
                    <p className="text-sm font-medium text-white">{course?.createdBy}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Last modified by:</span>
                    <p className="text-sm font-medium text-white">{course?.lastModifiedBy}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Created:</span>
                    <p className="text-sm font-medium text-white">{course?.createdAt ? formatDate(course.createdAt) : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Last updated:</span>
                    <p className="text-sm font-medium text-white">{course?.updatedAt ? formatDate(course.updatedAt) : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    to={`/admin/courses/${courseId}/videos`}
                    className="inline-flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Manage Videos
                  </Link>
                  <Link
                    to={`/admin/courses/${courseId}`}
                    className="inline-flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Course
                  </Link>
                  
                  {/* Deactivate/Reactivate Course */}
                  {course?.status === 'active' ? (
                    <button
                      onClick={handleDeactivate}
                      disabled={deactivating}
                      className="inline-flex items-center w-full px-3 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <PowerOff className="h-4 w-4 mr-2" />
                      {deactivating ? 'Deactivating...' : 'Deactivate Course'}
                    </button>
                  ) : course?.status === 'inactive' ? (
                    <button
                      onClick={handleReactivate}
                      disabled={reactivating}
                      className="inline-flex items-center w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <Power className="h-4 w-4 mr-2" />
                      {reactivating ? 'Reactivating...' : 'Reactivate Course'}
                    </button>
                  ) : null}
                  
                  {course?.status === 'inactive' && course?.deactivatedAt && (
                    <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                      <p className="text-xs text-yellow-300 font-medium mb-1">Deactivated</p>
                      <p className="text-xs text-yellow-400">
                        {new Date(course.deactivatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-yellow-400 mt-1">
                        Will be archived in 6 months
                      </p>
                    </div>
                  )}
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