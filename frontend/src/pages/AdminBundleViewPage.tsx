import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { useParams, Link } from 'react-router-dom';
import { Edit, BookOpen, DollarSign, Users, Calendar, Tag } from 'lucide-react';

interface Bundle {
  _id: string;
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  originalValue?: number;
  status: 'active' | 'inactive' | 'archived';
  thumbnailURL?: string;
  category?: string;
  featured?: boolean;
  tags?: string[];
  courseIds: Array<{
    _id: string;
    title: string;
    description: string;
    price: number;
    thumbnailURL?: string;
  }>;
  totalEnrollments: number;
  createdAt: string;
  updatedAt: string;
}

const AdminBundleViewPage: React.FC = () => {
  const { bundleId } = useParams<{ bundleId: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBundle = async () => {
      try {
        setLoading(true);
        const adminToken = localStorage.getItem('adminToken');
        
        if (!adminToken) {
          throw new Error('Admin token not found');
        }

        const response = await fetch(buildApiUrl(`/api/bundles/${bundleId}`), {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bundle');
        }

        const data = await response.json();
        setBundle(data.data.bundle);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bundle');
      } finally {
        setLoading(false);
      }
    };

    if (bundleId) {
      fetchBundle();
    }
  }, [bundleId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading bundle...</p>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-orange-400 mb-4">{error || 'Bundle not found'}</p>
        </div>
      </div>
    );
  }

  const savingsAmount = bundle.originalValue ? bundle.originalValue - bundle.price : 0;
  const savingsPercentage = bundle.originalValue 
    ? Math.round(((bundle.originalValue - bundle.price) / bundle.originalValue) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16 sm:pt-20">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-white">{bundle.title}</h1>
                <p className="text-gray-400 mt-1">Bundle Details</p>
              </div>
            </div>
            <Link
              to={`/admin/bundles/${bundleId}/edit`}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Bundle
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thumbnail */}
            {bundle.thumbnailURL && (
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <img
                  src={bundle.thumbnailURL}
                  alt={bundle.title}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Description */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
              <p className="text-gray-300 leading-relaxed">{bundle.description}</p>
              {bundle.longDescription && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-white mb-2">Detailed Description</h3>
                  <p className="text-gray-300 leading-relaxed">{bundle.longDescription}</p>
                </div>
              )}
            </div>

            {/* Included Courses */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-cyan-400" />
                Included Courses ({bundle.courseIds.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundle.courseIds.map((course) => (
                  <div
                    key={course._id}
                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-cyan-500/50 transition-colors"
                  >
                    <h3 className="text-white font-medium mb-1">{course.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{course.description}</p>
                    <p className="text-cyan-400 text-sm mt-2 font-semibold">${course.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bundle Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-4">Bundle Information</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-bold text-white">
                      ${bundle.price.toFixed(2)}
                    </span>
                    {bundle.originalValue && (
                      <span className="text-lg text-gray-400 line-through">
                        ${bundle.originalValue.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {savingsAmount > 0 && (
                    <p className="text-green-400 text-sm">
                      Save ${savingsAmount.toFixed(2)} ({savingsPercentage}%)
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                    <span>{bundle.courseIds.length} courses</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <span>{bundle.totalEnrollments} enrollments</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                    <span>Created {formatDate(bundle.createdAt)}</span>
                  </div>
                  {bundle.category && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Tag className="h-4 w-4 text-cyan-400" />
                      <span>{bundle.category}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      bundle.status === 'active'
                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                        : bundle.status === 'inactive'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}
                  >
                    {bundle.status}
                  </span>
                  {bundle.featured && (
                    <span className="ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            {bundle.tags && bundle.tags.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {bundle.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm border border-cyan-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBundleViewPage;






