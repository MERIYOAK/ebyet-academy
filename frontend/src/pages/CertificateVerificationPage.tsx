import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, CheckCircle, XCircle, FileText, Calendar, User, BookOpen, Shield, Award, Sparkles } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buildApiUrl } from '../config/environment';

interface CertificateVerification {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  dateIssued: string;
  completionDate: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  platformName: string;
}

interface VerificationResult {
  isValid: boolean;
  verifiedAt: string;
}

const CertificateVerificationPage = () => {
  const { t } = useTranslation();
  const { certificateId: urlCertificateId } = useParams<{ certificateId?: string }>();
  
  const [certificateId, setCertificateId] = useState(urlCertificateId || '');
  const [certificate, setCertificate] = useState<CertificateVerification | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-verify if certificateId is in URL
  useEffect(() => {
    if (urlCertificateId) {
      verifyCertificate(urlCertificateId);
    }
  }, [urlCertificateId]);

  const verifyCertificate = async (id: string) => {
    if (!id.trim()) {
      setError(t('certificate_verification.enter_certificate_id'));
      return;
    }

    // Client-side validation to avoid unnecessary 404 requests
    const candidate = id.trim().toUpperCase();
    if (!candidate.startsWith('CERT-')) {
      setError(t('certificate_verification.must_start_with_cert'));
      return;
    }
    const pattern = /^CERT-[A-Z0-9]{5,}-[A-Z0-9]{5,}$/;
    if (!pattern.test(candidate)) {
      setError(t('certificate_verification.invalid_format'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCertificate(null);
      setVerification(null);
      setShowSuccess(false);

              const response = await fetch(buildApiUrl(`/api/certificates/verify/${candidate}`));

      if (response.status === 404) {
        throw new Error(t('certificate_verification.certificate_not_found'));
      }
      if (!response.ok) {
        // Try to parse error response as JSON first
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || t('certificate_verification.verification_failed'));
        } catch (parseError) {
          // If JSON parsing fails, use status-based error messages
          if (response.status === 500) {
            throw new Error(t('certificate_verification.server_error'));
          } else if (response.status === 0) {
            throw new Error(t('certificate_verification.connection_error'));
          } else {
            throw new Error(t('certificate_verification.verification_failed_generic'));
          }
        }
      }

      const result = await response.json();
      // Handle backend 200 with not-found gracefully
      if (result?.data?.certificate === null) {
        setCertificate(null);
        setVerification(result.data.verification);
        setError(t('certificate_verification.certificate_not_found'));
        setShowSuccess(false);
        setLoading(false);
        return;
      }

      setCertificate(result.data.certificate);
      setVerification(result.data.verification);
      setShowSuccess(true);
      setLoading(false);
    } catch (error) {
      if (error instanceof TypeError) {
        setError(t('certificate_verification.network_error'));
      } else {
        setError(error instanceof Error ? error.message : t('certificate_verification.verification_failed'));
      }
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCertificate(certificateId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



  const shareImage = 'https://persi-edu-platform.s3.us-east-1.amazonaws.com/persi-academy/Ig-images/congratulations.jpeg';
  const pageTitle = 'Congratulations on Your Certificate!';
  const pageDescription = 'Celebrate your achievement with QENDIEL Academy. View and share your certificate now.';
  const certificateUrl = typeof window !== 'undefined' && urlCertificateId
    ? `${window.location.origin}/verify/${urlCertificateId}`
    : `${window.location.origin}/verify`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-16">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={shareImage} />
        <meta property="og:url" content={certificateUrl} />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={shareImage} />
      </Helmet>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-6xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8">
          <div className="py-8 xxs:py-10 sm:py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 xxs:w-18 xxs:h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 xxs:mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
              <Shield className="w-8 h-8 xxs:w-9 xxs:h-9 sm:w-10 sm:h-10 text-white" />
            </div>
                         <h1 className="text-2xl xxs:text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 xxs:mb-4 animate-fade-in-up">
              {t('certificate_verification.page_title')}
            </h1>
            <p className="text-sm xxs:text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
              {t('certificate_verification.page_subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-8 xxs:py-10 sm:py-12">
        {/* Search Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 mb-8 xxs:mb-10 sm:mb-12 border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
          <div className="text-center mb-6 xxs:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 xxs:w-14 xxs:h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-3 xxs:mb-4 shadow-lg">
              <Search className="w-6 h-6 xxs:w-7 xxs:h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h2 className="text-xl xxs:text-2xl font-bold text-gray-900 mb-2">{t('certificate_verification.verify_certificate')}</h2>
            <p className="text-sm xxs:text-base text-gray-600">{t('certificate_verification.certificate_id_help')}</p>
          </div>
          
                     <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4 xxs:space-y-6">
             <div className="space-y-2 xxs:space-y-3">
               <label htmlFor="certificateId" className="block text-sm xxs:text-base font-semibold text-gray-700 text-left">
                 {t('certificate_verification.certificate_id_label')}
               </label>
                               <input
                  id="certificateId"
                  type="text"
                  value={certificateId}
                  onChange={(e) => {
                    setCertificateId(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={t('certificate_verification.certificate_id_placeholder')}
                  className="w-full px-4 xxs:px-6 py-3 xxs:py-4 text-base xxs:text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm"
                  required
                />
               <p className="text-xs xxs:text-sm text-gray-500 text-left">
                 {t('certificate_verification.certificate_id_help')}
               </p>
             </div>
             
             <button
               type="submit"
               disabled={loading}
               className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 xxs:px-8 py-3 xxs:py-4 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2 xxs:space-x-3 shadow-lg text-base xxs:text-lg font-semibold"
             >
               {loading ? (
                 <>
                   <div className="animate-spin rounded-full h-5 w-5 xxs:h-6 xxs:w-6 border-b-2 border-white"></div>
                   <span>{t('certificate_verification.verifying_certificate')}</span>
                 </>
               ) : (
                 <>
                   <Search className="w-5 h-5 xxs:w-6 xxs:h-6" />
                   <span>{t('certificate_verification.verify_certificate')}</span>
                 </>
               )}
             </button>
           </form>
        </div>

                 {/* Error Message */}
         {error && (
           <div className="bg-red-50 border border-red-200 rounded-xl p-4 xxs:p-6 mb-6 xxs:mb-8 transform animate-fade-in-up">
            <div className="flex items-start">
              <XCircle className="w-5 h-5 xxs:w-6 xxs:h-6 text-red-500 mr-2 xxs:mr-3 mt-0.5" />
              <div className="w-full">
                <p className="text-sm xxs:text-base text-red-800 font-semibold">
                  {error.includes('not found') ? t('certificate_verification.certificate_not_found') : t('certificate_verification.verification_failed')}
                </p>
                {certificateId && (
                  <p className="mt-1 text-xs xxs:text-sm text-red-700">
                    {t('certificate_verification.searched_id')}: <span className="font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded">{certificateId}</span>
                  </p>
                )}
                <div className="mt-2 text-xs xxs:text-sm text-red-700 space-y-1">
                  {error.includes('not found') ? (
                    <>
                      <p>{t('certificate_verification.check_typos')}</p>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{t('certificate_verification.typo_in_id')}</li>
                        <li>{t('certificate_verification.wrong_format')}</li>
                        <li>{t('certificate_verification.expired_certificate')}</li>
                      </ul>
                    </>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('certificateId') as HTMLInputElement | null;
                      if (input) input.focus();
                    }}
                    className="text-xs xxs:text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    {t('certificate_verification.try_again')}
                  </button>
                  <Link
                    to="/help-center"
                    className="text-xs xxs:text-sm px-3 py-1.5 rounded-lg bg-white text-red-700 border border-red-300 hover:bg-red-100 transition-colors"
                  >
                    {t('certificate_verification.get_help')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

                 {/* Success Message */}
         {showSuccess && certificate && (
           <div className="bg-green-50 border border-green-200 rounded-xl p-4 xxs:p-6 mb-6 xxs:mb-8 transform animate-fade-in-up">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 xxs:w-6 xxs:h-6 text-green-500 mr-2 xxs:mr-3" />
                               <p className="text-sm xxs:text-base text-green-800 font-medium">
                   {t('certificate_verification.verified_successfully')}
                 </p>
            </div>
          </div>
        )}

        {/* Certificate Details */}
        {certificate && verification && (
          <div className="space-y-6 xxs:space-y-8">
            {/* Verification Status Card */}
                         <div className={`bg-gradient-to-r ${
               verification.isValid 
                 ? 'from-green-500 to-emerald-600' 
                 : 'from-red-500 to-pink-600'
             } rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 text-white transform animate-fade-in-up`}>
              <div className="flex flex-col xxs:flex-row items-start xxs:items-center justify-between space-y-4 xxs:space-y-0">
                <div className="flex items-center space-x-3 xxs:space-x-4">
                  <div className="w-12 h-12 xxs:w-14 xxs:h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    {verification.isValid ? (
                      <CheckCircle className="w-6 h-6 xxs:w-7 xxs:h-7 sm:w-8 sm:h-8" />
                    ) : (
                      <XCircle className="w-6 h-6 xxs:w-7 xxs:h-7 sm:w-8 sm:h-8" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl xxs:text-2xl sm:text-3xl font-bold">
                      {verification.isValid ? t('certificate_verification.certificate_verified') : t('certificate_verification.certificate_invalid')}
                    </h2>
                    <p className="text-sm xxs:text-base text-white/90">
                      {t('certificate_verification.verified_on')} {formatDate(verification.verifiedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-left xxs:text-right w-full xxs:w-auto">
                  <p className="text-white/80 text-xs xxs:text-sm">Certificate ID</p>
                  <p className="font-mono text-sm xxs:text-base sm:text-lg bg-white/10 px-2 xxs:px-3 py-1 rounded-lg backdrop-blur-sm break-all">
                    {certificate.certificateId}
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xxs:gap-8">
              {/* Student Information */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 border border-white/20 transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center mb-4 xxs:mb-6">
                  <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3 xxs:mr-4">
                    <User className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
                  </div>
                  <h3 className="text-xl xxs:text-2xl font-bold text-gray-900">{t('certificate_verification.student_information')}</h3>
                </div>
                <div className="space-y-3 xxs:space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 xxs:p-4">
                    <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.student_name')}</p>
                    <p className="text-base xxs:text-lg font-semibold text-gray-900">{certificate.studentName}</p>
                  </div>
                </div>
              </div>

              {/* Course Information */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 border border-white/20 transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center mb-4 xxs:mb-6">
                  <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3 xxs:mr-4">
                    <BookOpen className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
                  </div>
                  <h3 className="text-xl xxs:text-2xl font-bold text-gray-900">{t('certificate_verification.course_information')}</h3>
                </div>
                <div className="space-y-3 xxs:space-y-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 xxs:p-4">
                    <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.course_title')}</p>
                    <p className="text-base xxs:text-lg font-semibold text-gray-900">{certificate.courseTitle}</p>
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 xxs:p-4">
                    <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.instructor')}</p>
                    <p className="text-base xxs:text-lg font-semibold text-gray-900">{certificate.instructorName}</p>
                  </div>
                </div>
              </div>

              {/* Completion Details */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 border border-white/20 transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center mb-4 xxs:mb-6">
                  <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-3 xxs:mr-4">
                    <Calendar className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
                  </div>
                  <h3 className="text-xl xxs:text-2xl font-bold text-gray-900">{t('certificate_verification.completion_details')}</h3>
                </div>
                <div className="space-y-3 xxs:space-y-4">
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-3 xxs:p-4">
                    <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.completion_date')}</p>
                    <p className="text-base xxs:text-lg font-semibold text-gray-900">{formatDate(certificate.completionDate)}</p>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-3 xxs:p-4">
                    <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.date_issued')}</p>
                    <p className="text-base xxs:text-lg font-semibold text-gray-900">{formatDate(certificate.dateIssued)}</p>
                  </div>
                </div>
              </div>

              {/* Course Statistics */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 border border-white/20 transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center mb-4 xxs:mb-6">
                  <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3 xxs:mr-4">
                    <FileText className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
                  </div>
                  <h3 className="text-xl xxs:text-2xl font-bold text-gray-900">{t('certificate_verification.course_statistics')}</h3>
                </div>
                <div className="space-y-3 xxs:space-y-4">
                  <div className="grid grid-cols-2 gap-3 xxs:gap-4">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 xxs:p-4">
                      <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.total_lessons')}</p>
                      <p className="text-xl xxs:text-2xl font-bold text-gray-900">{certificate.totalLessons}</p>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 xxs:p-4">
                      <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.completed')}</p>
                      <p className="text-xl xxs:text-2xl font-bold text-gray-900">{certificate.completedLessons}</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 xxs:p-4">
                    <p className="text-xs xxs:text-sm text-gray-600 font-medium">{t('certificate_verification.completion_rate')}</p>
                    <div className="flex items-center space-x-2 xxs:space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 xxs:h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 xxs:h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${certificate.completionPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-base xxs:text-lg font-bold text-gray-900">{certificate.completionPercentage}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Information */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 border border-white/20 text-center">
              <div className="flex items-center justify-center mb-3 xxs:mb-4">
                <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-3 xxs:mr-4">
                  <Award className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
                </div>
                <h3 className="text-xl xxs:text-2xl font-bold text-gray-900">{t('certificate_verification.platform_information')}</h3>
              </div>
              <p className="text-base xxs:text-lg text-gray-700 mb-3 xxs:mb-4">
                {t('certificate_verification.issued_by')} <span className="font-bold text-indigo-600">{certificate.platformName}</span>
              </p>
              <p className="text-xs xxs:text-sm text-gray-500">
                {t('certificate_verification.blockchain_verification')}
              </p>
            </div>

                         {/* Verification Notice */}
             <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 xxs:p-6 text-center">
               <div className="flex items-center justify-center mb-2 xxs:mb-3">
                 <Shield className="w-5 h-5 xxs:w-6 xxs:h-6 text-blue-600 mr-2" />
                 <p className="text-sm xxs:text-base text-blue-800 font-medium">{t('certificate_verification.verification_complete')}</p>
               </div>
               <p className="text-xs xxs:text-sm text-blue-600">
                 {t('certificate_verification.public_verification_notice')}
               </p>
             </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 xxs:mt-14 sm:mt-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 xxs:p-6 sm:p-8 border border-white/20">
          <div className="text-center mb-6 xxs:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 xxs:w-14 xxs:h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-3 xxs:mb-4 shadow-lg">
              <Sparkles className="w-6 h-6 xxs:w-7 xxs:h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="text-xl xxs:text-2xl font-bold text-gray-900 mb-3 xxs:mb-4">{t('certificate_verification.how_to_verify')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xxs:gap-6">
            <div className="text-center p-4 xxs:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl transform hover:scale-105 transition-all duration-300">
              <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 xxs:mb-4">
                <span className="text-white font-bold text-base xxs:text-lg">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm xxs:text-base">{t('certificate_verification.step_1')}</h4>
              <p className="text-gray-600 text-xs xxs:text-sm">{t('certificate_verification.step_1_desc')}</p>
            </div>
            <div className="text-center p-4 xxs:p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl transform hover:scale-105 transition-all duration-300">
              <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 xxs:mb-4">
                <span className="text-white font-bold text-base xxs:text-lg">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm xxs:text-base">{t('certificate_verification.step_2')}</h4>
              <p className="text-gray-600 text-xs xxs:text-sm">{t('certificate_verification.step_2_desc')}</p>
            </div>
            <div className="text-center p-4 xxs:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl transform hover:scale-105 transition-all duration-300">
              <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 xxs:mb-4">
                <span className="text-white font-bold text-base xxs:text-lg">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm xxs:text-base">{t('certificate_verification.step_3')}</h4>
              <p className="text-gray-600 text-xs xxs:text-sm">{t('certificate_verification.step_3_desc')}</p>
            </div>
            <div className="text-center p-4 xxs:p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl transform hover:scale-105 transition-all duration-300">
              <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 xxs:mb-4">
                <span className="text-white font-bold text-base xxs:text-lg">4</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm xxs:text-base">{t('certificate_verification.step_4')}</h4>
              <p className="text-gray-600 text-xs xxs:text-sm">{t('certificate_verification.step_4_desc')}</p>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default CertificateVerificationPage;
