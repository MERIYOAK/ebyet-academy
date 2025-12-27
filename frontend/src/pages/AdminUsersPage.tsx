import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Calendar, 
  X,
  ChevronLeft,
  ChevronRight,
  Phone
} from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  profilePicture?: string;
  purchasedCourses: string[];
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  
  // Account deactivation/reactivation functionality
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [userToReactivate, setUserToReactivate] = useState<User | null>(null);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch users from API
  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        sortBy,
        sortOrder
      });

      const response = await fetch(buildApiUrl(`/api/user/admin/all?${params}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data.users || []);
      setPagination(data.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Handle user deactivation
  const handleDeactivateUser = async (userId: string) => {
    try {
      setIsDeactivating(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/user/admin/${userId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'inactive' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deactivate user');
      }

      // Update user status in state
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, status: 'inactive' } : user
      ));
      setToast({
        message: 'User account deactivated successfully',
        type: 'success'
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to deactivate user',
        type: 'error'
      });
    } finally {
      setIsDeactivating(false);
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
    }
  };

  // Handle user reactivation
  const handleReactivateUser = async (userId: string) => {
    try {
      setIsReactivating(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/user/admin/${userId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reactivate user');
      }

      // Update user status in state
      setUsers(prev => prev.map(user => 
        user._id === userId ? { ...user, status: 'active' } : user
      ));
      setToast({
        message: 'User account reactivated successfully',
        type: 'success'
      });
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to reactivate user',
        type: 'error'
      });
    } finally {
      setIsReactivating(false);
      setShowReactivateModal(false);
      setUserToReactivate(null);
    }
  };

  // Handle search and filters
  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
    fetchUsers(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchUsers(page);
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm xxs:text-base">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-orange-400 mb-4 text-sm xxs:text-base">{error}</p>
          <button 
            onClick={() => fetchUsers(1)}
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
      <div className="bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
          <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-4 xxs:space-y-0">
            <div>
              <h1 className="text-2xl xxs:text-3xl font-bold text-white">User Management</h1>
              <p className="mt-2 text-gray-600 text-sm xxs:text-base">Manage all registered users, view profiles, and control access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
        <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
          {/* Filter Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-3 xxs:px-4 sm:px-6 py-3 xxs:py-4 border-b border-gray-700">
            <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-3 xxs:space-y-0">
              <div className="flex items-center space-x-2 xxs:space-x-3">
                <Filter className="h-4 w-4 xxs:h-5 xxs:w-5 text-cyan-400" />
                <h3 className="text-base xxs:text-lg font-semibold text-white">User Management</h3>
                {(searchTerm || statusFilter !== 'all') && (
                  <span className="bg-cyan-500/20 text-cyan-300 text-xs font-medium px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 xxs:space-x-3">
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center space-x-1 xxs:space-x-2 px-2 xxs:px-3 py-1 xxs:py-1.5 text-xs xxs:text-sm text-gray-400 hover:text-cyan-400 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
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
                <label className="block text-xs xxs:text-sm font-semibold text-gray-300">
                  Search Users
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 xxs:pl-4 flex items-center pointer-events-none">
                    <Search className="h-3 w-3 xxs:h-4 xxs:w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="block w-full pl-8 xxs:pl-10 pr-4 py-2 xxs:py-3 border-2 border-gray-700 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 text-sm xxs:text-base bg-gray-900/80 text-white"
                    placeholder="Search by name or email..."
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
                <label className="block text-sm font-semibold text-gray-300">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 appearance-none bg-gray-800"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
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
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-200 appearance-none bg-gray-800"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="email-asc">Email A-Z</option>
                    <option value="email-desc">Email Z-A</option>
                    <option value="status-asc">Status: Active → Inactive</option>
                    <option value="status-desc">Status: Inactive → Active</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="mt-6">
              <button
                onClick={handleSearch}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-200"
              >
                <Search className="h-4 w-4 mr-2" />
                Search Users
              </button>
            </div>

            {/* Results Summary */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-white">{pagination?.totalUsers || 0}</span> total users
                  {pagination && (
                    <span className="ml-2">
                      (Page {pagination.currentPage} of {pagination.totalPages})
                    </span>
                  )}
                </div>
                {(searchTerm || statusFilter !== 'all') && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Filtered by:</span>
                    <div className="flex flex-wrap gap-2">
                      {searchTerm && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300">
                          "{searchTerm}"
                        </span>
                      )}
                      {statusFilter !== 'all' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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

        {/* Users Grid */}
        <div className="mt-4 xxs:mt-6 sm:mt-8">
          {users.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-gray-800 rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Courses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-900 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {user.profilePicture ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={user.profilePicture}
                                  alt={user.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{user.name}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          <div className="max-w-32 truncate" title={user.phoneNumber || 'N/A'}>
                            {user.phoneNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {user.purchasedCourses?.length || 0} courses
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {user.role !== 'admin' && user.status === 'active' && (
                              <button
                                onClick={() => {
                                  setUserToDeactivate(user);
                                  setShowDeactivateModal(true);
                                }}
                                className="text-orange-600 hover:text-orange-900 transition-colors duration-200 text-sm font-medium"
                                title="Deactivate Account"
                              >
                                Deactivate
                              </button>
                            )}
                            {user.role !== 'admin' && user.status === 'inactive' && (
                              <button
                                onClick={() => {
                                  setUserToReactivate(user);
                                  setShowReactivateModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 transition-colors duration-200 text-sm font-medium"
                                title="Reactivate Account"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3 xxs:space-y-4">
                {users.map((user) => (
                  <div key={user._id} className="bg-gray-800 rounded-lg shadow-sm border p-3 xxs:p-4">
                    <div className="flex items-start space-x-3 xxs:space-x-4">
                      <div className="flex-shrink-0 h-10 w-10 xxs:h-12 xxs:w-12">
                        {user.profilePicture ? (
                          <img
                            className="h-10 w-10 xxs:h-12 xxs:w-12 rounded-full object-cover"
                            src={user.profilePicture}
                            alt={user.name}
                          />
                        ) : (
                          <div className="h-10 w-10 xxs:h-12 xxs:w-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 xxs:h-6 xxs:w-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm xxs:text-base font-medium text-white truncate">{user.name}</h3>
                          <div className="flex items-center space-x-1 xxs:space-x-2">
                            {user.role !== 'admin' && user.status === 'active' && (
                              <button
                                onClick={() => {
                                  setUserToDeactivate(user);
                                  setShowDeactivateModal(true);
                                }}
                                className="text-orange-600 hover:text-orange-900 transition-colors duration-200 text-xs xxs:text-sm font-medium px-2 py-1"
                                title="Deactivate Account"
                              >
                                Deactivate
                              </button>
                            )}
                            {user.role !== 'admin' && user.status === 'inactive' && (
                              <button
                                onClick={() => {
                                  setUserToReactivate(user);
                                  setShowReactivateModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 transition-colors duration-200 text-xs xxs:text-sm font-medium px-2 py-1"
                                title="Reactivate Account"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs xxs:text-sm text-gray-500 flex items-center mb-2">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="text-xs xxs:text-sm text-gray-500 flex items-center mb-2">
                          <Phone className="h-3 w-3 mr-1" />
                          <span className="truncate">{user.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 xxs:gap-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            {user.status}
                          </span>
                          <span className="text-xs xxs:text-sm text-gray-500">
                            {user.purchasedCourses?.length || 0} courses
                          </span>
                        </div>
                        <div className="mt-2 xxs:mt-3 text-xs xxs:text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 xxs:py-12">
              <div className="mx-auto h-10 w-10 xxs:h-12 xxs:w-12 text-gray-400">
                <Users className="h-10 w-10 xxs:h-12 xxs:w-12" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-white">No users found</h3>
              <p className="mt-1 text-xs xxs:text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No users have registered yet.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 xxs:mt-6 flex items-center justify-between">
            <div className="flex-1 flex justify-between md:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className="relative inline-flex items-center px-3 xxs:px-4 py-2 border border-gray-300 text-xs xxs:text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className="ml-2 xxs:ml-3 relative inline-flex items-center px-3 xxs:px-4 py-2 border border-gray-300 text-xs xxs:text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden md:flex-1 md:flex md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-300">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * limit + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * limit, pagination.totalUsers)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.totalUsers}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === currentPage
                            ? 'z-10 bg-orange-500/20 border-orange-500 text-orange-400'
                            : 'bg-gray-800 border-gray-300 text-gray-500 hover:bg-gray-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && userToDeactivate && (
        <DeleteConfirmationModal
          isOpen={showDeactivateModal}
          onClose={() => setShowDeactivateModal(false)}
          onConfirm={() => handleDeactivateUser(userToDeactivate._id)}
          title="Deactivate Account"
          message={`Are you sure you want to deactivate "${userToDeactivate.name}"'s account? The user will not be able to log in, but their data will be preserved.`}
          confirmText="Deactivate Account"
          cancelText="Cancel"
          isLoading={isDeactivating}
        />
      )}

      {/* Reactivate Confirmation Modal */}
      {showReactivateModal && userToReactivate && (
        <DeleteConfirmationModal
          isOpen={showReactivateModal}
          onClose={() => setShowReactivateModal(false)}
          onConfirm={() => handleReactivateUser(userToReactivate._id)}
          title="Reactivate Account"
          message={`Are you sure you want to reactivate "${userToReactivate.name}"'s account? The user will regain access to their account and all purchased courses.`}
          confirmText="Reactivate Account"
          cancelText="Cancel"
          isLoading={isReactivating}
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

export default AdminUsersPage; 