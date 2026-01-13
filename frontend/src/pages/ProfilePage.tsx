import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../config/environment';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, Mail, Calendar, Shield, Camera, Save, Edit3, X, 
  CheckCircle, AlertCircle, Eye, EyeOff, Phone, MapPin, Globe, 
  UserCheck, Trash2, Check
} from 'lucide-react';
import { config } from '../config/environment';
import { validatePassword } from '../utils/passwordValidation';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  authProvider: string;
  profilePhotoKey?: string;
  isVerified: boolean;
  createdAt: string;
  purchasedCourses?: string[];
  // Extended profile fields
  firstName?: string;
  lastName?: string;
  age?: number;
  sex?: string;
  address?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  age: string;
  sex: string;
  address: string;
  phoneNumber: string;
  country: string;
  city: string;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  age?: string;
  phoneNumber?: string;
  address?: string;
  country?: string;
  city?: string;
}

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    age: '',
    sex: '',
    address: '',
    phoneNumber: '',
    country: '',
    city: ''
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Animation states
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(buildApiUrl('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(t('profile.failed_to_fetch_user'));
        }

        const result = await response.json();
        setUserData(result.data);
        
        // Parse name into first and last name
        const nameParts = result.data.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        setFormData({
          firstName,
          lastName,
          age: result.data.age?.toString() || '',
          sex: result.data.sex || '',
          address: result.data.address || '',
          phoneNumber: result.data.phoneNumber || '',
          country: result.data.country || '',
          city: result.data.city || ''
        });

        // Fetch profile image if available
        if (result.data.profilePhotoKey) {
          try {
            const photoResponse = await fetch(buildApiUrl('/api/users/me/photo'), {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (photoResponse.ok) {
              const photoResult = await photoResponse.json();
              setProfileImageUrl(photoResult.data.photoUrl);
            } else {
              console.log('Profile photo not available or expired');
              setProfileImageUrl(null);
            }
          } catch (photoError) {
            console.log('Profile photo not available');
            setProfileImageUrl(null);
          }
        } else {
          // User doesn't have a profile photo
          setProfileImageUrl(null);
        }

      } catch (error) {
        console.error('Error fetching user data:', error);
        showToastMessage(t('profile.failed_to_load'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Make firstName and lastName optional for profile updates
    // Users can clear these fields if they want to remove the information
    if (formData.firstName && formData.firstName.trim() && formData.firstName.trim().length < 2) {
      errors.firstName = t('profile.first_name_validation');
    }

    if (formData.lastName && formData.lastName.trim() && formData.lastName.trim().length < 2) {
      errors.lastName = t('profile.last_name_validation');
    }

    if (formData.age) {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        errors.age = t('profile.age_validation');
      }
    }

    if (formData.phoneNumber) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
        errors.phoneNumber = t('profile.phone_validation', { phone: config.SUPPORT_PHONE });
      }
    }
    
    // Phone number is required for local users
    if (userData && userData.authProvider === 'local' && (!formData.phoneNumber || !formData.phoneNumber.trim())) {
      errors.phoneNumber = t('profile.phone_required');
    }

    if (formData.address && formData.address.length < 5) {
      errors.address = t('profile.address_validation');
    }

    if (formData.country && formData.country.length < 2) {
      errors.country = t('profile.country_validation');
    }

    if (formData.city && formData.city.length < 2) {
      errors.city = t('profile.city_validation');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadProfilePicture = async (file: File) => {
    console.log('🔧 [ProfilePage] Starting immediate profile picture upload');
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ [ProfilePage] No token found');
        showToastMessage(t('profile.failed_to_update'), 'error');
        return;
      }

      // Prepare form data for profile picture upload only
      const formDataToSend = new FormData();
      formDataToSend.append('profilePhoto', file);

      console.log('🔧 [ProfilePage] Sending profile picture upload request to dedicated endpoint');
      const response = await fetch(buildApiUrl('/api/users/me/photo'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      console.log('🔧 [ProfilePage] Profile picture upload response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [ProfilePage] Profile picture upload successful:', result);
        setUserData(result.data);
        setProfileImageFile(null);
        setImagePreview(null);
        showToastMessage(t('profile.updated_successfully'), 'success');
        
        // Fetch the new signed URL for the uploaded image
        if (result.data.profilePhotoKey) {
          console.log('🔧 [ProfilePage] Fetching new profile photo URL');
          try {
            const photoResponse = await fetch(buildApiUrl('/api/users/me/photo'), {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (photoResponse.ok) {
              const photoResult = await photoResponse.json();
              console.log('✅ [ProfilePage] New profile photo URL fetched:', photoResult.data.photoUrl);
              setProfileImageUrl(photoResult.data.photoUrl);
            } else {
              console.log('❌ [ProfilePage] Failed to fetch new profile photo URL:', photoResponse.status);
              // Fallback to preview if signed URL fetch fails
              setProfileImageUrl(imagePreview);
            }
          } catch (photoError) {
            console.error('❌ [ProfilePage] Error fetching new profile photo URL:', photoError);
            // Fallback to preview if signed URL fetch fails
            setProfileImageUrl(imagePreview);
          }
        }
      } else {
        const error = await response.json();
        console.log('❌ [ProfilePage] Profile picture upload failed:', error);
        showToastMessage(error.message || t('profile.failed_to_update'), 'error');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showToastMessage(t('profile.failed_to_update'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('🔧 [ProfilePage] Image upload triggered:', { file });
    
    if (file) {
      console.log('🔧 [ProfilePage] File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.log('❌ [ProfilePage] Invalid file type:', file.type);
        showToastMessage(t('profile.invalid_image_file'), 'error');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        console.log('❌ [ProfilePage] File too large:', file.size);
        showToastMessage(t('profile.image_size_limit'), 'error');
        return;
      }

      console.log('✅ [ProfilePage] File validation passed, starting immediate upload');
      
      // Create preview first
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('✅ [ProfilePage] Preview created');
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Start upload immediately
      uploadProfilePicture(file);
      
      // Clear the file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      console.log('❌ [ProfilePage] No file selected');
    }
  };

  const handleSave = async () => {
    console.log('🔧 [ProfilePage] Save triggered');
    console.log('🔧 [ProfilePage] Form data:', formData);
    
    if (!validateForm()) {
      console.log('❌ [ProfilePage] Form validation failed');
      showToastMessage(t('profile.fix_validation_errors'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ [ProfilePage] No token found');
        return;
      }

      console.log('🔧 [ProfilePage] Preparing form data for profile update (no image upload)');
      // Prepare form data for profile update (no image upload since it's handled immediately)
      const formDataToSend = new FormData();
      
      // Send all fields, including empty ones, so backend can handle clearing fields
      formDataToSend.append('firstName', formData.firstName || '');
      formDataToSend.append('lastName', formData.lastName || '');
      formDataToSend.append('age', formData.age || '');
      formDataToSend.append('sex', formData.sex || '');
      formDataToSend.append('address', formData.address || '');
      formDataToSend.append('phoneNumber', formData.phoneNumber || '');
      formDataToSend.append('country', formData.country || '');
      formDataToSend.append('city', formData.city || '');
      
      console.log('🔧 [ProfilePage] Profile picture uploads are handled immediately, skipping image upload in save');

      console.log('🔧 [ProfilePage] Sending API request to update profile');
      const response = await fetch(buildApiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      console.log('🔧 [ProfilePage] API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [ProfilePage] Profile update successful:', result);
        setUserData(result.data);
        setIsEditing(false);
        showToastMessage(t('profile.updated_successfully'), 'success');
      } else {
        const error = await response.json();
        console.log('❌ [ProfilePage] Profile update failed:', error);
        showToastMessage(error.message || t('profile.failed_to_update'), 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToastMessage(t('profile.failed_to_update'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    // Password validation
    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      const errorMessages = passwordValidation.errors.map(err => t(`auth.${err}`));
      showToastMessage(t('profile.password_requirements_error', 'Password does not meet requirements:\n') + errorMessages.join('\n'), 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToastMessage(t('profile.passwords_do_not_match'), 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl('/api/auth/change-password'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        showToastMessage(t('profile.password_changed_successfully'), 'success');
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.json();
        showToastMessage(error.message || t('profile.failed_to_change_password'), 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showToastMessage(t('profile.failed_to_change_password'), 'error');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfileImageFile(null);
    setImagePreview(null);
    setValidationErrors({});
    
    // Reset form data to original values
    if (userData) {
      const nameParts = userData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        firstName,
        lastName,
        age: userData.age?.toString() || '',
        sex: userData.sex || '',
        address: userData.address || '',
        phoneNumber: userData.phoneNumber || '',
        country: userData.country || '',
        city: userData.city || ''
      });
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 xxs:h-16 xxs:w-16 border-4 border-cyan-500 border-t-transparent mx-auto mb-4 xxs:mb-6"></div>
          <p className="text-gray-300 text-base xxs:text-lg font-medium">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center max-w-md mx-auto p-4 xxs:p-8">
          <div className="text-red-400 mb-4 xxs:mb-6">
            <User className="h-16 w-16 xxs:h-20 xxs:w-20 mx-auto" />
          </div>
          <h2 className="text-xl xxs:text-2xl font-bold text-white mb-3 xxs:mb-4">{t('profile.user_not_found')}</h2>
          <p className="text-gray-300 mb-6 xxs:mb-8 text-sm xxs:text-base">{t('profile.please_login')}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 xxs:px-8 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-sm xxs:text-base"
          >
            {t('profile.go_to_login')}
          </button>
        </div>
      </div>
    );
  }

  const currentImageUrl = imagePreview || profileImageUrl;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-12 tiny:pt-16">
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-12 tiny:top-16 xxs:top-20 right-2 tiny:right-2 xxs:right-3 sm:right-4 z-50 p-2 tiny:p-2.5 xxs:p-3 sm:p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
          toastType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-1.5 tiny:space-x-2">
            {toastType === 'success' ? (
              <CheckCircle className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
            )}
            <span className="text-[10px] tiny:text-xs xxs:text-sm sm:text-base">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Minimal Header */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-blue-200 dark:border-gray-700/50">
        <div className="max-w-[1600px] mx-auto px-2 tiny:px-3 xxs:px-4 sm:px-6 lg:px-8 pt-8 tiny:pt-10 xxs:pt-12 sm:pt-14 pb-3 tiny:pb-4 xxs:pb-5 sm:pb-6">
          <h1 className="text-lg tiny:text-xl xxs:text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            {t('profile.title')}
          </h1>
        </div>
      </div>

      {/* Radical New Layout - Split Screen with Sidebar */}
      <div className="max-w-[1600px] mx-auto px-2 tiny:px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 tiny:py-6 xxs:py-8 sm:py-12">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 tiny:gap-6 xxs:gap-8">
          {/* Left Sidebar - Profile Card (Sticky) */}
          <div className="xl:col-span-4 xl:sticky xl:top-24 xl:self-start">
            <div 
              className={`bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700/50 transition-all duration-500 overflow-hidden transform ${
                isCardHovered ? 'scale-[1.02] shadow-cyan-500/20 border-cyan-500/30 dark:border-cyan-500/30' : 'hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600/50'
              }`}
              onMouseEnter={() => setIsCardHovered(true)}
              onMouseLeave={() => setIsCardHovered(false)}
            >
              {/* Profile Header with Gradient */}
              <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 p-4 tiny:p-6 xxs:p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-transparent to-purple-500/20"></div>
                <div className="relative z-10 text-center">
                  {/* Profile Image */}
                  <div className="relative inline-block mb-3 tiny:mb-4 xxs:mb-6">
                    <div className="h-20 w-20 tiny:h-24 tiny:w-24 xxs:h-28 xxs:w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 rounded-full overflow-hidden bg-white/20 ring-2 tiny:ring-4 ring-white/30 transition-all duration-300 hover:ring-white/50 mx-auto">
                      {currentImageUrl ? (
                        <img
                          src={currentImageUrl}
                          alt={userData.name}
                          className="h-full w-full object-cover"
                          onError={() => setProfileImageUrl(null)}
                        />
                      ) : (
                        <User className="h-full w-full text-white/80 p-6 xxs:p-8" />
                      )}
                    </div>
                    
                    {/* Image upload button */}
                    <button 
                      onClick={() => !isSaving && fileInputRef.current?.click()}
                      disabled={isSaving}
                      className={`absolute bottom-0 right-0 p-1.5 tiny:p-2 xxs:p-2.5 sm:p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 ${
                        isSaving 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-cyan-600 hover:bg-gray-100'
                      }`}
                      title={isSaving ? t('profile.saving') : t('profile.upload_new_photo')}
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-3 w-3 tiny:h-3.5 tiny:w-3.5 xxs:h-4 xxs:w-4 sm:h-5 sm:w-5 border-2 border-gray-500 border-t-transparent"></div>
                      ) : (
                        <Camera className="h-3 w-3 tiny:h-3.5 tiny:w-3.5 xxs:h-4 xxs:w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                    
                    {/* Remove image button */}
                    {currentImageUrl && (
                      <button 
                        onClick={async () => {
                          if (isSaving) return;
                          try {
                            const token = localStorage.getItem('token');
                            if (!token) return;
                            const response = await fetch(buildApiUrl('/api/users/me/photo'), {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (response.ok) {
                              setProfileImageFile(null);
                              setImagePreview(null);
                              setProfileImageUrl(null);
                              showToastMessage(t('profile.photo_removed_successfully'), 'success');
                            } else {
                              const error = await response.json();
                              showToastMessage(error.message || t('profile.failed_to_remove_photo'), 'error');
                            }
                          } catch (error) {
                            console.error('Error removing profile photo:', error);
                            showToastMessage(t('profile.failed_to_remove_photo'), 'error');
                          }
                        }}
                        disabled={isSaving}
                        className={`absolute bottom-0 left-0 p-1.5 tiny:p-2 xxs:p-2.5 sm:p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 ${
                          isSaving 
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                        title={isSaving ? t('profile.saving') : t('profile.remove_photo')}
                      >
                        <Trash2 className="h-3 w-3 tiny:h-3.5 tiny:w-3.5 xxs:h-4 xxs:w-4 sm:h-5 sm:w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <h2 className="text-base tiny:text-lg xxs:text-xl sm:text-2xl md:text-3xl font-bold mb-1.5 tiny:mb-2">{userData.name}</h2>
                  <p className="text-cyan-100 mb-3 tiny:mb-4 xxs:mb-6 text-xs tiny:text-sm xxs:text-base">{userData.email}</p>
                </div>
              </div>
              
              {/* Profile Stats */}
              <div className="p-3 tiny:p-4 xxs:p-5 sm:p-6 space-y-3 tiny:space-y-4">
                <div className="flex items-center justify-between p-2.5 tiny:p-3 xxs:p-4 bg-gray-100 dark:bg-gray-900/50 rounded-xl tiny:rounded-2xl border border-gray-200 dark:border-gray-700/50">
                  <div className="flex items-center space-x-2 tiny:space-x-3">
                    <Calendar className="h-4 w-4 tiny:h-5 tiny:w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 text-xs tiny:text-sm">{t('profile.member_since')}</span>
                  </div>
                  <span className="text-gray-900 dark:text-white font-semibold text-xs tiny:text-sm">
                    {new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2.5 tiny:p-3 xxs:p-4 bg-gray-100 dark:bg-gray-900/50 rounded-xl tiny:rounded-2xl border border-gray-200 dark:border-gray-700/50">
                  <div className="flex items-center space-x-2 tiny:space-x-3">
                    <Shield className="h-4 w-4 tiny:h-5 tiny:w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 text-xs tiny:text-sm">{t('profile.verification_status', 'Status')}</span>
                  </div>
                  <span className="flex items-center space-x-1 tiny:space-x-1.5">
                    {userData.isVerified ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-green-600 dark:text-green-400 font-semibold text-xs tiny:text-sm">{t('profile.verified_account')}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold text-xs tiny:text-sm">{t('profile.unverified_account')}</span>
                      </>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-2.5 tiny:p-3 xxs:p-4 bg-gray-100 dark:bg-gray-900/50 rounded-xl tiny:rounded-2xl border border-gray-200 dark:border-gray-700/50">
                  <div className="flex items-center space-x-2 tiny:space-x-3">
                    <User className="h-4 w-4 tiny:h-5 tiny:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 text-xs tiny:text-sm">{t('profile.account_type_label', 'Account Type')}</span>
                  </div>
                  <span className="text-gray-900 dark:text-white font-semibold text-xs tiny:text-sm">
                    {userData.authProvider === 'google' ? t('profile.google_account') : t('profile.email_account')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Area - Forms */}
          <div className="xl:col-span-8 space-y-4 tiny:space-y-6 xxs:space-y-8">
            {/* Personal Information */}
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-2xl tiny:rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 px-3 tiny:px-4 xxs:px-5 sm:px-6 lg:px-8 xl:px-10 py-3 tiny:py-4 xxs:py-5 sm:py-6 md:py-7 border-b border-blue-200 dark:border-gray-700/50">
                <h3 className="text-base tiny:text-lg xxs:text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-white flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 mb-1.5 tiny:mb-2">
                  <div className="p-1.5 tiny:p-2 xxs:p-2.5 sm:p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl tiny:rounded-2xl shadow-lg flex-shrink-0">
                    <User className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <span className="break-words">{t('profile.personal_information')}</span>
                </h3>
                <p className="text-blue-700 dark:text-gray-400 text-[10px] tiny:text-xs xxs:text-sm sm:text-base md:text-lg ml-10 tiny:ml-12 xxs:ml-14 sm:ml-16 md:ml-18">{t('profile.update_personal_details')}</p>
              </div>
              
              <div className="p-3 tiny:p-4 xxs:p-5 sm:p-6 lg:p-8 xl:p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 tiny:gap-3 xxs:gap-4 sm:gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.first_name')} *
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleFieldChange('firstName', e.target.value)}
                          onFocus={() => setActiveField('firstName')}
                          onBlur={() => setActiveField(null)}
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 placeholder-blue-400 dark:placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'firstName' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.firstName 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_first_name')}
                        />
                        {validationErrors.firstName && (
                          <p className="text-red-500 dark:text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.firstName}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-blue-300 dark:border-gray-700/40">
                        <User className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.firstName || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Last Name */}
                <div>
                  <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.last_name')} *
                  </label>
                  {isEditing ? (
                      <div className="relative">
                    <input
                      type="text"
                          value={formData.lastName}
                          onChange={(e) => handleFieldChange('lastName', e.target.value)}
                          onFocus={() => setActiveField('lastName')}
                          onBlur={() => setActiveField(null)}
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'lastName' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.lastName 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_last_name')}
                        />
                        {validationErrors.lastName && (
                          <p className="text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.lastName}</p>
                        )}
                      </div>
                  ) : (
                    <div className="flex items-center space-x-2 tiny:space-x-3 px-3 tiny:px-4 py-2 tiny:py-2.5 xxs:py-3 bg-white dark:bg-gray-900/50 rounded-xl border border-blue-200 dark:border-gray-700/50">
                      <User className="h-4 w-4 tiny:h-5 tiny:w-5 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.lastName || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.age')}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.age}
                          onChange={(e) => handleFieldChange('age', e.target.value)}
                          onFocus={() => setActiveField('age')}
                          onBlur={() => setActiveField(null)}
                          min="1"
                          max="120"
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'age' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.age 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_age')}
                        />
                        {validationErrors.age && (
                          <p className="text-red-500 dark:text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.age}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-gray-700/40">
                        <Calendar className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.age || t('profile.not_set')}</span>
                      </div>
                  )}
                </div>

                  {/* Sex */}
                <div>
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.sex')}
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.sex}
                        onChange={(e) => handleFieldChange('sex', e.target.value)}
                        onFocus={() => setActiveField('sex')}
                        onBlur={() => setActiveField(null)}
                        className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 ${
                          activeField === 'sex' 
                            ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                            : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                        }`}
                      >
                        <option value="">{t('profile.select_sex')}</option>
                        <option value="male">{t('profile.male')}</option>
                        <option value="female">{t('profile.female')}</option>
                        <option value="other">{t('profile.other')}</option>
                        <option value="prefer-not-to-say">{t('profile.prefer_not_to_say')}</option>
                      </select>
                    ) : (
                      <div className="flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-gray-700/40">
                        <UserCheck className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium capitalize text-xs tiny:text-sm xxs:text-base">{formData.sex || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="sm:col-span-2">
                        <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                    {t('profile.email_address')}
                  </label>
                  <div className="flex flex-col tiny:flex-row items-stretch tiny:items-center gap-2 tiny:gap-2.5 xxs:gap-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-gray-700/40">
                    <div className="flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 flex-1 min-w-0">
                      <Mail className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                      <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base truncate">{userData.email}</span>
                    </div>
                    <span className="text-[10px] tiny:text-xs xxs:text-sm bg-cyan-500/20 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 px-2 tiny:px-2.5 xxs:px-3 py-1 tiny:py-1.5 rounded-md tiny:rounded-lg border border-cyan-500/30 flex-shrink-0 text-center whitespace-nowrap">
                      {t('profile.not_editable')}
                    </span>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-2xl tiny:rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 px-3 tiny:px-4 xxs:px-5 sm:px-6 lg:px-8 xl:px-10 py-3 tiny:py-4 xxs:py-5 sm:py-6 md:py-7 border-b border-blue-200 dark:border-gray-700/50">
                <h3 className="text-base tiny:text-lg xxs:text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-white flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 mb-1.5 tiny:mb-2">
                  <div className="p-1.5 tiny:p-2 xxs:p-2.5 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl tiny:rounded-2xl shadow-lg flex-shrink-0">
                    <Phone className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <span className="break-words">{t('profile.contact_information')}</span>
                </h3>
                <p className="text-blue-700 dark:text-gray-400 text-[10px] tiny:text-xs xxs:text-sm sm:text-base md:text-lg ml-10 tiny:ml-12 xxs:ml-14 sm:ml-16 md:ml-18">{t('profile.update_contact_details')}</p>
              </div>
              
              <div className="p-3 tiny:p-4 xxs:p-5 sm:p-6 lg:p-8 xl:p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 tiny:gap-3 xxs:gap-4 sm:gap-5 md:gap-6">
                  {/* Phone Number */}
                  <div>
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.phone_number')}{userData && userData.authProvider === 'local' && <span className="text-red-400 ml-0.5 tiny:ml-1">*</span>}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                          onFocus={() => setActiveField('phoneNumber')}
                          onBlur={() => setActiveField(null)}
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'phoneNumber' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.phoneNumber 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_phone_number')}
                        />
                        {validationErrors.phoneNumber && (
                          <p className="text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.phoneNumber}</p>
                        )}
                        {!validationErrors.phoneNumber && (
                          <p className="text-[10px] tiny:text-xs text-blue-600 dark:text-gray-400 mt-1">
                            {userData && userData.authProvider === 'local' 
                              ? t('profile.phone_required_help', { phone: config.SUPPORT_PHONE })
                              : t('profile.phone_format_help', { phone: config.SUPPORT_PHONE })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-gray-700/40">
                        <Phone className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.phoneNumber || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.address')}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <textarea
                          value={formData.address}
                          onChange={(e) => handleFieldChange('address', e.target.value)}
                          onFocus={() => setActiveField('address')}
                          onBlur={() => setActiveField(null)}
                          rows={3}
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 resize-none placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'address' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.address 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_address')}
                        />
                        {validationErrors.address && (
                          <p className="text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.address}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start space-x-2 tiny:space-x-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-gray-700/40">
                        <MapPin className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 mt-0.5 tiny:mt-1 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.address || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.country')}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) => handleFieldChange('country', e.target.value)}
                          onFocus={() => setActiveField('country')}
                          onBlur={() => setActiveField(null)}
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'country' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.country 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_country')}
                        />
                        {validationErrors.country && (
                          <p className="text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.country}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 bg-white dark:bg-gray-900/60 rounded-xl tiny:rounded-2xl border-2 border-blue-200 dark:border-gray-700/40">
                        <Globe className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.country || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                      {t('profile.city')}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleFieldChange('city', e.target.value)}
                          onFocus={() => setActiveField('city')}
                          onBlur={() => setActiveField(null)}
                          className={`w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 text-xs tiny:text-sm xxs:text-base bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 rounded-xl tiny:rounded-2xl transition-all duration-200 placeholder-blue-400 dark:placeholder-gray-500 ${
                            activeField === 'city' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/30' 
                              : validationErrors.city 
                                ? 'border-red-500' 
                                : 'border-blue-300 dark:border-gray-700/40 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30'
                          }`}
                          placeholder={t('profile.enter_city')}
                        />
                        {validationErrors.city && (
                          <p className="text-red-500 dark:text-red-400 text-[10px] tiny:text-xs xxs:text-sm mt-1">{validationErrors.city}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 tiny:space-x-3 px-3 tiny:px-4 py-2 tiny:py-2.5 xxs:py-3 bg-white dark:bg-gray-900/50 rounded-xl border border-blue-200 dark:border-gray-700/50">
                        <MapPin className="h-4 w-4 tiny:h-5 tiny:w-5 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
                        <span className="text-blue-800 dark:text-gray-300 font-medium text-xs tiny:text-sm xxs:text-base">{formData.city || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col tiny:flex-row space-y-2.5 tiny:space-y-3 xxs:space-y-0 tiny:space-x-2.5 xxs:space-x-3 sm:space-x-4 pt-4 tiny:pt-5 xxs:pt-6 sm:pt-8">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center space-x-1.5 tiny:space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 rounded-xl tiny:rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 disabled:transform-none text-xs tiny:text-sm xxs:text-base"
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Save className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
                        )}
                        <span>{isSaving ? t('profile.saving') : t('profile.save_changes')}</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center justify-center space-x-1.5 tiny:space-x-2 border-2 border-blue-300 dark:border-gray-600/50 text-blue-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 disabled:opacity-50 px-3 tiny:px-4 xxs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 rounded-xl tiny:rounded-2xl font-semibold transition-all duration-200 text-xs tiny:text-sm xxs:text-base"
                      >
                        <X className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
                        <span>{t('profile.cancel')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center space-x-1.5 tiny:space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 rounded-lg tiny:rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl text-xs tiny:text-sm xxs:text-base border border-blue-400 dark:border-gray-600/50"
                    >
                      <Edit3 className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
                      <span>{t('profile.edit_profile')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          
          {/* Password Change Section */}
          <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-2xl tiny:rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 px-3 tiny:px-4 xxs:px-5 sm:px-6 lg:px-8 xl:px-10 py-3 tiny:py-4 xxs:py-5 sm:py-6 md:py-7 border-b border-blue-200 dark:border-gray-700/50">
                <h3 className="text-base tiny:text-lg xxs:text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-white flex items-center space-x-2 tiny:space-x-3 xxs:space-x-4 mb-1.5 tiny:mb-2">
                  <div className="p-1.5 tiny:p-2 xxs:p-2.5 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl tiny:rounded-2xl shadow-lg flex-shrink-0">
                    <Shield className="h-4 w-4 tiny:h-5 tiny:w-5 xxs:h-6 xxs:w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <span className="break-words">{t('profile.security_settings')}</span>
                </h3>
                <p className="text-blue-700 dark:text-gray-400 text-[10px] tiny:text-xs xxs:text-sm sm:text-base md:text-lg ml-10 tiny:ml-12 xxs:ml-14 sm:ml-16 md:ml-18">{t('profile.change_password_description')}</p>
              </div>
              
              <div className="p-3 tiny:p-4 xxs:p-5 sm:p-6 lg:p-8 xl:p-10">
                {!showPasswordChange ? (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 rounded-xl tiny:rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-xs tiny:text-sm xxs:text-base"
                  >
                    {t('profile.change_password')}
                  </button>
                ) : (
                  <div className="space-y-3 tiny:space-y-4 xxs:space-y-5 sm:space-y-6">
                                          <div>
                        <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                          {t('profile.current_password')}
                        </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 pr-10 tiny:pr-12 bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 border-blue-300 dark:border-gray-700/40 rounded-xl tiny:rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all duration-200 text-xs tiny:text-sm xxs:text-base placeholder-blue-400 dark:placeholder-gray-500"
                          placeholder={t('profile.enter_current_password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-2.5 tiny:right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-gray-300 transition-colors duration-200"
                        >
                          {showPasswords.current ? <EyeOff className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" /> : <Eye className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                        {t('profile.new_password')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => {
                            setPasswordData({ ...passwordData, newPassword: e.target.value });
                            const validation = validatePassword(e.target.value);
                            setPasswordValidation(validation);
                          }}
                          className="w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 pr-10 tiny:pr-12 bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 border-blue-300 dark:border-gray-700/40 rounded-xl tiny:rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all duration-200 text-xs tiny:text-sm xxs:text-base placeholder-blue-400 dark:placeholder-gray-500"
                          placeholder={t('profile.enter_new_password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-2.5 tiny:right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-gray-300 transition-colors duration-200"
                        >
                          {showPasswords.new ? <EyeOff className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" /> : <Eye className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />}
                        </button>
                      </div>
                      
                      {/* Password Requirements Info */}
                      {passwordData.newPassword && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[9px] tiny:text-[10px] xxs:text-xs font-medium text-blue-700 dark:text-gray-400">
                            {t('password_requirements.title', 'Password must contain:')}
                          </p>
                          <ul className="space-y-1 text-[9px] tiny:text-[10px] xxs:text-xs text-blue-600 dark:text-gray-500">
                            <li className={`flex items-center gap-1.5 ${
                              passwordData.newPassword.length >= 8 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-blue-600 dark:text-gray-500'
                            }`}>
                              {passwordData.newPassword.length >= 8 ? (
                                <Check className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              ) : (
                                <X className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              )}
                              {t('password_requirements.min_length', 'At least 8 characters')}
                            </li>
                            <li className={`flex items-center gap-1.5 ${
                              /[a-zA-Z]/.test(passwordData.newPassword)
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-blue-600 dark:text-gray-500'
                            }`}>
                              {/[a-zA-Z]/.test(passwordData.newPassword) ? (
                                <Check className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              ) : (
                                <X className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              )}
                              {t('password_requirements.requires_letter', 'At least one letter (a-z, A-Z)')}
                            </li>
                            <li className={`flex items-center gap-1.5 ${
                              /[0-9]/.test(passwordData.newPassword)
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-blue-600 dark:text-gray-500'
                            }`}>
                              {/[0-9]/.test(passwordData.newPassword) ? (
                                <Check className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              ) : (
                                <X className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              )}
                              {t('password_requirements.requires_number', 'At least one number (0-9)')}
                            </li>
                            <li className={`flex items-center gap-1.5 ${
                              /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(passwordData.newPassword)
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-blue-600 dark:text-gray-500'
                            }`}>
                              {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(passwordData.newPassword) ? (
                                <Check className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              ) : (
                                <X className="h-3 w-3 tiny:h-3.5 tiny:w-3.5" />
                              )}
                              {t('password_requirements.requires_symbol', 'At least one symbol (!@#$%^&*)')}
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] tiny:text-xs xxs:text-sm font-semibold text-blue-800 dark:text-gray-300 mb-1.5 tiny:mb-2 xxs:mb-3">
                        {t('profile.confirm_new_password')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-3 tiny:px-4 xxs:px-5 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 pr-10 tiny:pr-12 bg-white dark:bg-gray-900/60 text-blue-900 dark:text-white border-2 border-blue-300 dark:border-gray-700/40 rounded-xl tiny:rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all duration-200 text-xs tiny:text-sm xxs:text-base placeholder-blue-400 dark:placeholder-gray-500"
                          placeholder={t('profile.confirm_new_password_placeholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-2.5 tiny:right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-gray-300 transition-colors duration-200"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" /> : <Eye className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col tiny:flex-row space-y-2.5 tiny:space-y-3 xxs:space-y-0 tiny:space-x-2.5 xxs:space-x-3 sm:space-x-4 pt-4 tiny:pt-5 xxs:pt-6 sm:pt-8">
                      <button
                        onClick={handlePasswordChange}
                        className="flex items-center justify-center space-x-1.5 tiny:space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 tiny:px-4 xxs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 rounded-lg tiny:rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-xs tiny:text-sm xxs:text-base"
                      >
                        <Save className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
                        <span>{t('profile.update_password')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setPasswordValidation(null);
                        }}
                        className="flex items-center justify-center space-x-1.5 tiny:space-x-2 border-2 border-blue-300 dark:border-gray-600/50 text-blue-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700/50 hover:border-blue-400 dark:hover:border-gray-500 px-3 tiny:px-4 xxs:px-5 sm:px-6 md:px-8 py-2 tiny:py-2.5 xxs:py-3 sm:py-3.5 rounded-xl tiny:rounded-2xl font-semibold transition-all duration-200 text-xs tiny:text-sm xxs:text-base"
                      >
                        <X className="h-3.5 w-3.5 tiny:h-4 tiny:w-4 xxs:h-5 xxs:w-5" />
                        <span>{t('profile.cancel')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePage; 