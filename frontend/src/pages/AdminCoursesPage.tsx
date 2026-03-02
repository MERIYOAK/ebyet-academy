import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../config/environment';

import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Upload, Filter, BookOpen, X, RefreshCw } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';
import useCourseDeletion from '../hooks/useCourseDeletion';
import { getEnglishText } from '../utils/bilingualHelper';

interface Course {
  _id: string;
  title: string | { en: string; tg: string };
  description: string | { en: string; tg: string };
  price: number;
  status: 'active' | 'inactive' | 'archived';
  thumbnailURL?: string;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
}

const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Delete functionality
  const { deleteCourse, isLoading: isDeleting, error: deleteError } = useCourseDeletion();
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch deletion summary when delete button is clicked
  const handleDeleteClick = async (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteModal(true);
    setLoadingSummary(true);
    setDeletionSummary(null);

    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/courses/${course._id}/deletion-summary`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map backend response to frontend expected format
        const summary = {
          videos: data.data.videoCount || 0,
          materials: data.data.materialCount || 0,
          certificates: 0,
          versions: 0,
          progressRecords: 0,
          usersAffected: 0,
          bundlesAffected: 0,
          s3Files: data.data.videos ? data.data.videos.length : 0
        };
        setDeletionSummary(summary);
      } else {
        console.error('Failed to fetch deletion summary');
      }
    } catch (error) {
      console.error('Error fetching deletion summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Handle course deletion
  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    const success = await deleteCourse(courseToDelete._id);
    
    if (success) {
      // Remove course from state
      setCourses(prev => prev.filter(course => course._id !== courseToDelete._id));
      setShowDeleteModal(false);
      setCourseToDelete(null);
      setDeletionSummary(null);
      setToast({
        message: 'Course deleted successfully',
        type: 'success'
      });
    } else {
      setToast({
        message: deleteError || 'Failed to delete course',
        type: 'error'
      });
    }
  };

  // Handle featured toggle
  const handleToggleFeatured = async (courseId: string, currentFeatured: boolean) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/courses/${courseId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: !currentFeatured }),
      });

      if (!response.ok) {
        throw new Error('Failed to update featured status');
      }

      // Update course in state
      setCourses(prev => prev.map(course => 
        course._id === courseId 
          ? { ...course, featured: !currentFeatured }
          : course
      ));

      setToast({
        message: `Course ${!currentFeatured ? 'added to' : 'removed from'} homepage`,
        type: 'success'
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update featured status',
        type: 'error'
      });
    }
  };

  // Fetch courses from API
  const fetchCourses = async (page: number = currentPage, limit: number = itemsPerPage, isFiltering: boolean = false, overrideStatus?: string) => {
    try {
      // Use different loading states
      if (isFiltering) {
        setFiltering(true);
      } else {
        setLoading(true);
      }
      
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Use overrideStatus if provided, otherwise use current statusFilter
      const currentStatus = overrideStatus || statusFilter;

      // Build query parameters
      const queryParams = new URLSearchParams({
        status: currentStatus === 'all' ? 'all' : currentStatus,
        page: page.toString(),
        limit: limit.toString(),
        includeInactive: 'true', // Include inactive courses for admin management
        search: searchTerm // Add search term to query parameters
      });

      console.log('🔍 Frontend sending query:', queryParams.toString());
      console.log('🔍 Status filter value:', currentStatus);
      console.log('🔍 Override status:', overrideStatus);


      const response = await fetch(buildApiUrl(`/api/courses?${queryParams.toString()}&_t=${Date.now()}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      console.log('📊 Frontend received data:', data);
      console.log('📊 Courses count:', data.data?.courses?.length);
      console.log('📊 Pagination:', data.data?.pagination);
      console.log('📊 Current statusFilter:', statusFilter);
      console.log('📊 Received courses with statuses:');
      data.data?.courses?.forEach((course: any, index: number) => {
        const title = typeof course.title === 'object' ? course.title.en || course.title.tg || 'Untitled' : course.title;
        console.log(`   ${index + 1}. "${title}" - Status: "${course.status}"`);
      });
      setCourses(data.data.courses || []);
      
      // Update pagination info
      if (data.data.pagination) {
        setTotalPages(data.data.pagination.totalPages);
        setTotalItems(data.data.pagination.totalCourses);
        setCurrentPage(data.data.pagination.currentPage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCourses(page, itemsPerPage, true); // Use filtering state for pagination
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    fetchCourses(1, newItemsPerPage, true); // Use filtering state
  };

  // Handle search and filter changes with debouncing
  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // Reset to first page
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      fetchCourses(1, itemsPerPage, true); // Use filtering state
    }, 500); // 500ms debounce delay
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
    // Trigger immediate fetch
    setTimeout(() => {
      fetchCourses(1, itemsPerPage, true);
    }, 100);
  };

  const handleStatusFilterChange = (newStatusFilter: string) => {
    console.log('🔄 Status filter changing from', statusFilter, 'to', newStatusFilter);
    setStatusFilter(newStatusFilter);
    setCurrentPage(1); // Reset to first page
    // Set filtering state immediately to prevent "No courses found" message
    setFiltering(true);
    // Clear courses immediately to prevent showing stale data
    setCourses([]);
    // Trigger immediate fetch with the new status directly
    setTimeout(() => {
      console.log('🔄 Triggering fetch with new status:', newStatusFilter);
      fetchCourses(1, itemsPerPage, true, newStatusFilter);
    }, 100);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Cleanup function to clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Use courses directly since filtering is now handled server-side
  const displayedCourses = courses;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/90 text-white border border-green-400';
      case 'inactive': return 'bg-yellow-500/90 text-white border border-yellow-400';
      case 'archived': return 'bg-gray-600/90 text-white border border-gray-400';
      default: return 'bg-gray-600/90 text-white border border-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400 text-sm xxs:text-base">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-cyan-400 mb-4 text-sm xxs:text-base">{error}</p>
          <button 
            onClick={() => fetchCourses()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-3 xxs:px-4 py-2 rounded-lg hover:from-cyan-500 hover:to-blue-500 text-sm xxs:text-base"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-gray-900/80 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
          <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-4 xxs:space-y-0">
            <div>
              <h1 className="text-2xl xxs:text-3xl font-bold text-white">Course Management</h1>
              <p className="mt-2 text-gray-400 text-sm xxs:text-base">Manage all your courses, upload new content, and track performance</p>
            </div>
            <div className="flex space-x-2 xxs:space-x-3">
              <Link
                to="/admin/upload"
                className="inline-flex items-center px-3 xxs:px-4 py-2 border border-transparent text-xs xxs:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                <Upload className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1 xxs:mr-2" />
                Upload Course
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
        <div className="bg-gray-900/80 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
          {/* Filter Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-3 xxs:px-4 sm:px-6 py-3 xxs:py-4 border-b border-gray-700">
            <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-3 xxs:space-y-0">
              <div className="flex items-center space-x-2 xxs:space-x-3">
                <Filter className="h-4 w-4 xxs:h-5 xxs:w-5 text-cyan-400" />
                <h3 className="text-base xxs:text-lg font-semibold text-white">Course Management</h3>
                {statusFilter !== 'all' && (
                  <span className="bg-cyan-500/20 text-cyan-300 text-xs font-medium px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 xxs:space-x-3">
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => {
                      handleStatusFilterChange('all');
                    }}
                    className="flex items-center space-x-1 xxs:space-x-2 px-2 xxs:px-3 py-1 xxs:py-1.5 text-xs xxs:text-sm text-gray-400 hover:text-cyan-400 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                  >
                    <X className="h-3 w-3 xxs:h-4 xxs:w-4" />
                    <span>Clear filters</span>
                  </button>
                )}
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center space-x-1 xxs:space-x-2 px-2 xxs:px-3 py-1 xxs:py-1.5 text-xs xxs:text-sm text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                    title="Clear all filters and reset to default"
                  >
                    <RefreshCw className="h-3 w-3 xxs:h-4 xxs:w-4" />
                    <span>Reset all</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Options */}
          <div className="p-3 xxs:p-4 sm:p-6">
            {/* Search Bar */}
            <div className="mb-4 xxs:mb-6">
              <label className="block text-xs xxs:text-sm font-semibold text-gray-300 mb-2">
                Search Courses
                {searchTerm && (
                  <span className="ml-2 text-cyan-400">
                    ({displayedCourses.length} results)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by title, description, or tags..."
                  className="w-full px-3 xxs:px-4 py-2 xxs:py-3 pl-10 xxs:pl-12 pr-10 xxs:pr-12 bg-gray-800 text-white border-2 border-gray-600 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 text-sm xxs:text-base placeholder-gray-400"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 xxs:pl-4 pointer-events-none">
                  <svg className="h-4 w-4 xxs:h-5 xxs:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 xxs:pr-4 text-gray-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4 xxs:h-5 xxs:w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xxs:grid-cols-1 sm:grid-cols-2 gap-3 xxs:gap-4 sm:gap-6">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-xs xxs:text-sm font-semibold text-gray-300">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="w-full px-3 xxs:px-4 py-2 xxs:py-3 bg-gray-800 text-white border-2 border-gray-600 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 appearance-none text-sm xxs:text-base"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-4 w-4 xxs:h-5 xxs:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Summary */}
            <div className="mt-4 xxs:mt-6 flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-3 xxs:space-y-0">
              <div className="flex items-center space-x-2 xxs:space-x-4">
                <div className="text-xs xxs:text-sm text-gray-400">
                  Showing <span className="font-semibold text-white">{displayedCourses.length}</span> of <span className="font-semibold text-white">{totalItems}</span> courses
                </div>
                {statusFilter !== 'all' && (
                  <div className="flex flex-col xxs:flex-row xxs:items-center space-y-2 xxs:space-y-0 xxs:space-x-2">
                    <span className="text-xs xxs:text-sm text-gray-500">Filtered by:</span>
                    <div className="flex flex-wrap gap-1 xxs:gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                        {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="relative">
          {/* Loading Skeleton Cards for Filtering */}
          {filtering && (
            <div className="grid grid-cols-1 xxs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xxs:gap-4 sm:gap-6 mt-4 xxs:mt-6 sm:mt-8">
              {[...Array(6)].map((_, index) => (
                <div key={`skeleton-${index}`} className="bg-gray-900/80 rounded-lg shadow-sm border overflow-hidden flex flex-col">
                  {/* Skeleton Image */}
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse"></div>
                  </div>
                  
                  {/* Skeleton Content */}
                  <div className="p-3 xxs:p-4 sm:p-6 flex flex-col flex-grow">
                    {/* Skeleton Title */}
                    <div className="h-6 xxs:h-7 bg-gray-800 rounded animate-pulse mb-2"></div>
                    
                    {/* Skeleton Description Lines */}
                    <div className="space-y-2 mb-3 xxs:mb-4 flex-grow">
                      <div className="h-3 bg-gray-800 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-800 rounded animate-pulse w-5/6"></div>
                      <div className="h-3 bg-gray-800 rounded animate-pulse w-4/6"></div>
                    </div>

                    {/* Skeleton Stats */}
                    <div className="flex items-center justify-between mb-3 xxs:mb-4">
                      <div className="h-4 bg-gray-800 rounded animate-pulse w-12"></div>
                      <div className="h-4 bg-gray-800 rounded animate-pulse w-16"></div>
                    </div>

                    {/* Skeleton Checkbox */}
                    <div className="flex items-center space-x-2 mb-3 xxs:mb-4">
                      <div className="h-4 w-4 bg-gray-800 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-800 rounded animate-pulse w-32"></div>
                    </div>

                    {/* Skeleton Action Buttons */}
                    <div className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-2 mt-auto">
                      <div className="flex-1 h-8 xxs:h-9 bg-gray-800 rounded animate-pulse"></div>
                      <div className="flex-1 h-8 xxs:h-9 bg-gray-800 rounded animate-pulse"></div>
                      <div className="flex-1 h-8 xxs:h-9 bg-gray-800 rounded animate-pulse"></div>
                    </div>

                    {/* Skeleton Date */}
                    <div className="mt-3 xxs:mt-4 pt-3 xxs:pt-4 border-t border-gray-700">
                      <div className="h-3 bg-gray-800 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Actual Courses Grid - Hidden during filtering */}
          {!filtering && (
            <div className="grid grid-cols-1 xxs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xxs:gap-4 sm:gap-6 mt-4 xxs:mt-6 sm:mt-8">
            {displayedCourses.map((course) => (
              <div key={course._id} className="bg-gray-900/80 rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
              {/* Course Image */}
              <div className="aspect-video bg-gray-200 relative overflow-hidden">
                {course.thumbnailURL ? (
                  <>
                    {/* Loading state */}
                    <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                      <div className="animate-pulse w-6 h-6 xxs:w-8 xxs:h-8 bg-gray-300 rounded"></div>
                    </div>
                    {/* Actual image */}
                    <img
                      src={course.thumbnailURL}
                      alt={getEnglishText(course.title)}
                      className="w-full h-full object-cover relative z-10"
                      onLoad={(e) => {
                        // Hide loading state when image loads
                        const target = e.target as HTMLImageElement;
                        const loadingState = target.parentElement?.querySelector('.animate-pulse') as HTMLElement;
                        if (loadingState) {
                          loadingState.style.display = 'none';
                        }
                      }}
                      onError={(e) => {
                        // Fallback to placeholder on error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.parentElement?.querySelector('.thumbnail-placeholder') as HTMLElement;
                        if (placeholder) {
                          placeholder.style.display = 'flex';
                        }
                        // Hide loading state
                        const loadingState = target.parentElement?.querySelector('.animate-pulse') as HTMLElement;
                        if (loadingState) {
                          loadingState.style.display = 'none';
                        }
                      }}
                    />
                  </>
                ) : null}
                {/* Placeholder for missing or failed thumbnails */}
                <div 
                  className={`thumbnail-placeholder w-full h-full flex items-center justify-center ${course.thumbnailURL ? 'hidden' : 'flex'}`}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 xxs:w-10 xxs:h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-lg flex items-center justify-center mx-auto mb-1 xxs:mb-2">
                      <BookOpen className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 text-gray-500" />
                    </div>
                    <span className="text-gray-400 text-xs xxs:text-sm">No thumbnail</span>
                  </div>
                </div>
                <div className="absolute top-2 right-2 z-20">
                  <span className={`inline-flex items-center px-2 xxs:px-2.5 py-0.5 xxs:py-1 rounded-md text-xs font-semibold uppercase tracking-wide shadow-lg ${getStatusColor(course.status)}`}>
                    {course.status}
                  </span>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-3 xxs:p-4 sm:p-6 flex flex-col flex-grow">
                <h3 className="text-sm xxs:text-base sm:text-lg font-semibold text-white mb-2 line-clamp-2 h-12 xxs:h-14">
                  {getEnglishText(course.title)}
                </h3>
                <p className="text-gray-400 text-xs xxs:text-sm mb-3 xxs:mb-4 line-clamp-3 flex-grow">
                  {getEnglishText(course.description)}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs xxs:text-sm text-gray-500 mb-3 xxs:mb-4">
                  <span>${course.price || 0}</span>
                  <span>{course.totalEnrollments || 0} enrolled</span>
                </div>

                {/* Featured Checkbox */}
                <div className="flex items-center space-x-2 mb-3 xxs:mb-4">
                  <input
                    type="checkbox"
                    id={`featured-${course._id}`}
                    checked={course.featured || false}
                    onChange={() => handleToggleFeatured(course._id, course.featured || false)}
                    className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                  />
                  <label 
                    htmlFor={`featured-${course._id}`}
                    className="text-xs xxs:text-sm text-gray-300 cursor-pointer"
                  >
                    Show on homepage (max 3)
                  </label>
                </div>

                {/* Actions */}
                <div className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-2 mt-auto">
                  <Link
                    to={`/admin/courses/${course._id}`}
                    className="flex-1 inline-flex items-center justify-center px-2 xxs:px-3 py-2 border border-gray-600 text-xs xxs:text-sm font-medium rounded-lg text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                  >
                    <Eye className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1" />
                    View
                  </Link>
                  <Link
                    to={`/admin/courses/${course._id}/edit`}
                    className="flex-1 inline-flex items-center justify-center px-2 xxs:px-3 py-2 border border-transparent text-xs xxs:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteClick(course)}
                    className="flex-1 inline-flex items-center justify-center px-2 xxs:px-3 py-2 border border-transparent text-xs xxs:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1" />
                    Delete
                  </button>
                </div>

                {/* Created Date */}
                <div className="mt-3 xxs:mt-4 pt-3 xxs:pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Created: {formatDate(course.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
          </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                className="px-3 py-1 bg-gray-800 text-white border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value={6}>6 per page</option>
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                <option value={48}>48 per page</option>
              </select>
            </div>

            {/* Pagination info */}
            <div className="text-sm text-gray-300">
              Page {currentPage} of {totalPages} ({totalItems} total courses)
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700"
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                  }

                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          i === currentPage
                            ? 'text-white bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-500'
                            : 'text-gray-300 bg-gray-800 border border-gray-600 hover:bg-gray-700'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Add last page and ellipsis if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700"
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              {/* Next button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {displayedCourses.length === 0 && !filtering && !loading && (
          <div className="text-center py-8 xxs:py-12">
            <div className="mx-auto h-10 w-10 xxs:h-12 xxs:w-12 text-gray-400">
              <BookOpen className="h-10 w-10 xxs:h-12 xxs:w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-white">No courses found</h3>
            <p className="mt-1 text-xs xxs:text-sm text-gray-500">
              {statusFilter !== 'all' 
                ? 'Try adjusting your filter criteria.'
                : 'Get started by uploading your first course.'
              }
            </p>
            {statusFilter === 'all' && (
              <div className="mt-4 xxs:mt-6">
                <Link
                  to="/admin/upload"
                  className="inline-flex items-center px-3 xxs:px-4 py-2 border border-transparent shadow-sm text-xs xxs:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                >
                  <Plus className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1 xxs:mr-2" />
                  Upload Course
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Results Count */}
        {displayedCourses.length > 0 && (
          <div className="mt-4 xxs:mt-6 text-center text-xs xxs:text-sm text-gray-500">
            Showing {displayedCourses.length} of {totalItems} courses
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && courseToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setCourseToDelete(null);
            setDeletionSummary(null);
          }}
          onConfirm={handleDeleteCourse}
          title="Delete Course"
          message={`Are you sure you want to delete "${getEnglishText(courseToDelete.title)}"? This action cannot be undone and will permanently remove the course, all its videos, and associated files.`}
          confirmText="Delete Course"
          cancelText="Cancel"
          isLoading={isDeleting}
          deletionSummary={loadingSummary ? null : deletionSummary}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminCoursesPage; 