import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../config/environment';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  User, Mail, Calendar, Shield, Camera, Save, ArrowLeft, Edit3, X, 
  CheckCircle, AlertCircle, Eye, EyeOff, Phone, MapPin, Globe, 
  UserCheck, Trash2
} from 'lucide-react';
import { config } from '../config/environment';

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
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToastMessage(t('profile.passwords_do_not_match'), 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToastMessage(t('profile.password_length_validation'), 'error');
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
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-16 xxs:top-20 right-2 xxs:right-3 sm:right-4 z-50 p-2 xxs:p-3 sm:p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
          toastType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {toastType === 'success' ? (
              <CheckCircle className="h-4 w-4 xxs:h-5 xxs:w-5" />
            ) : (
              <AlertCircle className="h-4 w-4 xxs:h-5 xxs:w-5" />
            )}
            <span className="text-xs xxs:text-sm sm:text-base">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-3 xxs:py-4 sm:py-6">
          <div className="flex items-center space-x-2 xxs:space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-1 xxs:space-x-2 text-gray-300 hover:text-white transition-all duration-200 hover:bg-gray-700 px-2 xxs:px-3 py-2 rounded-lg text-sm xxs:text-base"
            >
              <ArrowLeft className="h-4 w-4 xxs:h-5 xxs:w-5" />
              <span className="font-medium">{t('profile.back_to_dashboard')}</span>
            </button>
          </div>
          <h1 className="text-xl xxs:text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mt-3 xxs:mt-4 sm:mt-6 mb-2 pb-1 sm:pb-2 md:pb-3">{t('profile.title')}</h1>
          <p className="text-gray-300 text-sm xxs:text-base sm:text-lg">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-6 xxs:py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xxs:gap-6 lg:gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div 
              className={`bg-white rounded-2xl shadow-lg transition-all duration-500 overflow-hidden transform ${
                isCardHovered ? 'scale-105 rotate-1 shadow-2xl' : 'hover:shadow-xl'
              }`}
              onMouseEnter={() => setIsCardHovered(true)}
              onMouseLeave={() => setIsCardHovered(false)}
            >
              <div className="bg-gradient-to-r from-red-600 to-red-700 p-3 xxs:p-4 sm:p-6 lg:p-8 text-white text-center">
                <div className="relative inline-block">
                  <div className="h-24 w-24 xxs:h-28 xxs:w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden bg-white/20 mx-auto mb-4 xxs:mb-6 ring-4 ring-white/30 transition-all duration-300 hover:ring-white/50">
                    {currentImageUrl ? (
                      <img
                        src={currentImageUrl}
                        alt={userData.name}
                        className="h-full w-full object-cover"
                        onError={() => setProfileImageUrl(null)}
                      />
                    ) : (
                      <User className="h-full w-full text-white/80 p-4 xxs:p-6 sm:p-8" />
                    )}
                  </div>
                  
                  {/* Image upload button */}
                  <button 
                    onClick={() => !isSaving && fileInputRef.current?.click()}
                    disabled={isSaving}
                    className={`absolute bottom-4 xxs:bottom-6 right-0 p-2 xxs:p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 ${
                      isSaving 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-white text-cyan-600 hover:bg-gray-100'
                    }`}
                    title={isSaving ? t('profile.saving') : t('profile.upload_new_photo')}
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 xxs:h-5 xxs:w-5 border-2 border-gray-500 border-t-transparent"></div>
                    ) : (
                      <Camera className="h-4 w-4 xxs:h-5 xxs:w-5" />
                    )}
                  </button>
                  
                  {/* Remove image button */}
                  {currentImageUrl && (
                    <button 
                      onClick={async () => {
                        if (isSaving) return; // Prevent deletion during upload
                        
                        try {
                          const token = localStorage.getItem('token');
                          if (!token) return;

                          const response = await fetch(buildApiUrl('/api/users/me/photo'), {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
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
                      className={`absolute bottom-4 xxs:bottom-6 left-0 p-2 xxs:p-3 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 ${
                        isSaving 
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                          : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                      title={isSaving ? t('profile.saving') : t('profile.remove_photo')}
                    >
                      <Trash2 className="h-4 w-4 xxs:h-5 xxs:w-5" />
                    </button>
                  )}
                </div>
                
                <h2 className="text-lg xxs:text-xl sm:text-2xl font-bold mb-2">{userData.name}</h2>
                <p className="text-red-100 mb-3 xxs:mb-4 sm:mb-6 text-xs xxs:text-sm sm:text-base">{userData.email}</p>
                
                                  <div className="space-y-2 xxs:space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-center space-x-2 xxs:space-x-3 text-xs xxs:text-sm">
                      <Calendar className="h-3 w-3 xxs:h-4 xxs:w-4" />
                      <span>{t('profile.member_since')} {new Date(userData.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}</span>
                    </div>
                  <div className="flex items-center justify-center space-x-2 xxs:space-x-3 text-xs xxs:text-sm">
                    <Shield className="h-3 w-3 xxs:h-4 xxs:w-4" />
                    <span className="flex items-center space-x-1 xxs:space-x-2">
                      {userData.isVerified ? (
                        <>
                          <CheckCircle className="h-3 w-3 xxs:h-4 xxs:w-4 text-green-300" />
                          <span>{t('profile.verified_account')}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 xxs:h-4 xxs:w-4 text-yellow-300" />
                          <span>{t('profile.unverified_account')}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 xxs:space-x-3 text-xs xxs:text-sm">
                    <User className="h-3 w-3 xxs:h-4 xxs:w-4" />
                    <span>{userData.authProvider === 'google' ? t('profile.google_account') : t('profile.email_account')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Forms */}
          <div className="lg:col-span-2 space-y-4 xxs:space-y-6 sm:space-y-8">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 xxs:px-4 sm:px-6 lg:px-8 py-3 xxs:py-4 sm:py-6 border-b border-gray-200">
                <h3 className="text-base xxs:text-lg sm:text-xl font-bold text-gray-800 flex items-center space-x-2 xxs:space-x-3">
                  <User className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-red-600" />
                  <span>{t('profile.personal_information')}</span>
                </h3>
                <p className="text-gray-600 mt-1 xxs:mt-2 text-xs xxs:text-sm sm:text-base">{t('profile.update_personal_details')}</p>
              </div>
              
              <div className="p-3 xxs:p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xxs:gap-4 sm:gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-xs xxs:text-sm font-semibold text-gray-300 mb-2 xxs:mb-3">
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
                          className={`w-full px-3 xxs:px-4 py-2 xxs:py-3 text-sm xxs:text-base border rounded-xl transition-all duration-200 ${
                            activeField === 'firstName' 
                              ? 'border-red-500 ring-2 ring-red-500/20' 
                              : validationErrors.firstName 
                                ? 'border-red-500' 
                                : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          }`}
                          placeholder={t('profile.enter_first_name')}
                        />
                        {validationErrors.firstName && (
                          <p className="text-red-500 text-xs xxs:text-sm mt-1">{validationErrors.firstName}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 xxs:space-x-3 px-3 xxs:px-4 py-2 xxs:py-3 bg-gray-900 rounded-xl border border-gray-700">
                        <User className="h-4 w-4 xxs:h-5 xxs:w-5 text-gray-400" />
                        <span className="text-gray-300 font-medium text-sm xxs:text-base">{formData.firstName || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Last Name */}
                <div>
                  <label className="block text-xs xxs:text-sm font-semibold text-gray-700 mb-2 xxs:mb-3">
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
                          className={`w-full px-3 xxs:px-4 py-2 xxs:py-3 text-sm xxs:text-base border rounded-xl transition-all duration-200 ${
                            activeField === 'lastName' 
                              ? 'border-red-500 ring-2 ring-red-500/20' 
                              : validationErrors.lastName 
                                ? 'border-red-500' 
                                : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          }`}
                          placeholder={t('profile.enter_last_name')}
                        />
                        {validationErrors.lastName && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
                        )}
                      </div>
                  ) : (
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                      <User className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">{formData.lastName || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                            activeField === 'age' 
                              ? 'border-red-500 ring-2 ring-red-500/20' 
                              : validationErrors.age 
                                ? 'border-red-500' 
                                : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          }`}
                          placeholder={t('profile.enter_age')}
                        />
                        {validationErrors.age && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.age}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">{formData.age || t('profile.not_set')}</span>
                    </div>
                  )}
                </div>

                  {/* Sex */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      {t('profile.sex')}
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.sex}
                        onChange={(e) => handleFieldChange('sex', e.target.value)}
                        onFocus={() => setActiveField('sex')}
                        onBlur={() => setActiveField(null)}
                        className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                          activeField === 'sex' 
                            ? 'border-red-500 ring-2 ring-red-500/20' 
                            : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        }`}
                      >
                        <option value="">{t('profile.select_sex')}</option>
                        <option value="male">{t('profile.male')}</option>
                        <option value="female">{t('profile.female')}</option>
                        <option value="other">{t('profile.other')}</option>
                        <option value="prefer-not-to-say">{t('profile.prefer_not_to_say')}</option>
                      </select>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <UserCheck className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700 font-medium capitalize">{formData.sex || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {t('profile.email_address')}
                  </label>
                  <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <Mail className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-700 font-medium">{userData.email}</span>
                    <span className="ml-auto text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                      {t('profile.not_editable')}
                    </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 xxs:px-4 sm:px-6 lg:px-8 py-3 xxs:py-4 sm:py-6 border-b border-gray-200">
                <h3 className="text-base xxs:text-lg sm:text-xl font-bold text-gray-800 flex items-center space-x-2 xxs:space-x-3">
                  <Phone className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-red-600" />
                  <span>{t('profile.contact_information')}</span>
                </h3>
                <p className="text-gray-600 mt-1 xxs:mt-2 text-xs xxs:text-sm sm:text-base">{t('profile.update_contact_details')}</p>
              </div>
              
              <div className="p-3 xxs:p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xxs:gap-4 sm:gap-6">
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      {t('profile.phone_number')}{userData && userData.authProvider === 'local' && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                          onFocus={() => setActiveField('phoneNumber')}
                          onBlur={() => setActiveField(null)}
                          className={`w-full px-4 py-3 border bg-gray-900 text-white rounded-xl transition-all duration-200 placeholder-gray-400 ${
                            activeField === 'phoneNumber' 
                              ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
                              : validationErrors.phoneNumber 
                                ? 'border-red-500' 
                                : 'border-gray-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                          }`}
                          placeholder={t('profile.enter_phone_number')}
                        />
                        {validationErrors.phoneNumber && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
                        )}
                        {!validationErrors.phoneNumber && (
                          <p className="text-xs text-gray-500 mt-1">
                            {userData && userData.authProvider === 'local' 
                              ? t('profile.phone_required_help', { phone: config.SUPPORT_PHONE })
                              : t('profile.phone_format_help', { phone: config.SUPPORT_PHONE })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">{formData.phoneNumber || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 resize-none ${
                            activeField === 'address' 
                              ? 'border-red-500 ring-2 ring-red-500/20' 
                              : validationErrors.address 
                                ? 'border-red-500' 
                                : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          }`}
                          placeholder={t('profile.enter_address')}
                        />
                        {validationErrors.address && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                        <span className="text-gray-700 font-medium">{formData.address || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                            activeField === 'country' 
                              ? 'border-red-500 ring-2 ring-red-500/20' 
                              : validationErrors.country 
                                ? 'border-red-500' 
                                : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          }`}
                          placeholder={t('profile.enter_country')}
                        />
                        {validationErrors.country && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.country}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <Globe className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">{formData.country || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 ${
                            activeField === 'city' 
                              ? 'border-red-500 ring-2 ring-red-500/20' 
                              : validationErrors.city 
                                ? 'border-red-500' 
                                : 'border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                          }`}
                          placeholder={t('profile.enter_city')}
                        />
                        {validationErrors.city && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.city}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">{formData.city || t('profile.not_set')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col xxs:flex-row space-y-3 xxs:space-y-0 xxs:space-x-3 sm:space-x-4 pt-4 xxs:pt-6">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 xxs:px-4 sm:px-6 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:transform-none text-sm xxs:text-base"
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-4 w-4 xxs:h-5 xxs:w-5 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Save className="h-4 w-4 xxs:h-5 xxs:w-5" />
                        )}
                        <span>{isSaving ? t('profile.saving') : t('profile.save_changes')}</span>
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center justify-center space-x-2 border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 px-3 xxs:px-4 sm:px-6 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 text-sm xxs:text-base"
                      >
                        <X className="h-4 w-4 xxs:h-5 xxs:w-5" />
                        <span>{t('profile.cancel')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white px-3 xxs:px-4 sm:px-6 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg text-sm xxs:text-base"
                    >
                      <Edit3 className="h-4 w-4 xxs:h-5 xxs:w-5" />
                      <span>{t('profile.edit_profile')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Password Change */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 xxs:px-4 sm:px-6 lg:px-8 py-3 xxs:py-4 sm:py-6 border-b border-gray-200">
                <h3 className="text-base xxs:text-lg sm:text-xl font-bold text-gray-800 flex items-center space-x-2 xxs:space-x-3">
                  <Shield className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-red-600" />
                  <span>{t('profile.security_settings')}</span>
                </h3>
                <p className="text-gray-600 mt-1 xxs:mt-2 text-xs xxs:text-sm sm:text-base">{t('profile.change_password_description')}</p>
              </div>
              
              <div className="p-3 xxs:p-4 sm:p-6 lg:p-8">
                {!showPasswordChange ? (
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3 xxs:px-4 sm:px-6 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-sm xxs:text-base"
                  >
                    {t('profile.change_password')}
                  </button>
                ) : (
                  <div className="space-y-3 xxs:space-y-4 sm:space-y-6">
                                          <div>
                        <label className="block text-xs xxs:text-sm font-semibold text-gray-300 mb-2 xxs:mb-3">
                          {t('profile.current_password')}
                        </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="w-full px-3 xxs:px-4 py-2 xxs:py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm xxs:text-base"
                          placeholder={t('profile.enter_current_password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4 xxs:h-5 xxs:w-5" /> : <Eye className="h-4 w-4 xxs:h-5 xxs:w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 xxs:mb-3">
                        {t('profile.new_password')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          className="w-full px-3 xxs:px-4 py-2 xxs:py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm xxs:text-base"
                          placeholder={t('profile.enter_new_password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4 xxs:h-5 xxs:w-5" /> : <Eye className="h-4 w-4 xxs:h-5 xxs:w-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 xxs:mb-3">
                        {t('profile.confirm_new_password')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          className="w-full px-3 xxs:px-4 py-2 xxs:py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 text-sm xxs:text-base"
                          placeholder={t('profile.confirm_new_password_placeholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4 xxs:h-5 xxs:w-5" /> : <Eye className="h-4 w-4 xxs:h-5 xxs:w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col xxs:flex-row space-y-3 xxs:space-y-0 xxs:space-x-3 sm:space-x-4 pt-4 xxs:pt-6">
                      <button
                        onClick={handlePasswordChange}
                        className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 xxs:px-4 sm:px-6 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg text-sm xxs:text-base"
                      >
                        <Save className="h-4 w-4 xxs:h-5 xxs:w-5" />
                        <span>{t('profile.update_password')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 xxs:px-4 sm:px-6 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 text-sm xxs:text-base"
                      >
                        <X className="h-4 w-4 xxs:h-5 xxs:w-5" />
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