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
  instructorName?: string;
  dateIssued: string;
  completionDate: string;
  totalLessons?: number;
  completedLessons?: number;
  completionPercentage?: number;
  platformName?: string;
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
      setError(t('certificate_verification.enter_certificate_id') || 'Please enter a certificate ID');
      return;
    }

    // Client-side validation
    const candidate = id.trim().toUpperCase();
    if (!candidate.startsWith('CERT-')) {
      setError(t('certificate_verification.must_start_with_cert') || 'Certificate ID must start with CERT-');
      return;
    }
    const pattern = /^CERT-[A-Z0-9]{5,}-[A-Z0-9]{5,}$/;
    if (!pattern.test(candidate)) {
      setError(t('certificate_verification.invalid_format') || 'Invalid certificate ID format');
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
        throw new Error(t('certificate_verification.certificate_not_found') || 'Certificate not found');
      }
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || t('certificate_verification.verification_failed') || 'Verification failed');
        } catch (parseError) {
          if (response.status === 500) {
            throw new Error(t('certificate_verification.server_error') || 'Server error');
          } else if (response.status === 0) {
            throw new Error(t('certificate_verification.connection_error') || 'Connection error');
          } else {
            throw new Error(t('certificate_verification.verification_failed_generic') || 'Verification failed');
          }
        }
      }

      const result = await response.json();
      if (result?.data?.certificate === null) {
        setCertificate(null);
        setVerification(result.data.verification);
        setError(t('certificate_verification.certificate_not_found') || 'Certificate not found');
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
        setError(t('certificate_verification.network_error') || 'Network error');
      } else {
        setError(error instanceof Error ? error.message : t('certificate_verification.verification_failed') || 'Verification failed');
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

  const pageTitle = t('certificate_verification.page_title') || 'Verify Certificate';
  const pageDescription = t('certificate_verification.page_subtitle') || 'Verify the authenticity of your certificate';
  const certificateUrl = typeof window !== 'undefined' && urlCertificateId
    ? `${window.location.origin}/verify/${urlCertificateId}`
    : `${window.location.origin}/verify`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-16">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={certificateUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
      </Helmet>

      {/* Hero Header Section */}
      <div className="bg-gradient-to-br from-blue-100 via-cyan-100 to-purple-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-blue-300 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-3xl mb-6 shadow-lg">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
              {pageTitle}
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg max-w-3xl mx-auto">
              {pageDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Search Form */}
        <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6 sm:p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-lg">
              <Search className="w-7 w-7 text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('certificate_verification.verify_certificate') || 'Verify Certificate'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('certificate_verification.certificate_id_help') || 'Enter your certificate ID to verify its authenticity'}
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
            <div className="space-y-2">
              <label htmlFor="certificateId" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 text-left">
                {t('certificate_verification.certificate_id_label') || 'Certificate ID'}
              </label>
              <input
                id="certificateId"
                type="text"
                value={certificateId}
                onChange={(e) => {
                  setCertificateId(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t('certificate_verification.certificate_id_placeholder') || 'CERT-XXXXX-XXXXX'}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 dark:focus:border-cyan-500 transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-left">
                {t('certificate_verification.certificate_id_help') || 'Format: CERT-XXXXX-XXXXX'}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none flex items-center justify-center space-x-2 shadow-lg text-base font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('certificate_verification.verifying_certificate') || 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>{t('certificate_verification.verify_certificate') || 'Verify Certificate'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 border border-red-200 dark:border-red-700/50 rounded-3xl p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
              </div>
              <div className="w-full ml-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-semibold mb-2">
                  {error.includes('not found') ? (t('certificate_verification.certificate_not_found') || 'Certificate Not Found') : (t('certificate_verification.verification_failed') || 'Verification Failed')}
                </p>
                {certificateId && (
                  <p className="mt-2 mb-3 text-xs text-red-600 dark:text-red-400">
                    {t('certificate_verification.searched_id') || 'Searched ID'}: <span className="font-mono bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded-lg">{certificateId}</span>
                  </p>
                )}
                <div className="mt-3 text-xs text-red-600 dark:text-red-400 space-y-2">
                  {error.includes('not found') ? (
                    <>
                      <p className="font-medium">{t('certificate_verification.check_typos') || 'Please check:'}</p>
                      <ul className="list-disc ml-5 space-y-1">
                        <li>{t('certificate_verification.typo_in_id') || 'Typo in certificate ID'}</li>
                        <li>{t('certificate_verification.wrong_format') || 'Wrong format'}</li>
                        <li>{t('certificate_verification.expired_certificate') || 'Certificate may have been removed'}</li>
                      </ul>
                    </>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('certificateId') as HTMLInputElement | null;
                      if (input) input.focus();
                    }}
                    className="text-sm px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all duration-200 font-medium"
                  >
                    {t('certificate_verification.try_again') || 'Try Again'}
                  </button>
                  <Link
                    to="/help-center"
                    className="text-sm px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center font-medium"
                  >
                    {t('certificate_verification.get_help') || 'Get Help'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && certificate && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200 dark:border-green-700/50 rounded-3xl p-6 mb-8">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mr-4">
                <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 font-semibold">
                {t('certificate_verification.verified_successfully') || 'Certificate verified successfully!'}
              </p>
            </div>
          </div>
        )}

        {/* Certificate Details */}
        {certificate && verification && (
          <div className="space-y-6">
            {/* Verification Status Card */}
            <div className={`bg-gradient-to-br ${
              verification.isValid 
                ? 'from-green-500 via-emerald-500 to-teal-500' 
                : 'from-red-500 via-pink-500 to-rose-500'
            } rounded-3xl shadow-2xl p-6 sm:p-10 text-white`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    {verification.isValid ? (
                      <CheckCircle className="w-7 w-7 sm:w-8 sm:h-8" />
                    ) : (
                      <XCircle className="w-7 w-7 sm:w-8 sm:h-8" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold">
                      {verification.isValid ? (t('certificate_verification.certificate_verified') || 'Certificate Verified') : (t('certificate_verification.certificate_invalid') || 'Certificate Invalid')}
                    </h2>
                    <p className="text-sm text-white/90">
                      {t('certificate_verification.verified_on') || 'Verified on'} {formatDate(verification.verifiedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-white/80 text-xs sm:text-sm mb-1">Certificate ID</p>
                  <p className="font-mono text-sm sm:text-lg bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm break-all">
                    {certificate.certificateId}
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Information */}
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('certificate_verification.student_information') || 'Student Information'}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                      {t('certificate_verification.student_name') || 'Student Name'}
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {certificate.studentName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Course Information */}
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('certificate_verification.course_information') || 'Course Information'}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                      {t('certificate_verification.course_title') || 'Course Title'}
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {certificate.courseTitle}
                    </p>
                  </div>
                  {certificate.instructorName && (
                    <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                        {t('certificate_verification.instructor') || 'Instructor'}
                      </p>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {certificate.instructorName}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Completion Details */}
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('certificate_verification.completion_details') || 'Completion Details'}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                      {t('certificate_verification.completion_date') || 'Completion Date'}
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(certificate.completionDate)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                      {t('certificate_verification.date_issued') || 'Date Issued'}
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(certificate.dateIssued)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Course Statistics */}
              {certificate.totalLessons && (
                <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {t('certificate_verification.course_statistics') || 'Course Statistics'}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                          {t('certificate_verification.total_lessons') || 'Total Lessons'}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {certificate.totalLessons}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                          {t('certificate_verification.completed') || 'Completed'}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                          {certificate.completedLessons || 0}
                        </p>
                      </div>
                    </div>
                    {certificate.completionPercentage !== undefined && (
                      <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium mb-3">
                          {t('certificate_verification.completion_rate') || 'Completion Rate'}
                        </p>
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${certificate.completionPercentage}%` }}
                            ></div>
                          </div>
                          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                            {certificate.completionPercentage}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


            {/* Platform Information */}
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6 sm:p-10 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <Award className="w-7 w-7 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {t('certificate_verification.platform_information') || 'Platform Information'}
                </h3>
              </div>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-4">
                {t('certificate_verification.issued_by') || 'This certificate was issued by'} <span className="font-bold text-cyan-600 dark:text-cyan-400">IBYET-INVESTING</span>
              </p>
            </div>

            {/* Verification Notice */}
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-semibold">
                  {t('certificate_verification.verification_complete') || 'Verification Complete'}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {t('certificate_verification.public_verification_notice') || 'This certificate has been verified and is authentic.'}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!certificate && (
          <div className="mt-12 bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-lg border border-blue-200 dark:border-gray-700 p-6 sm:p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg">
                <Sparkles className="w-8 w-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {t('certificate_verification.how_to_verify') || 'How to Verify'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="text-center p-6 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 transform hover:scale-105 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-white font-bold text-lg">{step}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                    {t(`certificate_verification.step_${step}`) || `Step ${step}`}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                    {t(`certificate_verification.step_${step}_desc`) || `Description for step ${step}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateVerificationPage;
