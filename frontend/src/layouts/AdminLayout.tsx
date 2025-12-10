import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import AdminNavbar from '../components/nav/AdminNavbar';
import ScrollToTop from '../components/ScrollToTop';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const isLoginRoute = location.pathname === '/admin/login';

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated and not already on login page
  if (!isLoginRoute && !isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Redirect to dashboard if authenticated and on login page
  if (isLoginRoute && isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <ScrollToTop />
    </div>
  );
};

export default AdminLayout; 