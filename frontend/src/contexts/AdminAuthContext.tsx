import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { buildApiUrl } from '../config/environment';


interface AdminUser {
  email: string;
  role: string;
  type: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const validateToken = async (): Promise<boolean> => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      return false;
    }

    try {
      const response = await fetch(buildApiUrl('/api/admin/validate'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUser(data.admin);
        return true;
      } else {
        // Token is invalid or expired - silently clean up
        // Note: 401 responses are expected for expired/invalid tokens
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setAdminUser(null);
        return false;
      }
    } catch (error) {
      // Only log unexpected errors (network issues, etc.)
      // Don't log 401 errors as they're expected for invalid/expired tokens
      if (error instanceof TypeError) {
        // Network error or CORS issue
        console.error('Token validation network error:', error);
      }
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setAdminUser(null);
      return false;
    }
  };

  const login = (token: string, user: AdminUser) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    setAdminUser(user);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setAdminUser(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const userData = localStorage.getItem('adminUser');

      // Skip validation on login page
      if (location.pathname === '/admin/login') {
        setIsLoading(false);
        return;
      }

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          setAdminUser(user);
          
          // Validate token with server
          const isValid = await validateToken();
          if (!isValid) {
            setAdminUser(null);
          }
        } catch (error) {
          console.error('Error parsing admin user data:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          setAdminUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [location.pathname]);

  const value: AdminAuthContextType = {
    adminUser,
    isLoading,
    isAuthenticated: !!adminUser,
    login,
    logout,
    validateToken,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}; 