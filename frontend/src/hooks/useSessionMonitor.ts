import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config/environment';

interface SessionStatus {
  isValid: boolean;
  isDeactivated: boolean;
  userEmail?: string;
  error?: string;
}

export const useSessionMonitor = () => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({ isValid: true, isDeactivated: false });
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const navigate = useNavigate();

  const checkSessionStatus = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setSessionStatus({ isValid: false, isDeactivated: false });
      return;
    }

    // Only check session status if user has a token (is logged in)

    try {
      const response = await fetch(buildApiUrl('/api/auth/me'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        // User is active and valid
        setSessionStatus({ 
          isValid: true, 
          isDeactivated: false,
          userEmail: result.data?.email 
        });
      } else {
        // Check if it's a deactivation error
        if (result.message && (
          result.message.includes('Account is not active') || 
          result.message.includes('account is not active') ||
          result.message.includes('Token has been invalidated') ||
          result.message.includes('suspended') ||
          result.message.includes('inactive')
        )) {
          // Try to get user email from token if available
          let userEmail = undefined;
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const decoded = JSON.parse(atob(token.split('.')[1]));
              userEmail = decoded.email;
            }
          } catch (e) {
            // Token parsing failed, no email available
          }
          
          // User has been deactivated
          setSessionStatus({ 
            isValid: false, 
            isDeactivated: true,
            userEmail: userEmail,
            error: result.message 
          });
          
          // Show suspended modal
          setShowSuspendedModal(true);
          
          // Clear the invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
        } else {
          // Other authentication errors
          setSessionStatus({ 
            isValid: false, 
            isDeactivated: false,
            error: result.message 
          });
          
          // Clear invalid token and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
      setSessionStatus({ 
        isValid: false, 
        isDeactivated: false,
        error: 'Network error' 
      });
    }
  };

  // Check session status on mount and periodically
  useEffect(() => {
    // Initial check
    checkSessionStatus();

    // Set up periodic checks every 30 seconds
    const interval = setInterval(checkSessionStatus, 30000);

    // Also check when the window regains focus (user comes back to tab)
    const handleFocus = () => {
      checkSessionStatus();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleCloseSuspendedModal = () => {
    setShowSuspendedModal(false);
    // Redirect to login page
    navigate('/login');
  };

  return {
    sessionStatus,
    showSuspendedModal,
    handleCloseSuspendedModal,
    checkSessionStatus
  };
};
