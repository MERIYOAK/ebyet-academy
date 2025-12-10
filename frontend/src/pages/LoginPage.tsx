import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import AuthForm from '../components/AuthForm';
import AccountSuspendedModal from '../components/AccountSuspendedModal';
import { buildApiUrl } from '../config/environment';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedUserEmail, setSuspendedUserEmail] = useState<string>('');

  const fields = [
    {
      name: 'email',
      label: t('auth.login.email'),
      type: 'email',
      placeholder: t('auth.login.enter_email'),
      required: true
    },
    {
      name: 'password',
      label: t('auth.login.password'),
      type: 'password',
      placeholder: t('auth.login.enter_password'),
      required: true
    }
  ];

  const links = [
    {
      text: t('auth.login.dont_have_account'),
      linkText: t('auth.login.sign_up_here'),
      href: '/register'
    },
    {
      text: t('auth.login.forgot_password'),
      linkText: t('auth.login.reset_here'),
      href: '/reset-password'
    }
  ];

  const handleSubmit = async (data: Record<string, string | File>) => {
    console.log('Login data:', data);
    
    try {
      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store the auth token
        if (result.data?.token) {
          localStorage.setItem('token', result.data.token);
        }
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Handle specific error cases
        if (result.message && result.message.includes('verify your email')) {
          alert(t('auth.login.verify_email_first'));
        } else if (result.message && (
          result.message.includes('Account is not active') || 
          result.message.includes('account is not active') ||
          result.message.includes('suspended') ||
          result.message.includes('inactive')
        )) {
          // Show suspended account modal with the email they tried to login with
          setSuspendedUserEmail(data.email as string);
          setShowSuspendedModal(true);
        } else {
          alert(result.message || t('auth.login.invalid_credentials'));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(t('auth.login.login_error'));
    }
  };

  return (
    <>
      <AuthForm
        title={t('auth.login.welcome_back')}
        subtitle={t('auth.login.sign_in_to_account')}
        fields={fields}
        submitText={t('auth.login.sign_in')}
        onSubmit={handleSubmit}
        links={links}
        socialAuth={true}
      />
      
      <AccountSuspendedModal
        isOpen={showSuspendedModal}
        onClose={() => setShowSuspendedModal(false)}
        userEmail={suspendedUserEmail}
      />
    </>
  );
};

export default LoginPage;