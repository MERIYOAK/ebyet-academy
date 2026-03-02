import React, { useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { BookOpen, Users, Plus, ArrowRight, Package, Megaphone, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { adminUser, isAuthenticated, isLoading } = useAdminAuth();

  const handleRefresh = () => {
    // Simple page refresh since we're not loading stats anymore
    window.location.reload();
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login');
      return;
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6 sm:py-8 space-y-4 xxs:space-y-6 sm:space-y-8">
        {/* Page title */}
        <div className="flex flex-col xxs:flex-row xxs:items-baseline xxs:justify-between space-y-4 xxs:space-y-0">
          <div>
            <h1 className="text-xl xxs:text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs xxs:text-sm text-gray-400">Welcome back{adminUser?.email ? `, ${adminUser.email}` : ''}</p>
          </div>
          
          <div className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-2 sm:space-x-4">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center px-3 xxs:px-4 py-2 text-xs xxs:text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900"
            >
              <RefreshCw className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1 xxs:mr-2" />
              Refresh Page
            </button>
            <Link
              to="/admin/upload"
              className="inline-flex items-center justify-center px-3 xxs:px-4 py-2 text-xs xxs:text-sm font-medium rounded-md text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900"
            >
              <Plus className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1 xxs:mr-2" />
              Upload Course
            </Link>
            <Link
              to="/admin/courses"
              className="inline-flex items-center justify-center px-3 xxs:px-4 py-2 border border-gray-700 text-xs xxs:text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900"
            >
              View All Courses
              <ArrowRight className="h-3 w-3 xxs:h-4 xxs:w-4 ml-1 xxs:ml-2" />
            </Link>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <section>
          <h2 className="text-base xxs:text-lg font-semibold text-white mb-3 xxs:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 xxs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xxs:gap-4 sm:gap-6">
            <Link
              to="/admin/upload"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6 hover:shadow-md hover:border-cyan-500/50 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 xxs:p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                  <Plus className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-cyan-400" />
                </div>
                <div className="ml-2 xxs:ml-3 sm:ml-4">
                  <h3 className="text-sm xxs:text-base sm:text-lg font-medium text-white">Upload Course</h3>
                  <p className="text-xs xxs:text-sm text-gray-400">Add a new course to the platform</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/courses"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6 hover:shadow-md hover:border-cyan-500/50 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 xxs:p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                  <BookOpen className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
                <div className="ml-2 xxs:ml-3 sm:ml-4">
                  <h3 className="text-sm xxs:text-base sm:text-lg font-medium text-white">Manage Courses</h3>
                  <p className="text-xs xxs:text-sm text-gray-400">View and edit existing courses</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/reviews"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6 hover:shadow-md hover:border-cyan-500/50 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 xxs:p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <Megaphone className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-purple-400" />
                </div>
                <div className="ml-2 xxs:ml-3 sm:ml-4">
                  <h3 className="text-sm xxs:text-base sm:text-lg font-medium text-white">Manage Reviews</h3>
                  <p className="text-xs xxs:text-sm text-gray-400">Review and moderate student reviews</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/bundles"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6 hover:shadow-md hover:border-cyan-500/50 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 xxs:p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                  <Package className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-cyan-400" />
                </div>
                <div className="ml-2 xxs:ml-3 sm:ml-4">
                  <h3 className="text-sm xxs:text-base sm:text-lg font-medium text-white">Manage Bundles</h3>
                  <p className="text-xs xxs:text-sm text-gray-400">Create and manage course bundles</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/users"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6 hover:shadow-md hover:border-cyan-500/50 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 xxs:p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <Users className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-purple-400" />
                </div>
                <div className="ml-2 xxs:ml-3 sm:ml-4">
                  <h3 className="text-sm xxs:text-base sm:text-lg font-medium text-white">User Management</h3>
                  <p className="text-xs xxs:text-sm text-gray-400">Manage user accounts and permissions</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/announcements"
              className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6 hover:shadow-md hover:border-cyan-500/50 transition-all duration-200"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 xxs:p-3 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                  <Megaphone className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-yellow-400" />
                </div>
                <div className="ml-2 xxs:ml-3 sm:ml-4">
                  <h3 className="text-sm xxs:text-base sm:text-lg font-medium text-white">Announcements</h3>
                  <p className="text-xs xxs:text-sm text-gray-400">Manage home page announcements</p>
                </div>
              </div>
            </Link>

          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardPage; 