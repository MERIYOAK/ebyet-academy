import React, { useState } from 'react';
import { buildApiUrl } from '../config/environment';

import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Eye, EyeOff, Shield, AlertCircle, X } from 'lucide-react';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Use the login function from context
        login(data.token, data.user);
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      } else {
        // Enhanced error handling for different scenarios
        let errorMessage = 'Login failed';
        
        if (data.message) {
          if (data.message.includes('Invalid admin credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          } else if (data.message.includes('Email and password are required')) {
            errorMessage = 'Please enter both email and password.';
          } else if (data.message.includes('valid email address')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (data.message.includes('at least 6 characters')) {
            errorMessage = 'Password must be at least 6 characters long.';
          } else {
            errorMessage = data.message;
          }
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Admin login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-4">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Admin Login</h2>
            <p className="mt-2 text-gray-400">Access admin dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-orange-300 mb-1">
                    Login Failed
                  </h3>
                  <p className="text-sm text-orange-200 leading-relaxed">
                    {error}
                  </p>
                  <div className="mt-2 text-xs text-orange-300">
                    💡 Tip: Make sure you're using the correct admin email and password.
                  </div>
                </div>
                <button
                  onClick={clearError}
                  className="flex-shrink-0 text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                Admin Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={`appearance-none relative block w-full px-4 py-3 bg-gray-900/80 border-2 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:z-10 transition-all duration-200 ${
                  error ? 'border-orange-500/50 bg-orange-500/10' : 'border-gray-700/50'
                }`}
                placeholder="Enter admin email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`appearance-none relative block w-full px-4 py-3 bg-gray-900/80 border-2 placeholder-gray-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:z-10 transition-all duration-200 ${
                    error ? 'border-orange-500/50 bg-orange-500/10' : 'border-gray-700/50'
                  }`}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In as Admin'
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage; 