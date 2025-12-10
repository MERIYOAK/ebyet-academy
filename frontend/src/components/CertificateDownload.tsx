import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';

import { Download, CheckCircle, Calendar, Award, Eye, Share2, FileText, Sparkles } from 'lucide-react';

interface CertificateDownloadProps {
  courseId: string;
  courseTitle: string;
  isCompleted: boolean;
  className?: string;
}

interface Certificate {
  certificateId: string;
  pdfUrl: string;
  dateIssued: string;
  completionDate: string;
}

const CertificateDownload: React.FC<CertificateDownloadProps> = ({
  courseId,
  courseTitle,
  isCompleted,
  className = ''
}) => {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      fetchCertificate();
    }
  }, [courseId, isCompleted]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(buildApiUrl(`/api/certificates/course/${courseId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setCertificate(result.data.certificate);
      } else if (response.status === 404) {
        // Certificate doesn't exist yet, that's okay
        setCertificate(null);
      } else {
        throw new Error('Failed to fetch certificate');
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
      setError('Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async () => {
    if (!certificate) return;

    try {
      setDownloading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(buildApiUrl(`/api/certificates/download/${certificate.certificateId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      const result = await response.json();
      
      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = buildApiUrl(result.data.downloadUrl);
      link.download = `certificate-${courseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error downloading certificate:', error);
      setError('Failed to download certificate');
    } finally {
      setDownloading(false);
    }
  };

  const generateCertificate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(buildApiUrl('/api/certificates/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate certificate');
      }

      const result = await response.json();
      setCertificate(result.data.certificate);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error generating certificate:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  };

  const previewCertificate = () => {
    if (!certificate) return;
    
    // Extract filename from pdfUrl and create preview URL
    const filename = certificate.pdfUrl.split('/').pop();
    const previewUrl = buildApiUrl(`/certificates/${filename}`);
    
    const link = document.createElement('a');
    link.href = previewUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shareCertificate = () => {
    if (!certificate) return;
    
    const verificationUrl = `http://localhost:3000/verify/${certificate.certificateId}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Certificate of Completion - ${courseTitle}`,
        text: `I just completed the course "${courseTitle}"! Verify my certificate here:`,
        url: verificationUrl
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(verificationUrl).then(() => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      });
    }
  };

  if (!isCompleted) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Certificate of Completion</h3>
          <p className="text-sm text-gray-600">Congratulations! You've earned your certificate</p>
        </div>
        <div className="flex-shrink-0">
          <Sparkles className="w-5 h-5 text-green-500" />
        </div>
      </div>

      {/* Certificate Status */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-600">Loading certificate...</span>
        </div>
      ) : certificate ? (
        <div className="space-y-4">
          {/* Certificate Info */}
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-700">Certificate Ready</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  Completed: {new Date(certificate.completionDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  ID: {certificate.certificateId.slice(-8)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={downloadCertificate}
              disabled={downloading}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            
            <button
              onClick={previewCertificate}
              className="flex items-center justify-center space-x-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            
            <button
              onClick={shareCertificate}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Generate Certificate */}
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-blue-700">Generate Certificate</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Create your official certificate of completion for this course.
            </p>
            
            <button
              onClick={generateCertificate}
              disabled={generating}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Certificate...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Certificate</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-right">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Success! Certificate downloaded.</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800">
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateDownload;
