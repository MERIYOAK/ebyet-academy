import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { BookOpen, Users, Play, Plus, ArrowRight, Package, Megaphone, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import socketService from '../services/socketService';

interface AdminUser {
  email: string;
  role: string;
  type: string;
}

interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalVideos: number;
  totalBundles: number;
  totalReviews: number;
  totalAnnouncements: number;
  activeCourses: number;
  publishedCourses: number;
  inactiveCourses: number;
  totalEnrollments: number;
  recentUsers: number;
  recentCourses: number;
  videoStats: {
    totalDuration: number;
    avgDuration: number;
    totalSize: number;
  };
  popularCourses: Array<{
    title: string;
    enrolledCount: number;
    thumbnail: string;
  }>;
  lastUpdated: string;
}

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { adminUser, isAuthenticated, isLoading } = useAdminAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login');
      return;
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
    
    // Refresh stats when a course is created
    const onCreated = () => loadStats();
    window.addEventListener('course:created', onCreated as EventListener);
    
    // Set up Socket.IO for real-time updates
    const handleContentUpdate = (payload: any) => {
      console.log('📊 Admin dashboard received update:', payload.type);
      // Refresh stats when content changes
      loadStats();
    };
    
    // Listen for content updates that would affect stats
    socketService.addEventListener('NEW_COURSE', handleContentUpdate);
    socketService.addEventListener('COURSE_UPDATED', handleContentUpdate);
    socketService.addEventListener('NEW_VIDEO', handleContentUpdate);
    socketService.addEventListener('VIDEO_UPDATED', handleContentUpdate);
    socketService.addEventListener('NEW_BUNDLE', handleContentUpdate);
    socketService.addEventListener('BUNDLE_UPDATED', handleContentUpdate);
    
    return () => {
      window.removeEventListener('course:created', onCreated as EventListener);
      socketService.removeEventListener('NEW_COURSE', handleContentUpdate);
      socketService.removeEventListener('COURSE_UPDATED', handleContentUpdate);
      socketService.removeEventListener('NEW_VIDEO', handleContentUpdate);
      socketService.removeEventListener('VIDEO_UPDATED', handleContentUpdate);
      socketService.removeEventListener('NEW_BUNDLE', handleContentUpdate);
      socketService.removeEventListener('BUNDLE_UPDATED', handleContentUpdate);
    };
  }, [isAuthenticated]);

  // Format numbers with commas
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    return num.toLocaleString();
  };

  // Format duration in minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };


  const adminStats = [
    { 
      title: 'Total Users', 
      value: stats ? formatNumber(stats.totalUsers) : '...', 
      icon: Users, 
      color: 'bg-blue-500',
      subtitle: stats ? `+${stats.recentUsers} this month` : ''
    },
    { 
      title: 'Total Courses', 
      value: stats ? formatNumber(stats.totalCourses) : '...', 
      icon: BookOpen, 
      color: 'bg-green-500',
      subtitle: stats ? `${stats.activeCourses} active` : ''
    },
    { 
      title: 'Total Videos', 
      value: stats ? formatNumber(stats.totalVideos) : '...', 
      icon: Play, 
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      subtitle: stats ? formatDuration(stats.videoStats.totalDuration) : ''
    },
    { 
      title: 'Total Enrollments', 
      value: stats ? formatNumber(stats.totalEnrollments) : '...', 
      icon: Package, 
      color: 'bg-orange-500',
      subtitle: stats ? `Across all courses` : ''
    },
    { 
      title: 'Course Bundles', 
      value: stats ? formatNumber(stats.totalBundles) : '...', 
      icon: Package, 
      color: 'bg-indigo-500',
      subtitle: stats ? 'Available bundles' : ''
    },
    { 
      title: 'Reviews', 
      value: stats ? formatNumber(stats.totalReviews) : '...', 
      icon: Megaphone, 
      color: 'bg-yellow-500',
      subtitle: stats ? 'User feedback' : ''
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
            {stats?.lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {new Date(stats.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-2 sm:space-x-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center px-3 xxs:px-4 py-2 text-xs xxs:text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900"
            >
              <RefreshCw className={`h-3 w-3 xxs:h-4 xxs:w-4 mr-1 xxs:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Stats'}
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

        {/* Stats Grid */}
        <section>
          <div className="grid grid-cols-1 xxs:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 xxs:gap-4 sm:gap-6">
            {adminStats.map((stat) => (
              <div key={stat.title} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-2 xxs:p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="ml-2 xxs:ml-3 sm:ml-4">
                    <p className="text-xs xxs:text-sm font-medium text-gray-400">{stat.title}</p>
                    <p className="text-lg xxs:text-xl sm:text-2xl font-semibold text-white">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs xxs:text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Popular Courses */}
        {stats?.popularCourses && stats.popularCourses.length > 0 && (
          <section>
            <h2 className="text-base xxs:text-lg font-semibold text-white mb-3 xxs:mb-4">Popular Courses</h2>
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 xxs:p-4 sm:p-6">
              <div className="space-y-3">
                {stats.popularCourses.map((course, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {course.thumbnail ? (
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="h-8 w-8 xxs:h-10 xxs:w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 xxs:h-10 xxs:w-10 rounded bg-gray-600 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 xxs:h-5 xxs:w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-xs xxs:max-w-sm">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatNumber(course.enrolledCount)} enrolled
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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