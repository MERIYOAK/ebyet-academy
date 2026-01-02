import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildApiUrl } from '../config/environment';

import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmailPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage(t('auth.verify_email.invalid_link'));
        return;
      }

      try {
        const response = await fetch(buildApiUrl('/api/auth/verify-email'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || t('auth.verify_email.verified_successfully'));
          
          // Store the auth token if provided
          if (result.data?.token) {
            localStorage.setItem('token', result.data.token);
          }
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(result.message || t('auth.verify_email.verification_failed'));
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(t('auth.verify_email.network_error'));
      }
    };

    verifyEmail();
  }, [searchParams, navigate, t]);

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-cyan-600 dark:text-cyan-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            {getStatusIcon()}
            
            <h2 className={`mt-6 text-2xl font-bold ${
              status === 'loading' ? 'text-cyan-600 dark:text-cyan-400' :
              status === 'success' ? 'text-green-600 dark:text-green-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {status === 'loading' && t('auth.verify_email.verifying')}
              {status === 'success' && t('auth.verify_email.verified')}
              {status === 'error' && t('auth.verify_email.failed')}
            </h2>
            
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              {message}
            </p>

            {status === 'success' && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('auth.verify_email.redirecting')}
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="mt-6 space-y-3">
                <Link
                  to="/resend-verification"
                  className="block w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-2 px-4 rounded-lg transition-all duration-200 text-center shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
                >
                  {t('auth.verify_email.resend_verification')}
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {t('auth.verify_email.back_to_login')}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2 px-4 rounded-lg transition-colors duration-200 border border-gray-300 dark:border-gray-600"
                >
                  {t('auth.verify_email.go_to_home')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage; 