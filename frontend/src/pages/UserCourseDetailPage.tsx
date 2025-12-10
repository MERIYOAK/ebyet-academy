import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, BookOpen, CheckCircle, Users, ArrowLeft, Award } from 'lucide-react';
import WhatsAppGroupButton from '../components/WhatsAppGroupButton';
import { buildApiUrl } from '../config/environment';
import { formatDuration } from '../utils/durationFormatter';

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnailURL?: string;
  price: number;
  category?: string;
  level?: string;
  tags?: string[];
  totalEnrollments?: number;
  videos?: Array<{ _id: string; title: string; duration?: number; description?: string }>;
  hasWhatsappGroup?: boolean;
  userHasPurchased?: boolean;
}

const UserCourseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Fetch course data
        const courseRes = await fetch(buildApiUrl(`/api/courses/${id}`), { headers });
        if (!courseRes.ok) {
          throw new Error(t('course_detail.failed_to_load_course'));
        }
        const courseData = await courseRes.json();
        const course = courseData?.data?.course || courseData;
        
        // Fetch videos data to get userHasPurchased status (same as VideoPlayerPage)
        const videosRes = await fetch(buildApiUrl(`/api/videos/course/${id}/version/1`), { headers });
        let userHasPurchased = false;
        if (videosRes.ok) {
          const videosData = await videosRes.json();
          userHasPurchased = videosData.data?.userHasPurchased || false;
        }
        
        // Combine course data with purchase status
        const combinedCourseData = {
          ...course,
          userHasPurchased
        };
        
        
        setCourse(combinedCourseData);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('course_detail.unknown_error'));
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const totalDuration = useMemo(() => {
    if (!course?.videos) return 0;
    return course.videos.reduce((sum, v) => sum + (v.duration || 0), 0);
  }, [course?.videos]);

  // Using the centralized formatDuration utility

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('course_detail.loading_course')}</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || t('course_detail.course_not_found')}</p>
          <Link to="/dashboard" className="text-red-600 hover:text-red-700 font-semibold">{t('course_detail.back_to_dashboard')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-red-600"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('course_detail.back_to_dashboard')}</span>
          </button>
        </div>

        {/* Hero card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 p-6 sm:p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {course.category && (
                  <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-semibold border border-red-100">{course.category}</span>
                )}
                {course.level && (
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100">{course.level}</span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{course.title}</h1>
              <p className="text-gray-600 leading-relaxed mb-6">{course.description}</p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center space-x-2 text-gray-700">
                  <Clock className="h-5 w-5 text-red-600" />
                  <span className="font-semibold">{formatDuration(totalDuration)}</span>
                  <span className="text-gray-500 text-sm ml-1">{t('course_detail.total')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <BookOpen className="h-5 w-5 text-red-600" />
                  <span className="font-semibold">{course.videos?.length || 0}</span>
                  <span className="text-gray-500 text-sm ml-1">{t('course_detail.lessons')}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-700">
                  <Users className="h-5 w-5 text-red-600" />
                  <span className="font-semibold">{course.totalEnrollments || 0}</span>
                  <span className="text-gray-500 text-sm ml-1">{t('course_detail.students')}</span>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-white border-l border-gray-100">
              {course.thumbnailURL ? (
                <img src={course.thumbnailURL} alt={course.title} className="w-full h-40 object-cover rounded-xl shadow" />
              ) : (
                <div className="w-full h-40 rounded-xl bg-gray-100 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="mt-4">
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">{t('course_detail.purchased_course')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('course_detail.course_curriculum')}</h2>
              {course.videos && course.videos.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {course.videos.map((v, idx) => (
                    <div key={v._id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-gray-500 text-sm">{idx + 1}.</span>
                        <div>
                          <div className="font-medium text-gray-800">{v.title}</div>
                          {v.description && <div className="text-sm text-gray-500 mt-1">{v.description}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(v.duration)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">{t('course_detail.no_lessons_available')}</div>
              )}
            </section>
          </div>
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('course_detail.whats_included')}</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /> {t('course_detail.lifetime_access')}</li>
                <li className="flex items-center gap-2"><Award className="h-5 w-5 text-green-600" /> {t('course_detail.certificate_of_completion')}</li>
                <li className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-green-600" /> {t('course_detail.regular_course_updates')}</li>
              </ul>
            </section>

            {/* WhatsApp Group Button */}
            {course.hasWhatsappGroup && (
              <section className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('course_detail.community')}</h3>
                <WhatsAppGroupButton
                  courseId={id || ''}
                  isEnrolled={!!course.userHasPurchased}
                  hasPaid={!!course.userHasPurchased}
                  hasWhatsappGroup={!!course.hasWhatsappGroup}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCourseDetailPage;

