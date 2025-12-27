import React, { useState } from 'react';
import { buildApiUrl } from '../config/environment';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

const ResendVerificationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const fields = [
    {
      name: 'email',
      label: t('auth.verify_email.email'),
      type: 'email',
      placeholder: t('auth.verify_email.enter_email'),
      required: true
    }
  ];

  const links = [
    {
      text: t('auth.reset_password.remember_password'),
      linkText: t('auth.reset_password.sign_in_here'),
      href: '/login'
    },
    {
      text: t('auth.reset_password.no_account'),
      linkText: t('auth.reset_password.sign_up_here'),
      href: '/register'
    }
  ];

  const handleSubmit = async (data: Record<string, string | File>) => {
    console.log('Resend verification data:', data);
    
    setIsLoading(true);
    
    try {
      const response = await fetch(buildApiUrl('/api/auth/resend-verification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || t('auth.verify_email.verification_sent'));
        navigate('/login');
      } else {
        alert(result.message || t('auth.verify_email.verification_error'));
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      alert(t('auth.verify_email.network_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      title={t('auth.verify_email.resend_verification')}
      subtitle={t('auth.verify_email.resend_subtitle')}
      fields={fields}
      submitText={isLoading ? t('auth.verify_email.sending') : t('auth.verify_email.send_verification_email')}
      onSubmit={handleSubmit}
      links={links}
    />
  );
};

export default ResendVerificationPage; 