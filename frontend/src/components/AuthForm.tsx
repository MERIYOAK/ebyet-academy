import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Upload, X, Phone, Check, X as XIcon } from 'lucide-react';
import { buildApiUrl } from '../config/environment';
import { validatePassword } from '../utils/passwordValidation';

interface Field {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
}

interface AuthFormProps {
  title: string;
  subtitle?: string;
  fields: Field[];
  submitText: string;
  onSubmit: (data: Record<string, string | File>) => void;
  links?: Array<{
    text: string;
    linkText: string;
    href: string;
  }>;
  socialAuth?: boolean;
  message?: string;
  error?: string;
  loading?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({
  title,
  subtitle,
  fields,
  submitText,
  onSubmit,
  links = [],
  socialAuth = false,
  message,
  error,
  loading = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = React.useState<Record<string, string | File>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [passwordValidation, setPasswordValidation] = React.useState<ReturnType<typeof validatePassword> | null>(null);

  // Use external loading state if provided, otherwise use internal state
  const isLoadingState = loading !== undefined ? loading : isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (name: string, value: string | File) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate password in real-time if it's a password field
    if (name === 'password' && typeof value === 'string') {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    } else if (name === 'password' && !value) {
      setPasswordValidation(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleChange('profilePhoto', file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => {
      const newData = { ...prev };
      delete newData.profilePhoto;
      return newData;
    });
    setImagePreview(null);
  };

  const handleGoogleLogin = () => {
    window.location.href = buildApiUrl('/api/auth/google');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-gray-600 dark:text-gray-300">{subtitle}</p>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <label htmlFor={field.name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {field.label}
                </label>
                
                {field.type === 'file' ? (
                  <div className="space-y-3">
                    {/* File Input */}
                    <div className="relative">
                      <input
                        id={field.name}
                        name={field.name}
                        type="file"
                        accept="image/*"
                        required={field.required}
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor={field.name}
                        className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300">
                              {t('auth.upload.click_to_upload')}
                            </span>{' '}
                            {t('auth.upload.or_drag_drop')}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('auth.upload.file_types')}</p>
                        </div>
                      </label>
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="relative">
                        <div className="flex items-center justify-center w-32 h-32 mx-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={imagePreview}
                            alt={t('auth.upload.profile_preview')}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type === 'password' && !showPassword ? 'password' : 'text'}
                        required={field.required}
                        className={`appearance-none relative block w-full ${
                          field.type === 'tel' ? 'pl-12' : 'px-4'
                        } py-3 bg-gray-100 dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700/50 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-500 focus:border-cyan-500 dark:focus:border-cyan-500 focus:z-10 transition-all duration-200`}
                        placeholder={field.placeholder}
                        value={formData[field.name] as string || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                      />
                      {field.type === 'tel' && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      {field.type === 'password' && (
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Password Requirements Info */}
                    {field.type === 'password' && field.name === 'password' && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {t('password_requirements.title', 'Password must contain:')}
                        </p>
                        <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                          <li className={`flex items-center gap-1.5 ${
                            passwordValidation && (formData.password as string)?.length >= 8 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-500 dark:text-gray-500'
                          }`}>
                            {passwordValidation && (formData.password as string)?.length >= 8 ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <XIcon className="h-3.5 w-3.5" />
                            )}
                            {t('password_requirements.min_length', 'At least 8 characters')}
                          </li>
                          <li className={`flex items-center gap-1.5 ${
                            passwordValidation && /[a-zA-Z]/.test((formData.password as string) || '')
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-500 dark:text-gray-500'
                          }`}>
                            {passwordValidation && /[a-zA-Z]/.test((formData.password as string) || '') ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <XIcon className="h-3.5 w-3.5" />
                            )}
                            {t('password_requirements.requires_letter', 'At least one letter (a-z, A-Z)')}
                          </li>
                          <li className={`flex items-center gap-1.5 ${
                            passwordValidation && /[0-9]/.test((formData.password as string) || '')
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-500 dark:text-gray-500'
                          }`}>
                            {passwordValidation && /[0-9]/.test((formData.password as string) || '') ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <XIcon className="h-3.5 w-3.5" />
                            )}
                            {t('password_requirements.requires_number', 'At least one number (0-9)')}
                          </li>
                          <li className={`flex items-center gap-1.5 ${
                            passwordValidation && /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test((formData.password as string) || '')
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-500 dark:text-gray-500'
                          }`}>
                            {passwordValidation && /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test((formData.password as string) || '') ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <XIcon className="h-3.5 w-3.5" />
                            )}
                            {t('password_requirements.requires_symbol', 'At least one symbol (!@#$%^&*)')}
                          </li>
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Message and Error Display */}
            {message && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-sm text-green-400">{message}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoadingState}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-white dark:focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
              >
                {isLoadingState ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.loading')}
                  </div>
                ) : (
                  submitText
                )}
              </button>
            </div>
          </form>

          {socialAuth && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t('auth.social.or_continue_with')}</span>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  onClick={handleGoogleLogin}
                  className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                >
                  {/* Google Logo with proper colors */}
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="font-medium">{t('auth.social.continue_with_google')}</span>
                </button>
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="mt-6 space-y-2">
              {links.map((link, index) => (
                <p key={index} className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {link.text}{' '}
                  <Link to={link.href} className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors duration-200">
                    {link.linkText}
                  </Link>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthForm;