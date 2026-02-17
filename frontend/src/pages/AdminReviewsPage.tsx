import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, CheckCircle, XCircle, MessageSquare, Trash2 } from 'lucide-react';
import { buildApiUrl } from '../config/environment';

interface Review {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  courseId: {
    _id: string;
    title: string;
  };
  rating: number;
  title?: string;
  comment: string;
  adminReply?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface ReviewStats {
  byStatus: Array<{ _id: string; count: number }>;
  byRating: Array<{ _id: number; count: number }>;
  totalReviews: number;
}

const AdminReviewsPage: React.FC = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false); // Separate state for filtering
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [filters, setFilters] = useState({
    status: '',
    rating: '',
    courseId: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 20
  });

  // Helper function to get display text from bilingual objects
  const getDisplayText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (typeof text === 'object' && text.en) return text.en;
    return String(text);
  };

  const fetchReviews = async () => {
    try {
      // Only show filtering state for subsequent loads, not initial load
      if (reviews.length > 0) {
        setFiltering(true);
      }
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.rating && { rating: filters.rating }),
        ...(filters.courseId && { courseId: filters.courseId }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(buildApiUrl(`/api/admin/reviews?${params}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReviews(data.data.reviews);
        setPagination(prev => ({
          ...prev,
          current: data.data.pagination.current,
          pages: data.data.pagination.pages,
          total: data.data.pagination.total
        }));
      } else {
        console.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/admin/reviews/stats'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/admin/reviews/${reviewId}/approve`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        // Update review status locally instead of refetching
        setReviews(prevReviews => 
          prevReviews.map(review => 
            review._id === reviewId 
              ? { ...review, status: 'approved' as const }
              : review
          )
        );
        fetchStats(); // Still update stats
      }
    } catch (error) {
      console.error('Error approving review:', error);
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/admin/reviews/${reviewId}/reject`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        // Update review status locally instead of refetching
        setReviews(prevReviews => 
          prevReviews.map(review => 
            review._id === reviewId 
              ? { ...review, status: 'rejected' as const }
              : review
          )
        );
        fetchStats(); // Still update stats
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(buildApiUrl(`/api/admin/reviews/${reviewId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        fetchReviews();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [filters, pagination.current]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;

    const charCount = replyText.trim().length;
    if (charCount > 150) {
      alert(`Reply exceeds maximum character limit. Current: ${charCount} characters, Maximum: 150 characters`);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/api/admin/reviews/${reviewId}/reply`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reply: replyText.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        // Update review with admin reply locally
        setReviews(prevReviews => 
          prevReviews.map(review => 
            review._id === reviewId 
              ? { ...review, adminReply: replyText.trim(), adminReplyAt: new Date().toISOString() }
              : review
          )
        );
        // Reset reply form
        setReplyingTo(null);
        setReplyText('');
        alert('Reply submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to submit reply');
      }
    } catch (error) {
      console.error('Error replying to review:', error);
      alert('Failed to submit reply. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Review Management
          </h1>
          <p className="text-sm sm:text-base text-gray-300">
            Manage student reviews and testimonials
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
              <div className="text-2xl font-bold text-blue-400">{stats.totalReviews}</div>
              <div className="text-sm text-gray-400">Total Reviews</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
              <div className="text-2xl font-bold text-green-400">
                {stats.byStatus.find(s => s._id === 'approved')?.count || 0}
              </div>
              <div className="text-sm text-gray-400">Approved</div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.byStatus.find(s => s._id === 'pending')?.count || 0}
              </div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow border border-gray-700 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white transition-colors duration-200"
              >
                <option value="" className="bg-gray-700 text-white">All Status</option>
                <option value="pending" className="bg-gray-700 text-white">Pending</option>
                <option value="approved" className="bg-gray-700 text-white">Approved</option>
                <option value="rejected" className="bg-gray-700 text-white">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white transition-colors duration-200"
              >
                <option value="" className="bg-gray-700 text-white">All Ratings</option>
                <option value="5" className="bg-gray-700 text-white">5 Stars</option>
                <option value="4" className="bg-gray-700 text-white">4 Stars</option>
                <option value="3" className="bg-gray-700 text-white">3 Stars</option>
                <option value="2" className="bg-gray-700 text-white">2 Stars</option>
                <option value="1" className="bg-gray-700 text-white">1 Star</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course ID
              </label>
              <input
                type="text"
                value={filters.courseId}
                onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                placeholder="Enter course ID..."
                className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400 transition-colors duration-200"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchReviews}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Apply Filters
              </button>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    status: '',
                    rating: '',
                    courseId: '',
                    search: ''
                  });
                  setPagination({ ...pagination, current: 1 });
                  setTimeout(fetchReviews, 0);
                }}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Search Status */}
          <div className="mt-4 flex justify-end">
            <div className="text-sm text-gray-400">
              {loading ? 'Searching...' : `${pagination.total} reviews found`}
            </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-gray-800 rounded-lg shadow border border-gray-700 overflow-hidden relative">
          {/* Loading Overlay */}
          {filtering && (
            <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <span className="text-sm text-gray-300">Filtering reviews...</span>
              </div>
            </div>
          )}
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Review
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        <div className="font-medium">{getDisplayText(review.userId.name)}</div>
                        <div className="text-gray-400">{review.userId.email}</div>
                        {review.title && (
                          <div className="font-medium text-gray-200 mt-1">
                            {getDisplayText(review.title)}
                          </div>
                        )}
                        <div className="text-gray-300 mt-2 line-clamp-3">
                          {getDisplayText(review.comment)}
                        </div>
                        
                        {/* Admin Reply */}
                        {review.adminReply && (
                          <div className="mt-3 p-3 bg-blue-900 bg-opacity-20 border-l-4 border-blue-500 rounded">
                            <div className="flex items-start space-x-2">
                              <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-xs font-medium text-blue-400 mb-1">Admin Reply</div>
                                <div className="text-sm text-gray-200">{review.adminReply}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Reply Button */}
                        {!review.adminReply && (
                          <button
                            onClick={() => {
                              setReplyingTo(review._id);
                              setReplyText('');
                            }}
                            className="mt-3 flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Reply (150 characters max)</span>
                          </button>
                        )}
                        
                        {/* Reply Form */}
                        {replyingTo === review._id && (
                          <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                            <textarea
                              value={replyText}
                              onChange={(e) => {
                                if (e.target.value.length <= 150) {
                                  setReplyText(e.target.value);
                                }
                              }}
                              placeholder="Write your reply (max 150 characters)..."
                              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-600 text-white placeholder-gray-400 resize-none"
                              rows={4}
                              maxLength={150}
                            />
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mt-2">
                              <span className={`text-xs ${
                                replyText.length > 150 
                                  ? 'text-red-400' 
                                  : replyText.length > 120 
                                    ? 'text-yellow-400' 
                                    : 'text-gray-400'
                              }`}>
                                {replyText.length}/150 characters
                                {replyText.length > 150 && ' (exceeds limit)'}
                              </span>
                              <div className="flex space-x-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleReply(review._id)}
                                  disabled={!replyText.trim() || replyText.trim().length > 150 || replyText.trim().length === 0}
                                  className="flex-1 sm:flex-none px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                                >
                                  Send Reply
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText('');
                                  }}
                                  className="flex-1 sm:flex-none px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Course: {getDisplayText(review.courseId?.title)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderStars(review.rating)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(review.status)}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {review.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(review._id)}
                              className="p-1 text-green-500 hover:text-green-400 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(review._id)}
                              className="p-1 text-red-500 hover:text-red-400 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {review.status === 'approved' && (
                          <>
                            {/* No feature button - removed */}
                          </>
                        )}
                        
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="p-1 text-red-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {reviews.map((review) => (
              <div key={review._id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-col space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{getDisplayText(review.userId.name)}</div>
                      <div className="text-xs text-gray-400 truncate">{review.userId.email}</div>
                    </div>
                    <div className="flex flex-col items-end space-y-2 flex-shrink-0 ml-2">
                      {renderStars(review.rating)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(review.status)}`}>
                        {review.status}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  {review.title && (
                    <div className="font-medium text-gray-200">
                      {getDisplayText(review.title)}
                    </div>
                  )}

                  {/* Comment */}
                  <div className="text-sm text-gray-300 break-words">
                    {getDisplayText(review.comment)}
                  </div>

                  {/* Course */}
                  <div className="text-xs text-gray-500">
                    Course: {getDisplayText(review.courseId.title)}
                  </div>

                  {/* Admin Reply */}
                  {review.adminReply && (
                    <div className="p-3 bg-blue-900 bg-opacity-20 border-l-4 border-blue-500 rounded">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-blue-400 mb-1">Admin Reply</div>
                          <div className="text-sm text-gray-200 break-words">{review.adminReply}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reply Button */}
                  {!review.adminReply && (
                    <button
                      onClick={() => {
                        setReplyingTo(review._id);
                        setReplyText('');
                      }}
                      className="flex items-center justify-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors py-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Reply (150 characters max)</span>
                    </button>
                  )}

                  {/* Reply Form */}
                  {replyingTo === review._id && (
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <textarea
                        value={replyText}
                        onChange={(e) => {
                          if (e.target.value.length <= 150) {
                            setReplyText(e.target.value);
                          }
                        }}
                        placeholder="Write your reply (max 150 characters)..."
                        className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-600 text-white placeholder-gray-400 resize-none"
                        rows={4}
                        maxLength={150}
                      />
                      <div className="flex flex-col gap-2 mt-2">
                        <span className={`text-xs ${
                          replyText.length > 150 
                            ? 'text-red-400' 
                            : replyText.length > 120 
                              ? 'text-yellow-400' 
                              : 'text-gray-400'
                        }`}>
                          {replyText.length}/150 characters
                          {replyText.length > 150 && ' (exceeds limit)'}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReply(review._id)}
                            disabled={!replyText.trim() || replyText.trim().length > 150 || replyText.trim().length === 0}
                            className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                          >
                            Send Reply
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="flex-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-700">
                    {review.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(review._id)}
                          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(review._id)}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(review._id)}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-300 text-center sm:text-left">
                  Showing {((pagination.current - 1) * pagination.limit) + 1} to {Math.min(pagination.current * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, current: Math.max(1, pagination.current - 1) })}
                    disabled={pagination.current === 1}
                    className="px-3 py-1 text-xs sm:text-sm border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  >
                    Previous
                  </button>
                  <span className="text-xs sm:text-sm text-gray-300">
                    Page {pagination.current} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, current: Math.min(pagination.pages, pagination.current + 1) })}
                    disabled={pagination.current === pagination.pages}
                    className="px-3 py-1 text-xs sm:text-sm border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReviewsPage;
