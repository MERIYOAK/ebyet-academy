import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../config/environment';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import ScrollToTop from '../components/ScrollToTop';

const GoogleCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState(t('google_callback.processing_authentication'));

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Get token from URL parameters
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(decodeURIComponent(error));
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        if (!token) {
          setStatus('error');
          setMessage(t('google_callback.no_token_received'));
          setTimeout(() => {
            navigate('/login');
          }, 3000);
          return;
        }

        // Store the token in localStorage
        localStorage.setItem('token', token);

        // Verify the token by making a request to the backend
        const response = await fetch(buildApiUrl('/api/auth/verify-token'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Token verification failed');
        }

        setStatus('success');
        setMessage('Authentication successful! Redirecting to dashboard...');

        // Redirect to dashboard after successful authentication
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);

      } catch (error) {
        console.error('Google callback error:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleGoogleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center pt-16">
      <ScrollToTop />
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader className="h-16 w-16 text-cyan-400 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">{t('google_callback.authenticating')}</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">{t('google_callback.success')}</h2>
              <p className="text-gray-300">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">{t('google_callback.authentication_failed')}</h2>
              <p className="text-gray-300">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                {t('google_callback.back_to_login')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
