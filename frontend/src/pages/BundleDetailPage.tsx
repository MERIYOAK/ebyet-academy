import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ShoppingCart, Tag, CheckCircle, Clock, Play, X } from 'lucide-react';
import LoadingMessage from '../components/LoadingMessage';
import { buildApiUrl } from '../config/environment';
import { useBundle, ApiBundle } from '../hooks/useBundles';
import { getLocalizedText } from '../utils/bilingualHelper';

const BundleDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language || 'en') as 'en' | 'tg';
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
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{error || t('bundle_detail.bundle_not_found', 'Bundle not found')}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header with Bundle Thumbnail */}
      {bundle.thumbnailURL && (
        <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
          <img
            src={bundle.thumbnailURL}
            alt={getLocalizedText(bundle.title, currentLanguage)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 dark:via-gray-900/50 to-white dark:to-gray-900"></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Bundle Title and Description */}
            <div className="mb-8">
              {/* Category and Featured Badge */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {bundle.category && (
                  <span className="inline-block bg-cyan-500/20 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 px-3 py-1 rounded-full text-sm font-semibold border border-cyan-500/30 dark:border-cyan-500/30">
                    {bundle.category}
                  </span>
                )}
                {bundle.featured && (
                  <span className="inline-block bg-yellow-500/20 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold border border-yellow-500/30 dark:border-yellow-500/30 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {t('bundle_detail.featured', 'Featured')}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 pb-2 sm:pb-3 md:pb-4 text-gray-900 dark:text-white">
                {getLocalizedText(bundle.title, currentLanguage)}
              </h1>

              {/* Short Description */}
              {bundle.description && (
                <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-4">
                  {getLocalizedText(bundle.description, currentLanguage)}
                </p>
              )}

              {/* Long Description */}
              {bundle.longDescription && bundle.longDescription !== bundle.description && (
                <div className="mt-4">
                  <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed whitespace-pre-line">
                    {getLocalizedText(bundle.longDescription, currentLanguage)}
                  </p>
                </div>
              )}

              {/* Tags */}
              {bundle.tags && bundle.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {bundle.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm border border-gray-300 dark:border-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Included Courses Section */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 pb-2 sm:pb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-600 dark:text-cyan-400" />
                {t('bundle_detail.included_courses', 'Included Courses')}
                <span className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 font-normal">
                  ({courses.length})
                </span>
              </h2>

              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all shadow-sm dark:shadow-none"
                    >
                      <Link to={`/course/${course._id}`} className="block">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                          {getLocalizedText(course.title, currentLanguage)}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                          {getLocalizedText(course.description, currentLanguage)}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  {t('bundle_detail.no_courses_available', 'Course details are not available at this time.')}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-2xl p-6 sm:p-8 border border-blue-200 dark:border-gray-700 sticky top-8 shadow-lg dark:shadow-none">
              {/* Price Section */}
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                    ${bundle.price.toFixed(2)}
                  </span>
                  {bundle.originalValue && (
                    <span className="text-xl text-gray-600 dark:text-gray-400 line-through">
                      ${bundle.originalValue.toFixed(2)}
                    </span>
                  )}
                </div>
                {savingsAmount && savingsPercentage && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">
                      {t('bundle_detail.save_amount', { amount: savingsAmount.toFixed(2), percentage: savingsPercentage }, `Save $${savingsAmount.toFixed(2)} (${savingsPercentage}%)`)}
                    </span>
                  </div>
                )}
              </div>

              {/* Bundle Info */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300">
                  <BookOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  <span>
                    {courses.length} {courses.length === 1 ? t('bundle_detail.course', 'Course') : t('bundle_detail.courses', 'Courses')}
                  </span>
                </div>
                {bundle.originalValue && (
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300">
                    <Tag className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      {t('bundle_detail.original_value', { value: bundle.originalValue.toFixed(2) }, `Original Value: $${bundle.originalValue.toFixed(2)}`)}
                    </span>
                  </div>
                )}
                {bundle.totalEnrollments !== undefined && bundle.totalEnrollments > 0 && (
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-300">
                    <CheckCircle className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      {bundle.totalEnrollments} {bundle.totalEnrollments === 1 ? t('bundle_detail.student', 'Student') : t('bundle_detail.students', 'Students')}
                    </span>
                  </div>
                )}
                {bundle.maxEnrollments !== undefined && bundle.maxEnrollments !== null && bundle.maxEnrollments > 0 && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>
                      {t('bundle_detail.max_enrollments', { max: bundle.maxEnrollments }, `Limited to ${bundle.maxEnrollments} students`)}
                    </span>
                  </div>
                )}
                {bundle.hasReachedMaxEnrollments && !(bundle?.isPurchased || bundle?.userHasPurchased) && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-semibold">
                    <X className="h-4 w-4" />
                    <span>{t('bundle_detail.sold_out', 'Sold Out')}</span>
                  </div>
                )}
                {(bundle?.isPurchased || bundle?.userHasPurchased) && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t('bundle_card.purchased', 'Purchased')}</span>
                  </div>
                )}
              </div>

              {/* Purchase/Continue Button */}
              {(bundle?.isPurchased || bundle?.userHasPurchased) ? (
                <Link to="/dashboard" className="block w-full">
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2 text-base sm:text-lg border border-green-500"
                  >
                    <Play className="h-5 w-5" />
                    <span>{t('bundle_card.continue_learning', 'Continue Learning')}</span>
                  </button>
                </Link>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing || bundle.hasReachedMaxEnrollments}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 sm:py-4 px-6 rounded-lg transition-all duration-500 ease-in-out transform hover:scale-105 hover:-translate-y-1 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2 text-base sm:text-lg disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isPurchasing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('bundle_detail.processing', 'Processing...')}</span>
                    </>
                  ) : bundle.hasReachedMaxEnrollments ? (
                    <>
                      <X className="h-5 w-5" />
                      <span>{t('bundle_detail.sold_out', 'Sold Out')}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      <span>{t('bundle_detail.buy_bundle', 'Buy Bundle')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleDetailPage;





