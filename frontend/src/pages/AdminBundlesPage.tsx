import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Search, Filter, BookOpen, X } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';

interface Bundle {
  _id: string;
  title: string;
  description: string;
  price: number;
  originalValue?: number;
  status: 'active' | 'inactive' | 'archived';
  thumbnailURL?: string;
  category?: string;
  featured?: boolean;
  courseIds: Array<{ _id: string; title: string }>;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
}

const AdminBundlesPage: React.FC = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Delete functionality
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch bundles from API
  const fetchBundles = async (page: number = currentPage, limit: number = itemsPerPage) => {
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

      // Add category filter if provided
      if (categoryFilter) {
        queryParams.append('category', categoryFilter);
      }

      const response = await fetch(buildApiUrl(`/api/bundles?${queryParams.toString()}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bundles');
      }

      const data = await response.json();
      setBundles(data.data.bundles || []);
      
      // Update pagination info
      if (data.data.pagination) {
        setTotalPages(data.data.pagination.pages);
        setTotalItems(data.data.pagination.total);
      } else {
        setTotalPages(1);
        setTotalItems(data.data.bundles?.length || 0);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching bundles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bundles');
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, [currentPage, itemsPerPage, statusFilter, categoryFilter, searchTerm]);

  // Handle bundle deletion
  const handleDeleteBundle = async (bundleId: string) => {
    try {
      setIsDeleting(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/bundles/${bundleId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete bundle');
      }

      // Remove bundle from state
      setBundles(prev => prev.filter(bundle => bundle._id !== bundleId));
      setToast({
        message: 'Bundle deleted successfully',
        type: 'success'
      });
      setShowDeleteModal(false);
      setBundleToDelete(null);
      
      // Refresh the list
      fetchBundles();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete bundle',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique categories from bundles
  const categories = Array.from(new Set(bundles.map(b => b.category).filter(Boolean))) as string[];

  // Filter bundles based on search and filters
  const filteredBundles = bundles.filter(bundle => {
    const matchesSearch = !searchTerm || 
      bundle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || bundle.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Sort bundles
  const sortedBundles = [...filteredBundles].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Bundle];
    let bValue: any = b[sortBy as keyof Bundle];
    
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate bundles
  const paginatedBundles = sortedBundles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || categoryFilter;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  if (loading && bundles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gray-800 shadow-lg border-b border-gray-700 mb-6 rounded-lg">
          <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Bundle Management</h1>
              <p className="text-gray-400 text-sm mt-1">Manage course bundles</p>
            </div>
            <Link
              to="/admin/bundles/upload"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/40"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Bundle
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 shadow-lg border border-gray-700 rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Filters</h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bundles..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
                className="px-4 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="price-asc">Price Low-High</option>
                <option value="price-desc">Price High-Low</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Showing <span className="font-semibold text-white">{paginatedBundles.length}</span> of{' '}
                <span className="font-semibold text-white">{filteredBundles.length}</span> bundles
              </span>
              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  {statusFilter !== 'all' && (
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                      Status: {statusFilter}
                    </span>
                  )}
                  {categoryFilter && (
                    <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded text-xs">
                      Category: {categoryFilter}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg p-4 mb-6">
            <p>{error}</p>
            <button
              onClick={() => fetchBundles()}
              className="mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Bundles Grid */}
        {paginatedBundles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedBundles.map((bundle) => (
              <div
                key={bundle._id}
                className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm hover:border-cyan-500/50 transition-all overflow-hidden"
              >
                {/* Thumbnail */}
                {bundle.thumbnailURL ? (
                  <img
                    src={bundle.thumbnailURL}
                    alt={bundle.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-cyan-400/50" />
                  </div>
                )}

                <div className="p-4">
                  {/* Title and Status */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1">
                      {bundle.title}
                    </h3>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        bundle.status === 'active'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                          : bundle.status === 'inactive'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      }`}
                    >
                      {bundle.status}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {bundle.description}
                  </p>

                  {/* Bundle Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {bundle.courseIds.length} courses
                    </span>
                    {bundle.totalEnrollments > 0 && (
                      <span>{bundle.totalEnrollments} enrollments</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        ${bundle.price.toFixed(2)}
                      </span>
                      {bundle.originalValue && (
                        <span className="text-sm text-gray-400 line-through">
                          ${bundle.originalValue.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/bundles/${bundle._id}`}
                      className="flex-1 px-3 py-2 border border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700/50 rounded-lg text-sm font-medium transition-colors text-center"
                    >
                      <Eye className="h-4 w-4 inline mr-1" />
                      View
                    </Link>
                    <Link
                      to={`/admin/bundles/${bundle._id}/edit`}
                      className="flex-1 px-3 py-2 border border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700/50 rounded-lg text-sm font-medium transition-colors text-center"
                    >
                      <Edit className="h-4 w-4 inline mr-1" />
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        setBundleToDelete(bundle);
                        setShowDeleteModal(true);
                      }}
                      className="px-3 py-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              {hasActiveFilters ? 'No bundles match your filters' : 'No bundles found'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-900/80 border border-gray-300 rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-900/80 border border-gray-300 rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && bundleToDelete && (
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setBundleToDelete(null);
            }}
            onConfirm={() => bundleToDelete && handleDeleteBundle(bundleToDelete._id)}
            itemName={bundleToDelete.title}
            itemType="bundle"
            isDeleting={isDeleting}
          />
        )}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminBundlesPage;






