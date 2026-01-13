import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthForm from '../components/AuthForm';
import { buildApiUrl } from '../config/environment';
import { validatePassword } from '../utils/passwordValidation';

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const fields = [
    {
      name: 'firstName',
      label: t('auth.register.first_name'),
      type: 'text',
      placeholder: t('auth.register.enter_first_name'),
      required: true
    },
    {
      name: 'lastName',
      label: t('auth.register.last_name'),
      type: 'text',
      placeholder: t('auth.register.enter_last_name'),
      required: true
    },
    {
      name: 'email',
      label: t('auth.register.email'),
      type: 'email',
      placeholder: t('auth.register.enter_email'),
      required: true
    },
    {
      name: 'password',
      label: t('auth.register.password'),
      type: 'password',
      placeholder: t('auth.register.create_password'),
      required: true
    },
    {
      name: 'confirmPassword',
      label: t('auth.register.confirm_password'),
      type: 'password',
      placeholder: t('auth.register.confirm_password_placeholder'),
      required: true
    },
    {
      name: 'profilePhoto',
      label: t('auth.register.profile_photo'),
      type: 'file',
      required: false
    }
  ];

  const links = [
    {
      text: t('auth.register.already_have_account'),
      linkText: t('auth.register.sign_in_here'),
      href: '/login'
    }
  ];

  const handleSubmit = async (data: Record<string, string | File>) => {
    console.log('Register data:', data);
    
    // Prevent multiple submissions
    if (isLoading) return;
    
    // Password validation
    const passwordValidation = validatePassword(data.password as string);
    if (!passwordValidation.isValid) {
      const errorMessages = passwordValidation.errors.map(err => t(`auth.${err}`));
      alert(t('auth.register.password_requirements_error', 'Password does not meet requirements:\n') + errorMessages.join('\n'));
      return;
    }
    
    // Basic validation
    if (data.password !== data.confirmPassword) {
      alert(t('auth.register.password_mismatch'));
      return;
    }
    
    try {
      setIsLoading(true); // Start loading
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('name', `${data.firstName} ${data.lastName}`);
      formData.append('email', data.email as string);
      formData.append('password', data.password as string);
      
      // Add profile photo if selected
      if (data.profilePhoto) {
        formData.append('profilePhoto', data.profilePhoto);
      }

      // Make API call to register user
      const response = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        if (result.data.verificationRequired) {
          // Show clear verification message with better instructions
          alert(`${result.message || t('auth.register.registration_success')}\n\n${t('auth.register.check_email_instructions', 'Please check your email inbox (including spam folder) and click the verification link to complete your registration.')}`);
          navigate('/'); // Redirect to home page
        } else {
          // This shouldn't happen for manual registration, but handle it just in case
          alert(t('auth.register.registration_success'));
          navigate('/'); // Redirect to home page
        }
      } else {
        alert(result.message || t('auth.register.registration_error'));
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert(t('auth.register.registration_error'));
    } finally {
      setIsLoading(false); // End loading
    }
  };

  return (
    <AuthForm
      title={t('auth.register.join_us')}
      subtitle={t('auth.register.create_account')}
      fields={fields}
      submitText={t('auth.register.sign_up')}
      onSubmit={handleSubmit}
      links={links}
      socialAuth={true}
      loading={isLoading}
    />
  );
};

export default RegisterPage;