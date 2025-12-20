import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, CheckCircle, Calendar, BookOpen, Award, Share2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../config/environment';

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

    // Use the S3 URL directly for sharing
    const shareUrl = certificate.pdfUrl || buildApiUrl(`/certificate-preview/${certificate.certificateId}`);
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 xxs:h-12 xxs:w-12 border-b-2 border-cyan-500 mx-auto mb-3 xxs:mb-4"></div>
          <p className="text-gray-300 text-sm xxs:text-base">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-3 xxs:px-4">
        <div className="text-center max-w-md mx-auto p-4 xxs:p-8">
          <div className="text-red-400 mb-3 xxs:mb-4">
            <svg className="w-12 h-12 xxs:w-16 xxs:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl xxs:text-2xl font-bold text-white mb-3 xxs:mb-4">{t('common.error')}</h2>
          <p className="text-gray-300 mb-4 xxs:mb-6 text-sm xxs:text-base">{error}</p>
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
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b border-gray-700 pt-20 xxs:pt-16">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3 xxs:space-x-4 py-4 xxs:py-6">
            <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <Award className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl xxs:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">{t('certificates.my_certificates')}</h1>
              <p className="mt-1 text-gray-300 text-sm xxs:text-base">
                {t('certificates.congratulations')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-6 xxs:py-8">
        {certificates.length === 0 ? (
          <div className="text-center py-12 xxs:py-16">
            <div className="bg-white rounded-2xl shadow-lg p-6 xxs:p-8 sm:p-12 max-w-md mx-auto">
              <div className="text-gray-400 mb-4 xxs:mb-6">
                <div className="w-16 h-16 xxs:w-20 xxs:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 xxs:mb-4">
                  <BookOpen className="w-8 h-8 xxs:w-10 xxs:h-10" />
                </div>
              </div>
              <h3 className="text-lg xxs:text-xl font-semibold text-gray-900 mb-2 xxs:mb-3">{t('certificates.no_certificates')}</h3>
              <p className="text-gray-600 mb-6 xxs:mb-8 text-sm xxs:text-base">
                {t('certificates.complete_courses')}
              </p>
              <Link
                to="/courses"
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 xxs:px-8 py-2 xxs:py-3 rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl text-sm xxs:text-base"
              >
                {t('certificates.browse_courses')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 xxs:mb-8">
              <div className="bg-white rounded-xl shadow-sm p-4 xxs:p-6">
                <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-3 xxs:space-y-0">
                  <div className="flex items-center space-x-3 xxs:space-x-4">
                    <div className="w-10 h-10 xxs:w-12 xxs:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <Sparkles className="w-5 h-5 xxs:w-6 xxs:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl xxs:text-2xl font-bold text-gray-900">{certificates.length}</h2>
                      <p className="text-gray-600 text-sm xxs:text-base">{t('certificates.certificates_earned')}</p>
                    </div>
                  </div>
                  <div className="text-center xxs:text-right">
                    <p className="text-xs xxs:text-sm text-gray-500">{t('certificates.latest_achievement')}</p>
                    <p className="font-semibold text-gray-900 text-sm xxs:text-base">
                      {certificates.length > 0 ? formatDate(certificates[0].completionDate) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Certificates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xxs:gap-6">
              {certificates.map((certificate) => (
                <div
                  key={certificate.certificateId}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  {/* Certificate Header */}
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 xxs:p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 xxs:w-20 xxs:h-20 bg-white bg-opacity-10 rounded-full -mr-8 xxs:-mr-10 -mt-8 xxs:-mt-10"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 xxs:w-16 xxs:h-16 bg-white bg-opacity-10 rounded-full -ml-6 xxs:-ml-8 -mb-6 xxs:-mb-8"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 xxs:w-6 xxs:h-6" />
                          <span className="font-semibold text-sm xxs:text-base">{t('certificates.certificate')}</span>
                        </div>
                        <span className="text-xs xxs:text-sm opacity-90">#{certificate.certificateId.slice(-8)}</span>
                      </div>
                      <div className="text-xs xxs:text-sm opacity-90">
                        {t('certificates.course_completed_successfully')}
                      </div>
                    </div>
                  </div>

                  {/* Certificate Content */}
                  <div className="p-4 xxs:p-6">
                    <h3 className="text-base xxs:text-lg font-semibold text-white mb-2 xxs:mb-3 line-clamp-2">
                      {certificate.courseTitle}
                    </h3>
                    
                    <div className="space-y-2 xxs:space-y-3 mb-4 xxs:mb-6">
                      <div className="flex items-center text-xs xxs:text-sm text-gray-300">
                        <Calendar className="w-3 h-3 xxs:w-4 xxs:h-4 mr-2 text-gray-400" />
                        <span>{t('certificates.completed')}: {formatDate(certificate.completionDate)}</span>
                      </div>
                      
                      <div className="flex items-center text-xs xxs:text-sm text-gray-300">
                        <Calendar className="w-3 h-3 xxs:w-4 xxs:h-4 mr-2 text-gray-400" />
                        <span>{t('certificates.issued')}: {formatDate(certificate.dateIssued)}</span>
                      </div>
                    </div>

                                         {/* Action Buttons */}
                     <div className="grid grid-cols-2 gap-2">
                       <button
                         onClick={() => downloadCertificate(certificate.certificateId, certificate.courseTitle)}
                         disabled={downloading === certificate.certificateId}
                         className="flex items-center justify-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 xxs:px-3 py-2 rounded-lg transition-all duration-200 text-xs xxs:text-sm font-medium"
                         title={t('certificates.download_pdf')}
                       >
                         {downloading === certificate.certificateId ? (
                           <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                         ) : (
                           <Download className="w-3 h-3" />
                         )}
                         <span className="hidden xxs:inline">{t('certificates.download')}</span>
                       </button>
                       
                       <button
                         onClick={() => shareCertificate(certificate)}
                         disabled={sharing === certificate.certificateId}
                         className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 xxs:px-3 py-2 rounded-lg transition-all duration-200 text-xs xxs:text-sm font-medium"
                         title={t('certificates.share_certificate')}
                       >
                         {sharing === certificate.certificateId ? (
                           <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                         ) : (
                           <Share2 className="w-3 h-3" />
                         )}
                         <span className="hidden xxs:inline">
                           {sharing === certificate.certificateId ? t('certificates.sharing') : t('certificates.share')}
                         </span>
                       </button>
                     </div>

                    {/* Verify Link */}
                    <div className="mt-3 xxs:mt-4 pt-3 xxs:pt-4 border-t border-gray-700">
                      <a
                        href={buildApiUrl(`/api/certificates/verify/${certificate.certificateId}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-1 text-xs text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{t('certificates.verify_certificate')}</span>
                      </a>
                    </div>
                  </div>

                  {/* Success Message Overlay */}
                  {showSuccess === certificate.certificateId && (
                    <div className="absolute top-3 xxs:top-4 right-3 xxs:right-4 bg-green-500 text-white px-2 xxs:px-3 py-1 rounded-full text-xs shadow-lg z-10">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{t('certificates.shared')}!</span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="absolute top-3 xxs:top-4 left-3 xxs:left-4 bg-red-500 text-white px-2 xxs:px-3 py-1 rounded-full text-xs shadow-lg z-10 max-w-xs">
                      <div className="flex items-center space-x-1">
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