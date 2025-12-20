import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, Trophy, TrendingUp, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import LoadingMessage from '../components/LoadingMessage';
import { buildApiUrl } from '../config/environment';

interface UserData {
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  purchasedCourses?: string[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  totalLessons: number;
  price: number;
  instructor: string;
  category: string;
  rating: number;
  enrolledStudents: number;
}

interface EnrolledCourse extends Course {
  progress: number;
  completedLessons: number;
  isCompleted: boolean;
  lastWatched?: string | null;
  videos?: any[];
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [coursesPerPage] = useState(6); // Show 6 courses per page

  // Derive a friendly display name
  const displayName = useMemo(() => {
    const rawName = userData?.name?.trim();
    if (rawName && rawName.length > 0) return rawName;
    const rawEmail = userData?.email?.trim();
    if (rawEmail && rawEmail.includes('@')) return rawEmail.split('@')[0];
    return 'Learner';
  }, [userData?.name, userData?.email]);

  // Fetch user data and enrolled courses with progress
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch user data
        const userResponse = await fetch(buildApiUrl('/api/auth/me'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!userResponse.ok) {
          throw new Error(t('dashboard.failed_fetch_user'));
        }

        const userResult = await userResponse.json();
        const me = userResult?.data?.user || userResult?.data || null;
        setUserData(me);

        // Fetch dashboard progress data
        const progressResponse = await fetch(buildApiUrl('/api/progress/dashboard'), {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
        if (!progressResponse.ok) {
          throw new Error(t('dashboard.failed_fetch_progress'));
        }

        const progressResult = await progressResponse.json();
        const courses = Array.isArray(progressResult?.data?.courses) ? progressResult.data.courses : [];
        setEnrolledCourses(courses);

          } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error instanceof Error ? error.message : t('dashboard.failed_load_dashboard'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // Filter courses based on search term and status
  const filteredCourses = useMemo(() => {
    let filtered = enrolledCourses;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
    }

    // Filter by status
    switch (filterStatus) {
      case 'in-progress':
        filtered = filtered.filter(course => {
          const isCompletedLike = course.isCompleted || course.progress >= 90;
          return !isCompletedLike && course.progress > 0;
        });
        break;
      case 'completed':
        filtered = filtered.filter(course => course.isCompleted || course.progress >= 90);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    return filtered;
  }, [enrolledCourses, searchTerm, filterStatus]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  // Calculate dashboard statistics
  const dashboardStats = useMemo(() => {
    const totalCourses = enrolledCourses.length;
    const completedCourses = enrolledCourses.filter(course => course.isCompleted || course.progress >= 90).length;
    const inProgressCourses = enrolledCourses.filter(course => course.progress > 0 && !(course.isCompleted || course.progress >= 90)).length;
    const notStartedCourses = enrolledCourses.filter(course => course.progress === 0).length;
    const averageProgress = totalCourses > 0 
      ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / totalCourses)
      : 0;

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      notStartedCourses,
      averageProgress
    };
  }, [enrolledCourses]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-6 xxs:py-8">
          <LoadingMessage 
            message={t('dashboard.loading_dashboard', 'Loading your dashboard, please wait...')}
            className="mb-8"
          />
          <div className="animate-pulse">
            <div className="h-6 xxs:h-8 bg-gray-700 rounded w-1/2 xxs:w-1/4 mb-6 xxs:mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xxs:gap-6 sm:gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-2xl shadow border border-gray-700 p-4 xxs:p-6 h-64 xxs:h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-400 mb-4 xxs:mb-6">
            <BookOpen className="h-16 w-16 xxs:h-20 xxs:w-20 mx-auto" />
          </div>
          <h2 className="text-xl xxs:text-2xl font-bold text-white mb-3 xxs:mb-4">{t('dashboard.error_loading', 'Failed to load dashboard')}</h2>
          <p className="text-gray-300 mb-6 xxs:mb-8 text-sm xxs:text-base">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 xxs:px-8 py-2 xxs:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-sm xxs:text-base"
          >
            {t('common.retry', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 pt-20 xxs:pt-24 pb-6 xxs:pb-8">
      {/* Header */}
        <div className="mb-6 xxs:mb-8">
          <h1 className="text-2xl xxs:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">
            {t('dashboard.welcome_back')}, {displayName}! 👋
          </h1>
          <p className="text-gray-300 text-sm xxs:text-base">
            {t('dashboard.continue_learning')}
          </p>
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-2 xxs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 xxs:gap-4 sm:gap-6 mb-6 xxs:mb-8">
          <div className="bg-gray-800 rounded-xl p-3 xxs:p-4 sm:p-6 shadow-sm border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs xxs:text-sm font-medium text-gray-400">{t('dashboard.course_stats.total_courses')}</p>
                <p className="text-lg xxs:text-xl sm:text-2xl font-bold text-white">{dashboardStats.totalCourses}</p>
              </div>
              <div className="p-2 xxs:p-3 bg-cyan-500/20 rounded-lg">
                <BookOpen className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-cyan-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 xxs:p-4 sm:p-6 shadow-sm border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs xxs:text-sm font-medium text-gray-400">{t('dashboard.course_stats.completed_courses')}</p>
                <p className="text-lg xxs:text-xl sm:text-2xl font-bold text-green-400">{dashboardStats.completedCourses}</p>
              </div>
              <div className="p-2 xxs:p-3 bg-green-500/20 rounded-lg">
                <Trophy className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 xxs:p-4 sm:p-6 shadow-sm border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs xxs:text-sm font-medium text-gray-400">{t('dashboard.course_stats.in_progress')}</p>
                <p className="text-lg xxs:text-xl sm:text-2xl font-bold text-orange-400">{dashboardStats.inProgressCourses}</p>
              </div>
              <div className="p-2 xxs:p-3 bg-orange-500/20 rounded-lg">
                <TrendingUp className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 xxs:p-4 sm:p-6 shadow-sm border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                <p className="text-xs xxs:text-sm font-medium text-gray-400">{t('dashboard.progress')}</p>
                <p className="text-lg xxs:text-xl sm:text-2xl font-bold text-purple-400">{dashboardStats.averageProgress}%</p>
                </div>
              <div className="p-2 xxs:p-3 bg-purple-500/20 rounded-lg">
                <Clock className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 xxs:gap-4 mb-6 xxs:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 xxs:h-5 xxs:w-5" />
              <input
                type="text"
              placeholder={t('dashboard.search_courses')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 xxs:pl-10 pr-4 py-2 xxs:py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm xxs:text-base placeholder-gray-400"
              />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'in-progress' | 'completed')}
              className="px-3 xxs:px-4 py-2 xxs:py-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm xxs:text-base"
            >
              <option value="all">{t('dashboard.all_courses')}</option>
              <option value="in-progress">{t('dashboard.in_progress')}</option>
              <option value="completed">{t('dashboard.completed')}</option>
            </select>
            </div>
          </div>

        {/* Course Grid */}
        <div className="space-y-4 xxs:space-y-6">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-8 xxs:py-12">
              <BookOpen className="h-12 w-12 xxs:h-16 xxs:w-16 text-gray-400 mx-auto mb-3 xxs:mb-4" />
              <h3 className="text-lg xxs:text-xl font-semibold text-gray-300 mb-2">
                {enrolledCourses.length === 0 ? t('dashboard.no_courses') : t('dashboard.no_courses')}
              </h3>
              <p className="text-gray-400 mb-4 xxs:mb-6 text-sm xxs:text-base">
                {enrolledCourses.length === 0 
                  ? t('dashboard.start_learning')
                  : t('dashboard.no_courses')
                }
              </p>
              <Link
                to="/courses"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 xxs:px-6 py-2 xxs:py-3 rounded-lg font-semibold transition-all duration-200 text-sm xxs:text-base shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
              >
                {t('dashboard.view_all')}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xxs:gap-6 sm:gap-8">
                {currentCourses.map((course) => (
                  <DashboardCard 
                    key={course._id} 
                    {...course}
                    isCompleted={course.isCompleted}
                  />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 xxs:mt-8">
                  <div className="text-sm text-gray-300">
                    {t('dashboard.showing')} {startIndex + 1} {t('dashboard.to')} {Math.min(endIndex, filteredCourses.length)} {t('dashboard.of')} {filteredCourses.length} {t('dashboard.courses')}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t('dashboard.previous')}
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current page
                        const shouldShow = 
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1);
                        
                        if (!shouldShow) {
                          // Show ellipsis for gaps
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <span key={page} className="px-2 py-1 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          return null;
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                              page === currentPage
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                                : 'text-gray-300 bg-gray-800 border border-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {t('dashboard.next')}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-4 xxs:p-6 sm:p-8 text-white mt-8 xxs:mt-12 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 xxs:mb-6 md:mb-0 text-center md:text-left">
              <h3 className="text-xl xxs:text-2xl font-bold mb-2">{t('dashboard.ready_to_learn')}</h3>
              <p className="text-cyan-100 text-sm xxs:text-base">
                {t('dashboard.explore_courses')}
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/courses"
                className="bg-white text-cyan-600 hover:bg-gray-100 px-4 xxs:px-6 py-2 xxs:py-3 rounded-lg font-semibold transition-colors duration-200 text-sm xxs:text-base shadow-lg"
              >
                {t('dashboard.browse_courses')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;