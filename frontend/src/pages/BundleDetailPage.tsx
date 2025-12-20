import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookOpen, ShoppingCart, Tag, CheckCircle, Clock, Users, Play } from 'lucide-react';
import { getBundleById, Bundle } from '../data/mockBundles';
import CourseCard from '../components/CourseCard';
import LoadingMessage from '../components/LoadingMessage';
import { buildApiUrl } from '../config/environment';

// Simplified course interface for bundle display
interface SimplifiedCourse {
  _id: string;
  title: string;
  description: string;
  thumbnailURL?: string;
  price: number;
  totalEnrollments?: number;
  videos?: Array<{ _id: string; duration?: string }>;
  tags?: string[];
}

const BundleDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [courses, setCourses] = useState<SimplifiedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch bundle data (from mock)
  useEffect(() => {
    if (!id) {
      setError(t('bundle_detail.bundle_not_found', 'Bundle not found'));
      setLoading(false);
      return;
    }

    const bundleData = getBundleById(id);
    if (!bundleData) {
      setError(t('bundle_detail.bundle_not_found', 'Bundle not found'));
      setLoading(false);
      return;
    }

    setBundle(bundleData);
    
    // Fetch course details for included courses
    // Note: This is mock data - in real implementation, we'd fetch from API
    fetchIncludedCourses(bundleData.courseIds);
  }, [id, t]);

  // Mock function to fetch course details
  // In real implementation, this would call the API
  const fetchIncludedCourses = async (courseIds: string[]) => {
    try {
      setLoading(true);
      
      // Try to fetch courses from API if available
      // For now, we'll create placeholder courses based on IDs
      const fetchedCourses: SimplifiedCourse[] = [];
      
      for (const courseId of courseIds) {
        try {
          const response = await fetch(buildApiUrl(`/api/courses/${courseId}`));
          if (response.ok) {
            const courseData = await response.json();
            fetchedCourses.push({
              _id: courseData._id || courseId,
              title: courseData.title || `Course ${courseId}`,
              description: courseData.description || '',
              thumbnailURL: courseData.thumbnailURL,
              price: courseData.price || 0,
              totalEnrollments: courseData.totalEnrollments || 0,
              videos: courseData.videos || [],
              tags: courseData.tags || []
            });
          } else {
            // If course not found, create a placeholder
            fetchedCourses.push({
              _id: courseId,
              title: `Course ${courseId}`,
              description: t('bundle_detail.course_placeholder_description', 'This course is included in the bundle.'),
              price: 0,
              totalEnrollments: 0,
              videos: [],
              tags: []
            });
          }
        } catch (err) {
          // Create placeholder if fetch fails
          fetchedCourses.push({
            _id: courseId,
            title: `Course ${courseId}`,
            description: t('bundle_detail.course_placeholder_description', 'This course is included in the bundle.'),
            price: 0,
            totalEnrollments: 0,
            videos: [],
            tags: []
          });
        }
      }
      
      setCourses(fetchedCourses);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(t('bundle_detail.error_loading_courses', 'Error loading courses'));
      setLoading(false);
    }
  };

  // Calculate savings
  const savingsAmount = bundle && bundle.originalValue
    ? bundle.originalValue - bundle.price
    : null;
  const savingsPercentage = bundle && bundle.originalValue
    ? Math.round(((bundle.originalValue - bundle.price) / bundle.originalValue) * 100)
    : null;

  // Handle bundle purchase (placeholder - non-functional)
  const handlePurchase = () => {
    setIsPurchasing(true);
    // TODO: Implement bundle purchase logic when backend is ready
    setTimeout(() => {
      setIsPurchasing(false);
      alert(t('bundle_detail.purchase_placeholder', 'Bundle purchase functionality will be available soon!'));
    }, 1000);
  };

  if (loading) {
    return <LoadingMessage message={t('bundle_detail.loading', 'Loading bundle...')} />;
  }

  if (error || !bundle) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || t('bundle_detail.bundle_not_found', 'Bundle not found')}</h1>
          <Link
            to="/bundles"
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            {t('bundle_detail.back_to_bundles', 'Back to Bundles')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with Back Button */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/bundles"
            className="inline-flex items-center text-cyan-400 hover:text-cyan-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>{t('bundle_detail.back_to_bundles', 'Back to Bundles')}</span>
          </Link>
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                {bundle.title}
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {bundle.longDescription || bundle.description}
              </p>
            </div>

            {/* Included Courses Section */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-400" />
                {t('bundle_detail.included_courses', 'Included Courses')}
                <span className="text-lg sm:text-xl text-gray-400 font-normal">
                  ({bundle.courseIds.length})
                </span>
              </h2>

              {loading ? (
                <LoadingMessage message={t('bundle_detail.loading_courses', 'Loading courses...')} />
              ) : courses.length > 0 ? (
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
                          {course.totalEnrollments !== undefined && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{course.totalEnrollments.toLocaleString()}</span>
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
                    {bundle.courseIds.length} {bundle.courseIds.length === 1 ? t('bundle_detail.course', 'Course') : t('bundle_detail.courses', 'Courses')}
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

              {/* Note */}
              <p className="mt-4 text-xs text-gray-400 text-center">
                {t('bundle_detail.purchase_note', 'This is a placeholder. Purchase functionality will be available soon.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleDetailPage;

