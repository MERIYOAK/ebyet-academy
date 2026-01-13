import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { buildApiUrl } from '../config/environment';

import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { validatePassword } from '../utils/passwordValidation';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');



  // Check if we have a token in the URL (reset mode)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setIsResetMode(true);
    }
  }, [searchParams]);

  const requestResetFields = [
    {
      name: 'email',
      label: t('reset_password.email'),
      type: 'email',
      placeholder: t('reset_password.enter_email'),
      required: true
    }
  ];

  const resetPasswordFields = [
    {
      name: 'newPassword',
      label: t('reset_password.new_password'),
      type: 'password',
      placeholder: t('reset_password.enter_new_password'),
      required: true
    },
    {
      name: 'confirmPassword',
      label: t('reset_password.confirm_password'),
      type: 'password',
      placeholder: t('reset_password.confirm_new_password'),
      required: true
    }
  ];

  const links = [
    {
      text: t('reset_password.remember_password'),
      linkText: t('reset_password.sign_in_here'),
      href: '/login'
    },
    {
      text: t('reset_password.no_account'),
      linkText: t('reset_password.sign_up_here'),
      href: '/register'
    }
  ];

  const handleRequestReset = async (data: Record<string, string | File>) => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch(buildApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.message || t('reset_password.reset_error'));
      }
    } catch (error) {
      console.error('Request reset error:', error);
      setError(t('reset_password.reset_error_retry'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: Record<string, string | File>) => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const token = searchParams.get('token');
      const newPassword = data.newPassword as string;
      const confirmPassword = data.confirmPassword as string;

      // Password validation
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        const errorMessages = passwordValidation.errors.map(err => t(`auth.${err}`));
        setError(t('reset_password.password_requirements_error', 'Password does not meet requirements:\n') + errorMessages.join('\n'));
        return;
      }

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        setError(t('reset_password.passwords_no_match'));
        return;
      }

      const response = await fetch(buildApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.message || t('reset_password.reset_failed'));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(t('reset_password.reset_failed_retry'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Record<string, string | File>) => {
    if (isResetMode) {
      await handleResetPassword(data);
    } else {
      await handleRequestReset(data);
    }
  };

  if (isResetMode) {
    return (
      <AuthForm
        title={t('reset_password.set_new_password')}
        subtitle={t('reset_password.enter_new_password_below')}
        fields={resetPasswordFields}
        submitText={loading ? t('reset_password.resetting') : t('reset_password.reset_password')}
        onSubmit={handleSubmit}
        links={links}
        message={message}
        error={error}
        loading={loading}
      />
    );
  }

  return (
    <AuthForm
      title={t('reset_password.page_title')}
      subtitle={t('reset_password.enter_email_reset')}
      fields={requestResetFields}
      submitText={loading ? t('reset_password.sending') : t('reset_password.send_reset_link')}
      onSubmit={handleSubmit}
      links={links}
      message={message}
      error={error}
      loading={loading}
    />
  );
};

export default ResetPasswordPage;