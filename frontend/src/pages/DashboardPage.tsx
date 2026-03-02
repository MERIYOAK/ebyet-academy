import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import CourseCard from '../components/CourseCard';
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
  tags?: string[];
}

interface EnrolledCourse extends Course {
  category: string;
  level: string;
  status: string;
  thumbnailURL?: string;
  isPublic?: boolean;
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

  // Fetch user data and enrolled courses
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
        
        // Debug: Log course data (simplified without progress tracking)
        console.log('📊 [Dashboard] Course data:', courses.map((c: any) => ({
          id: c._id,
          title: c.title,
          category: c.category,
          level: c.level,
          status: c.status
        })));
        
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

  // Filter courses based on search term only (progress tracking removed)
  const filteredCourses = useMemo(() => {
    let filtered = enrolledCourses;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filtering removed - no progress tracking
    return filtered;
  }, [enrolledCourses, searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const endIndex = startIndex + coursesPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-6 xxs:py-8">
          <LoadingMessage 
            message={t('dashboard.loading_dashboard', 'Loading your dashboard, please wait...')}
            className="mb-8"
          />
          <div className="animate-pulse">
            <div className="h-6 xxs:h-8 bg-gray-700 rounded w-1/2 xxs:w-1/4 mb-6 xxs:mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xxs:gap-6 sm:gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-4 xxs:p-6 h-64 xxs:h-80"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 dark:text-red-400 mb-4 xxs:mb-6">
            <BookOpen className="h-16 w-16 xxs:h-20 xxs:w-20 mx-auto" />
          </div>
          <h2 className="text-xl xxs:text-2xl font-bold text-blue-900 dark:text-white mb-3 xxs:mb-4">{t('dashboard.error_loading', 'Failed to load dashboard')}</h2>
          <p className="text-blue-700 dark:text-gray-300 mb-6 xxs:mb-8 text-sm xxs:text-base">{error}</p>
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-blue-200 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 pt-20 xxs:pt-24 pb-8 xxs:pb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 xxs:gap-8">
            {/* Welcome Section */}
            <div className="flex-1">
              <h1 className="text-3xl xxs:text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-3 pb-2 sm:pb-3">
                {t('dashboard.welcome_back')}, {displayName}!
              </h1>
              <p className="text-blue-700 dark:text-gray-300 text-base xxs:text-lg max-w-2xl">
                {t('dashboard.continue_learning')}
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex-shrink-0">
              <Link
                to="/courses"
                className="inline-flex items-center px-6 xxs:px-8 py-3 xxs:py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-sm xxs:text-base"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                {t('dashboard.browse_courses')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-6 xxs:py-8 sm:py-12">
        {/* Main Content Area */}
        <div className="space-y-6 xxs:space-y-8 min-w-0">
            {/* Search and Filter - Modern Design */}
            <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
              <div className="p-4 xxs:p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 xxs:gap-5">
                  <div className="flex-1 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center bg-gray-100 dark:bg-gray-900/60 border-2 border-gray-300 dark:border-gray-700/40 rounded-2xl px-4 py-3 focus-within:border-cyan-500 dark:focus-within:border-cyan-500/60 focus-within:bg-gray-50 dark:focus-within:bg-gray-900/80 transition-all duration-300">
                      <Search className="h-5 w-5 text-gray-600 dark:text-cyan-400/70 mr-3 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={t('dashboard.search_courses')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none text-sm xxs:text-base"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'in-progress' | 'completed')}
                      className="w-full sm:w-auto px-4 xxs:px-5 py-3 bg-white dark:bg-gray-900/60 border-2 border-gray-300 dark:border-gray-700/40 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm xxs:text-base transition-all duration-300"
                    >
                      <option value="all">{t('dashboard.all_courses')}</option>
                      <option value="in-progress">{t('dashboard.in_progress')}</option>
                      <option value="completed">{t('dashboard.completed')}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Grid */}
            <div className="space-y-6 xxs:space-y-8">
              {filteredCourses.length === 0 ? (
                <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 p-8 xxs:p-12 text-center">
                  <div className="flex items-center justify-center mb-6">
                    <div className="p-4 bg-blue-100 dark:bg-gray-700/50 rounded-full">
                      <BookOpen className="h-12 w-12 xxs:h-16 xxs:w-16 text-blue-600 dark:text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-xl xxs:text-2xl font-semibold text-blue-900 dark:text-white mb-3">
                    {enrolledCourses.length === 0 ? t('dashboard.no_courses') : t('dashboard.no_courses')}
                  </h3>
                  <p className="text-blue-700 dark:text-gray-400 mb-6 xxs:mb-8 text-sm xxs:text-base max-w-md mx-auto">
                    {enrolledCourses.length === 0 
                      ? t('dashboard.start_learning')
                      : t('dashboard.no_courses')
                    }
                  </p>
                  <Link
                    to="/courses"
                    className="inline-flex items-center px-6 xxs:px-8 py-3 xxs:py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-sm xxs:text-base"
                  >
                    <BookOpen className="h-5 w-5 mr-2" />
                    {t('dashboard.view_all')}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 tiny:gap-4 xs:gap-6 sm:gap-8">
                    {currentCourses.map((course) => (
                      <div key={course._id} className="w-full">
                        <CourseCard 
                          id={course._id}
                          title={course.title}
                          description={course.description}
                          thumbnail={course.thumbnailURL || course.thumbnail}
                          price={course.price}
                          duration={course.duration}
                          students={course.enrolledStudents || 0}
                          lessons={course.totalLessons || 0}
                          instructor={course.instructor || ''}
                          tags={course.tags || []}
                          isPurchased={true}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 p-4 xxs:p-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-blue-700 dark:text-gray-300">
                          {t('dashboard.showing')} <span className="text-blue-600 dark:text-cyan-400 font-semibold">{startIndex + 1}</span> {t('dashboard.to')} <span className="text-blue-600 dark:text-cyan-400 font-semibold">{Math.min(endIndex, filteredCourses.length)}</span> {t('dashboard.of')} <span className="text-blue-900 dark:text-white font-semibold">{filteredCourses.length}</span> {t('dashboard.courses')}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Previous Button */}
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 dark:text-gray-300 bg-blue-100 dark:bg-gray-800/50 border border-blue-300 dark:border-gray-600 rounded-xl hover:bg-blue-200 dark:hover:bg-gray-700 hover:text-blue-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                                    <span key={page} className="px-2 py-1 text-blue-600 dark:text-gray-500">
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
                                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                                    page === currentPage
                                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                                      : 'text-blue-700 dark:text-gray-300 bg-blue-100 dark:bg-gray-800/50 border border-blue-300 dark:border-gray-600 hover:bg-blue-200 dark:hover:bg-gray-700 hover:text-blue-900 dark:hover:text-white'
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
                            className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 dark:text-gray-300 bg-blue-100 dark:bg-gray-800/50 border border-blue-300 dark:border-gray-600 rounded-xl hover:bg-blue-200 dark:hover:bg-gray-700 hover:text-blue-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {t('dashboard.next')}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
