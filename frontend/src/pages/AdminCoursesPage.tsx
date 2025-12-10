import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Upload, Search, Filter, BookOpen, X } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';
import useCourseDeletion from '../hooks/useCourseDeletion';

interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  status: 'active' | 'inactive' | 'archived';
  thumbnailURL?: string;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
}

const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Delete functionality
  const { deleteCourse, isLoading: isDeleting, error: deleteError } = useCourseDeletion();
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Handle course deletion
  const handleDeleteCourse = async (courseId: string) => {
    const success = await deleteCourse(courseId);
    
    if (success) {
      // Remove course from state
      setCourses(prev => prev.filter(course => course._id !== courseId));
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

  // Fetch courses from API
  const fetchCourses = async (page: number = currentPage, limit: number = itemsPerPage) => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        status: statusFilter === 'all' ? 'all' : statusFilter,
        page: page.toString(),
        limit: limit.toString()
      });

      // Add search term if provided
      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }

      const response = await fetch(buildApiUrl(`/api/courses?${queryParams.toString()}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(data.data.courses || []);
      
      // Update pagination info
      if (data.data.pagination) {
        setTotalPages(data.data.pagination.pages);
        setTotalItems(data.data.pagination.total);
        setCurrentPage(data.data.pagination.page);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCourses(page, itemsPerPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    fetchCourses(1, newItemsPerPage);
  };

  // Handle search and filter changes
  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // Reset to first page
  };

  const handleStatusFilterChange = (newStatusFilter: string) => {
    setStatusFilter(newStatusFilter);
    setCurrentPage(1); // Reset to first page
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCourses(1, itemsPerPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  // Use courses directly since filtering is now handled server-side
  const displayedCourses = courses;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm xxs:text-base">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-red-600 mb-4 text-sm xxs:text-base">{error}</p>
          <button 
            onClick={fetchCourses}
            className="bg-red-600 text-white px-3 xxs:px-4 py-2 rounded-lg hover:bg-red-700 text-sm xxs:text-base"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
          <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-4 xxs:space-y-0">
            <div>
              <h1 className="text-2xl xxs:text-3xl font-bold text-gray-900">Course Management</h1>
              <p className="mt-2 text-gray-600 text-sm xxs:text-base">Manage all your courses, upload new content, and track performance</p>
            </div>
            <div className="flex space-x-2 xxs:space-x-3">
              <Link
                to="/admin/upload"
                className="inline-flex items-center px-3 xxs:px-4 py-2 border border-transparent text-xs xxs:text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Filter Header */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-3 xxs:px-4 sm:px-6 py-3 xxs:py-4 border-b border-gray-100">
            <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-3 xxs:space-y-0">
              <div className="flex items-center space-x-2 xxs:space-x-3">
                <Filter className="h-4 w-4 xxs:h-5 xxs:w-5 text-red-600" />
                <h3 className="text-base xxs:text-lg font-semibold text-gray-900">Course Management</h3>
                {(searchTerm || statusFilter !== 'all') && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 xxs:space-x-3">
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      handleSearchChange('');
                      handleStatusFilterChange('all');
                    }}
                    className="flex items-center space-x-1 xxs:space-x-2 px-2 xxs:px-3 py-1 xxs:py-1.5 text-xs xxs:text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <X className="h-3 w-3 xxs:h-4 xxs:w-4" />
                    <span>Clear filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filter Options */}
          <div className="p-3 xxs:p-4 sm:p-6">
            <div className="grid grid-cols-1 xxs:grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 xxs:gap-4 sm:gap-6">
              {/* Search */}
              <div className="xxs:col-span-1 sm:col-span-2 space-y-2">
                <label className="block text-xs xxs:text-sm font-semibold text-gray-700">
                  Search Courses
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 xxs:pl-4 flex items-center pointer-events-none">
                    <Search className="h-3 w-3 xxs:h-4 xxs:w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full pl-8 xxs:pl-10 pr-4 py-2 xxs:py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all duration-200 text-sm xxs:text-base"
                    placeholder="Search by title or description..."
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 xxs:pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-3 w-3 xxs:h-4 xxs:w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="block text-xs xxs:text-sm font-semibold text-gray-700">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="w-full px-3 xxs:px-4 py-2 xxs:py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all duration-200 appearance-none bg-white text-sm xxs:text-base"
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

              {/* Sort */}
              <div className="space-y-2">
                <label className="block text-xs xxs:text-sm font-semibold text-gray-700">
                  Sort By
                </label>
                <div className="relative">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order as 'asc' | 'desc');
                    }}
                    className="w-full px-3 xxs:px-4 py-2 xxs:py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition-all duration-200 appearance-none bg-white text-sm xxs:text-base"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="title-asc">Title A-Z</option>
                    <option value="title-desc">Title Z-A</option>
                    <option value="price-desc">Price High-Low</option>
                    <option value="price-asc">Price Low-High</option>
                    <option value="totalEnrollments-desc">Most Enrolled</option>

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
                <div className="text-xs xxs:text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{displayedCourses.length}</span> of <span className="font-semibold text-gray-900">{totalItems}</span> courses
                </div>
                {(searchTerm || statusFilter !== 'all') && (
                  <div className="flex flex-col xxs:flex-row xxs:items-center space-y-2 xxs:space-y-0 xxs:space-x-2">
                    <span className="text-xs xxs:text-sm text-gray-500">Filtered by:</span>
                    <div className="flex flex-wrap gap-1 xxs:gap-2">
                      {searchTerm && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          "{searchTerm}"
                        </span>
                      )}
                      {statusFilter !== 'all' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 xxs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xxs:gap-4 sm:gap-6 mt-4 xxs:mt-6 sm:mt-8">
          {displayedCourses.map((course) => (
            <div key={course._id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col">
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
                      alt={course.title}
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
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-1.5 xxs:px-2 py-0.5 xxs:py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                    {course.status}
                  </span>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-3 xxs:p-4 sm:p-6 flex flex-col flex-grow">
                <h3 className="text-sm xxs:text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 h-12 xxs:h-14">
                  {course.title}
                </h3>
                <p className="text-gray-600 text-xs xxs:text-sm mb-3 xxs:mb-4 line-clamp-3 flex-grow">
                  {course.description}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs xxs:text-sm text-gray-500 mb-3 xxs:mb-4">
                  <span>${course.price || 0}</span>
                  <span>{course.totalEnrollments || 0} enrolled</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col xxs:flex-row space-y-2 xxs:space-y-0 xxs:space-x-2 mt-auto">
                  <Link
                    to={`/admin/courses/${course._id}`}
                    className="flex-1 inline-flex items-center justify-center px-2 xxs:px-3 py-2 border border-gray-300 text-xs xxs:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                    onClick={() => {
                      setCourseToDelete(course);
                      setShowDeleteModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-2 xxs:px-3 py-2 border border-transparent text-xs xxs:text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1" />
                    Delete
                  </button>
                </div>

                {/* Created Date */}
                <div className="mt-3 xxs:mt-4 pt-3 xxs:pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Created: {formatDate(course.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value={6}>6 per page</option>
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
                <option value={48}>48 per page</option>
              </select>
            </div>

            {/* Pagination info */}
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages} ({totalItems} total courses)
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
                            ? 'text-white bg-red-600 border border-red-600'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
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
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {displayedCourses.length === 0 && (
          <div className="text-center py-8 xxs:py-12">
            <div className="mx-auto h-10 w-10 xxs:h-12 xxs:w-12 text-gray-400">
              <BookOpen className="h-10 w-10 xxs:h-12 xxs:w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
            <p className="mt-1 text-xs xxs:text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by uploading your first course.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="mt-4 xxs:mt-6">
                <Link
                  to="/admin/upload"
                  className="inline-flex items-center px-3 xxs:px-4 py-2 border border-transparent shadow-sm text-xs xxs:text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
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
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            if (courseToDelete) {
              handleDeleteCourse(courseToDelete._id);
              setShowDeleteModal(false);
              setCourseToDelete(null);
            }
          }}
          title="Delete Course"
          message={`Are you sure you want to delete "${courseToDelete.title}"? This action cannot be undone and will permanently remove the course, all its videos, and associated files.`}
          confirmText="Delete Course"
          cancelText="Cancel"
          isLoading={isDeleting}
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