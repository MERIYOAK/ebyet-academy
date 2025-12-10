import React, { useState } from 'react';
import { buildApiUrl } from '../config/environment';

import { useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

const ResendVerificationPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const fields = [
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'Enter your email address',
      required: true
    }
  ];

  const links = [
    {
      text: 'Remember your password?',
      linkText: 'Sign in here',
      href: '/login'
    },
    {
      text: "Don't have an account?",
      linkText: 'Sign up here',
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
        alert(result.message || 'Verification email sent! Please check your inbox.');
        navigate('/login');
      } else {
        alert(result.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      alert('Failed to send verification email. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      title="Resend Verification Email"
      subtitle="Enter your email address and we'll send you a new verification link"
      fields={fields}
      submitText={isLoading ? "Sending..." : "Send Verification Email"}
      onSubmit={handleSubmit}
      links={links}
    />
  );
};

export default ResendVerificationPage; 