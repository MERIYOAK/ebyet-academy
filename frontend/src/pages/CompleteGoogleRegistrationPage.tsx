import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, CheckCircle, XCircle, Loader } from 'lucide-react';
import { config } from '../config/environment';
import ScrollToTop from '../components/ScrollToTop';

const CompleteGoogleRegistrationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'input' | 'loading' | 'success' | 'error'>('input');
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
    }
  }, [userId, email, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid international phone number (e.g., +1234567890)');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch(config.API_BASE_URL + '/api/auth/complete-google-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          phoneNumber: phoneNumber.trim()
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

  const handleRetry = () => {
    setStatus('input');
    setError('');
    setPhoneNumber('');
  };

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
              {t('google_registration.welcome_message', { name })}
            </p>
            <p className="mt-1 text-sm text-gray-400">{email}</p>
          </div>

          {status === 'input' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-300">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    id="phoneNumber"
                    type="tel"
                    required
                    className="appearance-none relative block w-full pl-12 pr-4 py-3 border border-gray-600 bg-gray-900 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 transition-all duration-200"
                    placeholder={config.SUPPORT_PHONE}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Enter your phone number in international format (e.g., +1234567890)
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
              >
                {t('google_registration.complete_registration')}
              </button>
            </form>
          )}

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
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
              >
                {t('google_registration.try_again')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteGoogleRegistrationPage;
