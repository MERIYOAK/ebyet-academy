import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ShoppingCart, Tag, CheckCircle, Clock, Play } from 'lucide-react';
import LoadingMessage from '../components/LoadingMessage';
import { buildApiUrl } from '../config/environment';
import { useBundle, ApiBundle } from '../hooks/useBundles';

const BundleDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch bundle data from API
  const { 
    data: bundleData, 
    isLoading: loading, 
    error: apiError 
  } = useBundle(id || '');

  // Extract bundle and courses from API response
  const bundle = useMemo(() => {
    if (bundleData) {
      return bundleData;
    }
    return null;
  }, [bundleData]);

  const courses = useMemo(() => {
    if (bundle?.courseIds) {
      return bundle.courseIds.map(course => ({
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnailURL: course.thumbnailURL,
        price: course.price,
        totalEnrollments: course.totalEnrollments,
        videos: course.videos || [],
        tags: course.tags || []
      }));
    }
    return [];
  }, [bundle]);

  const error = useMemo(() => {
    if (apiError) {
      return apiError.message || t('bundle_detail.bundle_not_found', 'Bundle not found');
    }
    if (!loading && !bundle && id) {
      return t('bundle_detail.bundle_not_found', 'Bundle not found');
    }
    return null;
  }, [apiError, loading, bundle, id, t]);

  // Calculate savings
  const savingsAmount = bundle && bundle.originalValue
    ? bundle.originalValue - bundle.price
    : null;
  const savingsPercentage = bundle && bundle.originalValue
    ? Math.round(((bundle.originalValue - bundle.price) / bundle.originalValue) * 100)
    : null;

  // Handle bundle purchase
  const handlePurchase = async () => {
    if (!bundle || !id) return;

    try {
      setIsPurchasing(true);

      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login if not authenticated
        navigate('/login', { state: { from: `/bundles/${id}` } });
        return;
      }

      const response = await fetch(buildApiUrl('/api/payment/create-checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bundleId: id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      console.log('✅ Checkout session created:', data);
      
      // Store session info for potential failure handling
      sessionStorage.setItem('stripeSessionId', data.sessionId || 'unknown');
      sessionStorage.setItem('checkoutStartTime', Date.now().toString());
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('❌ Purchase error:', error);
      alert(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (loading) {
    return <LoadingMessage message={t('bundle_detail.loading', 'Loading bundle...')} />;
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || t('bundle_detail.bundle_not_found', 'Bundle not found')}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Bundle Title and Description */}
            <div className="mb-8">
              {bundle.category && (
                <span className="inline-block bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-semibold mb-4 border border-cyan-500/30">
                  {bundle.category}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 pb-2 sm:pb-3 md:pb-4">
                {bundle.title}
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {bundle.longDescription || bundle.description}
              </p>
            </div>

            {/* Included Courses Section */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 pb-2 sm:pb-3 flex items-center gap-2">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-400" />
                {t('bundle_detail.included_courses', 'Included Courses')}
                <span className="text-lg sm:text-xl text-gray-400 font-normal">
                  ({courses.length})
                </span>
              </h2>

              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-cyan-500/50 transition-all"
                    >
                      <Link to={`/course/${course._id}`} className="block">
                        <h3 className="text-xl font-bold text-white mb-2 hover:text-cyan-400 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          {course.videos && course.videos.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Play className="h-4 w-4" />
                              <span>{course.videos.length} {t('bundle_detail.lessons', 'lessons')}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {t('bundle_detail.no_courses_available', 'Course details are not available at this time.')}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-700 sticky top-8">
              {/* Price Section */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl sm:text-5xl font-bold text-white">
                    ${bundle.price.toFixed(2)}
                  </span>
                  {bundle.originalValue && (
                    <span className="text-xl text-gray-400 line-through">
                      ${bundle.originalValue.toFixed(2)}
                    </span>
                  )}
                </div>
                {savingsAmount && savingsPercentage && (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">
                      {t('bundle_detail.save_amount', { amount: savingsAmount.toFixed(2), percentage: savingsPercentage }, `Save $${savingsAmount.toFixed(2)} (${savingsPercentage}%)`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Bundle Info */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2 text-gray-300">
                  <BookOpen className="h-5 w-5 text-cyan-400" />
                  <span>
                    {courses.length} {courses.length === 1 ? t('bundle_detail.course', 'Course') : t('bundle_detail.courses', 'Courses')}
                  </span>
                </div>
                {bundle.originalValue && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Tag className="h-5 w-5 text-cyan-400" />
                    <span>
                      {t('bundle_detail.original_value', { value: bundle.originalValue.toFixed(2) }, `Original Value: $${bundle.originalValue.toFixed(2)}`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Purchase Button */}
              {!bundle?.userHasPurchased && (
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2 text-base sm:text-lg disabled:cursor-not-allowed"
                >
                  {isPurchasing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('bundle_detail.processing', 'Processing...')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      <span>{t('bundle_detail.buy_bundle', 'Buy Bundle')}</span>
                    </>
                  )}
                </button>
              )}

              {/* Show purchase status if already purchased */}
              {bundle?.userHasPurchased && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <p className="text-sm text-green-400 font-semibold">
                    {t('bundle_detail.already_purchased', 'You already own this bundle')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleDetailPage;





