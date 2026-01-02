import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, CheckCircle, Calendar, BookOpen, Award, Share2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildApiUrl, config } from '../config/environment';

interface Certificate {
  certificateId: string;
  courseTitle: string;
  dateIssued: string;
  completionDate: string;
  pdfUrl: string;
  course: {
    _id: string;
    title: string;
    description: string;
    thumbnailURL?: string;
  };
}

const CertificatesPage = () => {
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // Clear error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError(t('certificates.auth_required'));
        return;
      }

              const response = await fetch(buildApiUrl('/api/certificates/user'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(t('certificates.failed_to_fetch'));
      }

      const result = await response.json();
      setCertificates(result.data.certificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setError(t('certificates.failed_to_load'));
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (certificateId: string, courseTitle: string) => {
    try {
      setDownloading(certificateId);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError(t('certificates.auth_required'));
        return;
      }

      const response = await fetch(buildApiUrl(`/api/certificates/download/${certificateId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(t('certificates.failed_to_download'));
      }

      // Get the PDF as a blob directly from the response
      const pdfBlob = await response.blob();
      
      // Create a blob URL for download
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `certificate-${courseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      // Show success message
      setShowSuccess(certificateId);
      setTimeout(() => setShowSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error downloading certificate:', error);
      setError(t('certificates.failed_to_download'));
    } finally {
      setDownloading(null);
    }
  };



  const shareCertificate = (certificate: Certificate) => {
    console.log('🔧 Share button clicked!');
    console.log('Certificate data:', certificate);
    
    // Validate certificate data first
    if (!certificate || !certificate.certificateId) {
      console.error('❌ Invalid certificate data:', certificate);
      setError(t('certificates.invalid_data'));
      return;
    }

    // Generate the public certificate preview URL
    // This should point to the backend server's certificate-preview route
    // Use the API_BASE_URL directly (backend server URL)
    const shareUrl = `${config.API_BASE_URL}/certificate-preview/${certificate.certificateId}`;
    console.log('✅ Generated share URL:', shareUrl);
    
    // Check if we have a valid URL
    if (!shareUrl) {
      console.error('❌ No share URL available');
      setError(t('certificates.url_not_available'));
      return;
    }
    
    if (navigator.share) {
      console.log('📱 Using native share API');
      
      // Create share data
      const shareData = {
        title: `${t('certificates.certificate_of_completion')} - ${certificate.courseTitle}`,
        text: `${t('certificates.share_text', { courseTitle: certificate.courseTitle })}`,
        url: shareUrl
      };
      
      console.log('📤 Share data:', shareData);
      
      // Set sharing state AFTER creating share data but BEFORE calling navigator.share
      setSharing(certificate.certificateId);
      setError(null);
      
      // Use requestAnimationFrame to ensure state is set before share dialog opens
      requestAnimationFrame(() => {
        navigator.share(shareData)
          .then(() => {
            console.log('✅ Share successful');
            setShowSuccess(certificate.certificateId);
            setTimeout(() => setShowSuccess(null), 2000);
          })
          .catch((error) => {
            console.log('⚠️ Share failed or cancelled:', error);
            if (error.name === 'AbortError') {
              console.log('⚠️ Share was cancelled by user');
              setError(t('certificates.share_cancelled'));
            } else {
              console.log('📋 Falling back to clipboard...');
              // Fallback to clipboard
              copyToClipboard(shareUrl, certificate.certificateId);
            }
          })
          .finally(() => {
            setSharing(null); // Always clear sharing state
          });
      });
    } else {
      console.log('💻 Native share not available, using clipboard fallback');
      // Set sharing state for clipboard fallback
      setSharing(certificate.certificateId);
      setError(null);
      
      // Fallback: copy to clipboard
      copyToClipboard(shareUrl, certificate.certificateId)
        .then(() => {
          setSharing(null);
        })
        .catch(() => {
          setSharing(null);
        });
    }
  };

  const copyToClipboard = async (text: string, certificateId: string) => {
    console.log('📋 Attempting to copy to clipboard:', text);
    
    try {
      if (navigator.clipboard) {
        // Modern Clipboard API
        await navigator.clipboard.writeText(text);
        console.log('✅ Successfully copied to clipboard using Clipboard API');
        setShowSuccess(certificateId);
        setTimeout(() => setShowSuccess(null), 2000);
      } else {
        // Fallback for older browsers
        console.log('📋 Clipboard API not available, using fallback method');
        fallbackCopyToClipboard(text, certificateId);
      }
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotAllowedError') {
        setError(t('certificates.clipboard_permission_denied'));
      } else if (error.name === 'SecurityError') {
        setError(t('certificates.clipboard_security_error'));
      } else {
        console.log('📋 Trying fallback copy method...');
        fallbackCopyToClipboard(text, certificateId);
      }
    }
  };

  const fallbackCopyToClipboard = (text: string, certificateId: string) => {
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('✅ Successfully copied to clipboard using fallback method');
        setShowSuccess(certificateId);
        setTimeout(() => setShowSuccess(null), 2000);
      } else {
        console.log('❌ Fallback copy method failed');
        setError(t('certificates.clipboard_failed'));
      }
    } catch (error) {
      console.error('❌ Fallback copy method error:', error);
      setError('Failed to copy to clipboard. Please copy the link manually.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-b-2 border-cyan-500 mx-auto mb-3 xxs:mb-4"></div>
          <p className="text-blue-700 dark:text-gray-300 text-sm xxs:text-base">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center max-w-md mx-auto p-4 xxs:p-8">
          <div className="text-red-500 dark:text-red-400 mb-3 xxs:mb-4">
            <svg className="w-12 h-12 xxs:w-16 xxs:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl xxs:text-2xl font-bold text-blue-900 dark:text-white mb-3 xxs:mb-4">{t('common.error')}</h2>
          <p className="text-blue-700 dark:text-gray-300 mb-4 xxs:mb-6 text-sm xxs:text-base">{error}</p>
          <button
            onClick={fetchCertificates}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 xxs:px-6 py-2 xxs:py-3 rounded-lg transition-all duration-200 text-sm xxs:text-base shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-br from-blue-100 via-cyan-100 to-purple-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-blue-300 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 pt-20 xxs:pt-24 pb-8 xxs:pb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 xxs:gap-8">
            <div className="flex-1">
              <div className="flex items-center space-x-4 xxs:space-x-5 mb-4">
                <div className="w-14 h-14 xxs:w-16 xxs:h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Award className="w-7 h-7 xxs:w-8 xxs:h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl xxs:text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-2 pb-4 xxs:pb-5 sm:pb-6">
                    {t('certificates.my_certificates')}
                  </h1>
                  <p className="text-blue-700 dark:text-gray-300 text-base xxs:text-lg">
                    {t('certificates.congratulations')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-6 xxs:py-8 sm:py-12">
        {certificates.length === 0 ? (
          <div className="text-center py-12 xxs:py-16 sm:py-20">
            <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 p-8 xxs:p-12 sm:p-16 max-w-lg mx-auto">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 xxs:w-24 xxs:h-24 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 xxs:w-12 xxs:h-12 text-blue-600 dark:text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl xxs:text-2xl font-semibold text-blue-900 dark:text-white mb-3">{t('certificates.no_certificates')}</h3>
              <p className="text-blue-700 dark:text-gray-400 mb-8 text-sm xxs:text-base">
                {t('certificates.complete_courses')}
              </p>
              <Link
                to="/courses"
                className="inline-flex items-center px-6 xxs:px-8 py-3 xxs:py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 text-sm xxs:text-base"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                {t('certificates.browse_courses')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Card */}
            <div className="mb-8 xxs:mb-10 sm:mb-12">
              <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-purple-50 dark:from-gray-800 dark:via-gray-800/95 dark:to-gray-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-gray-700/50 p-6 xxs:p-8">
                <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between gap-6">
                  <div className="flex items-center space-x-4 xxs:space-x-5">
                    <div className="w-14 h-14 xxs:w-16 xxs:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-7 w-7 xxs:w-8 xxs:h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl xxs:text-4xl font-bold text-blue-900 dark:text-white">{certificates.length}</h2>
                      <p className="text-blue-700 dark:text-gray-300 text-sm xxs:text-base">{t('certificates.certificates_earned')}</p>
                    </div>
                  </div>
                  <div className="text-center xxs:text-right">
                    <p className="text-xs xxs:text-sm text-blue-600 dark:text-gray-400 mb-1">{t('certificates.latest_achievement')}</p>
                    <p className="font-semibold text-blue-700 dark:text-cyan-400 text-base xxs:text-lg">
                      {certificates.length > 0 ? formatDate(certificates[0].completionDate) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 xxs:gap-6 sm:gap-8">
              {certificates.map((certificate) => (
                <div
                  key={certificate.certificateId}
                  className="bg-gradient-to-br from-gray-800 via-gray-800/95 to-gray-900 rounded-3xl shadow-2xl border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden transform hover:scale-[1.02] hover:shadow-cyan-500/20 relative"
                >
                  {/* Certificate Header */}
                  <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-5 xxs:p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 xxs:w-32 xxs:h-32 bg-white/10 rounded-full -mr-12 xxs:-mr-16 -mt-12 xxs:-mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 xxs:w-24 xxs:h-24 bg-white/10 rounded-full -ml-10 xxs:-ml-12 -mb-10 xxs:-mb-12"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 xxs:w-6 xxs:h-6" />
                          <span className="font-semibold text-sm xxs:text-base">{t('certificates.certificate')}</span>
                        </div>
                        <span className="text-xs xxs:text-sm opacity-90 bg-white/20 px-2 py-1 rounded-lg">#{certificate.certificateId.slice(-8)}</span>
                      </div>
                      <div className="text-xs xxs:text-sm opacity-90">
                        {t('certificates.course_completed_successfully')}
                      </div>
                    </div>
                  </div>

                  {/* Certificate Content */}
                  <div className="p-5 xxs:p-6">
                    <h3 className="text-base xxs:text-lg font-semibold text-white mb-4 xxs:mb-5 line-clamp-2">
                      {certificate.courseTitle}
                    </h3>
                    
                    <div className="space-y-3 xxs:space-y-4 mb-5 xxs:mb-6">
                      <div className="flex items-center text-xs xxs:text-sm text-gray-300 bg-gray-900/50 rounded-xl px-3 py-2">
                        <Calendar className="w-4 h-4 xxs:w-5 xxs:h-5 mr-2 text-cyan-400" />
                        <span>{t('certificates.completed')}: {formatDate(certificate.completionDate)}</span>
                      </div>
                      
                      <div className="flex items-center text-xs xxs:text-sm text-gray-300 bg-gray-900/50 rounded-xl px-3 py-2">
                        <Calendar className="w-4 h-4 xxs:w-5 xxs:h-5 mr-2 text-purple-400" />
                        <span>{t('certificates.issued')}: {formatDate(certificate.dateIssued)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <button
                        onClick={() => downloadCertificate(certificate.certificateId, certificate.courseTitle)}
                        disabled={downloading === certificate.certificateId}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 text-white px-3 xxs:px-4 py-2.5 rounded-xl transition-all duration-200 text-xs xxs:text-sm font-medium shadow-lg hover:shadow-xl"
                        title={t('certificates.download_pdf')}
                      >
                        {downloading === certificate.certificateId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span className="hidden xxs:inline">{t('certificates.download')}</span>
                      </button>
                      
                      <button
                        onClick={() => shareCertificate(certificate)}
                        disabled={sharing === certificate.certificateId}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 text-white px-3 xxs:px-4 py-2.5 rounded-xl transition-all duration-200 text-xs xxs:text-sm font-medium shadow-lg hover:shadow-xl"
                        title={t('certificates.share_certificate')}
                      >
                        {sharing === certificate.certificateId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                        <span className="hidden xxs:inline">
                          {sharing === certificate.certificateId ? t('certificates.sharing') : t('certificates.share')}
                        </span>
                      </button>
                    </div>

                    {/* Verify Link */}
                    <div className="pt-4 border-t border-gray-700/50">
                      <a
                        href={buildApiUrl(`/api/certificates/verify/${certificate.certificateId}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 text-xs text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{t('certificates.verify_certificate')}</span>
                      </a>
                    </div>
                  </div>

                  {/* Success Message Overlay */}
                  {showSuccess === certificate.certificateId && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs shadow-lg z-10 animate-fade-in">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t('certificates.shared')}!</span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs shadow-lg z-10 max-w-xs">
                      <div className="flex items-center space-x-1.5">
                        <span>⚠️</span>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CertificatesPage; 