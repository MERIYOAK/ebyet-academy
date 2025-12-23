import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { BookOpen, Users, Play, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminUser {
  email: string;
  role: string;
  type: string;
}

interface AdminStats {
  totalCourses: number;
  totalUsers: number;
  totalVideos: number;
}

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { adminUser, isAuthenticated, isLoading } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login');
      return;
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        const response = await fetch(buildApiUrl('/api/admin/stats'), {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data.data);
        } else {
          console.error('Failed to fetch admin stats');
        }
      } catch (error) {
        console.error('Error loading admin stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadStats();
    }
    
    // Refresh stats when a course is created
    const onCreated = () => loadStats();
    window.addEventListener('course:created', onCreated as EventListener);
    return () => window.removeEventListener('course:created', onCreated as EventListener);
  }, [isAuthenticated]);

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };


  const adminStats = [
    { 
      title: 'Total Users', 
      value: stats ? formatNumber(stats.totalUsers) : '...', 
      icon: Users, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Total Courses', 
      value: stats ? formatNumber(stats.totalCourses) : '...', 
      icon: BookOpen, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Total Videos', 
      value: stats ? formatNumber(stats.totalVideos) : '...', 
      icon: Play, 
      color: 'bg-gradient-to-br from-purple-500 to-pink-500' 
    }
  ];

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
          
          {/* Quick Actions */}
          <div className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-2 sm:space-x-4">
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

        {/* Stats Grid */}
        <section>
          <div className="grid grid-cols-1 xxs:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 xxs:gap-4 sm:gap-6">
            {adminStats.map((stat) => (
              <div key={stat.title} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-2 xxs:p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="ml-2 xxs:ml-3 sm:ml-4">
                    <p className="text-xs xxs:text-sm font-medium text-gray-400">{stat.title}</p>
                    <p className="text-lg xxs:text-xl sm:text-2xl font-semibold text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

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
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardPage; 