import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { config } from '../config/environment';
import ScrollToTop from '../components/ScrollToTop';

const CompleteGoogleRegistrationPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Get user data from URL parameters
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const name = searchParams.get('name');

  useEffect(() => {
    // Validate required parameters
    if (!userId || !email || !name) {
      setStatus('error');
      setError(t('google_registration.invalid_link_message'));
      return;
    }

    // Auto-complete registration on component mount
    const completeRegistration = async () => {
      setStatus('loading');
      setError('');

      try {
        const response = await fetch(config.API_BASE_URL + '/api/auth/complete-google-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId
          })
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || t('google_registration.registration_complete'));
          
          // Store the token and redirect to dashboard
          if (result.data?.token) {
            localStorage.setItem('token', result.data.token);
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          }
        } else {
          setStatus('error');
          setError(result.message || t('google_registration.registration_failed'));
        }
      } catch (error) {
        console.error('Complete registration error:', error);
        setStatus('error');
        setError(t('common.error'));
      }
    };

    completeRegistration();
  }, [userId, email, name, navigate, t]);

  if (status === 'error' && (!userId || !email || !name)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center pt-16">
        <ScrollToTop />
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8 text-center">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Registration Link</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center pt-16 pb-12 px-4">
      <ScrollToTop />
      <div className="max-w-md w-full space-y-8">
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent pb-2 sm:pb-3">{t('google_registration.complete_registration')}</h2>
            <p className="mt-2 text-gray-300">
              Welcome, {name}! Completing your account setup...
            </p>
            <p className="mt-1 text-sm text-gray-400">{email}</p>
          </div>

          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader className="h-16 w-16 text-cyan-400 animate-spin mx-auto" />
              <h3 className="text-xl font-semibold text-white">{t('google_registration.completing_registration')}</h3>
              <p className="text-gray-300">{t('google_registration.please_wait')}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-semibold text-white">{t('google_registration.registration_complete')}</h3>
              <p className="text-gray-300">{message}</p>
              <p className="text-sm text-gray-400">{t('auth.verify_email.redirecting')}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="h-16 w-16 text-red-400 mx-auto" />
              <h3 className="text-xl font-semibold text-white">{t('google_registration.registration_failed')}</h3>
              <p className="text-gray-300">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
              >
                {t('google_registration.go_to_login')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteGoogleRegistrationPage;
