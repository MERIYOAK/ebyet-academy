import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import { config } from '../config/environment';

interface WhatsAppGroupButtonProps {
  courseId: string;
  isEnrolled: boolean;
  hasPaid: boolean;
  hasWhatsappGroup: boolean;
  className?: string;
}

const WhatsAppGroupButton: React.FC<WhatsAppGroupButtonProps> = ({
  courseId,
  isEnrolled,
  hasPaid,
  hasWhatsappGroup,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show button if course doesn't have a WhatsApp group
  if (!hasWhatsappGroup) {
    return null;
  }

  // Don't show button if user is not enrolled or hasn't paid (for paid courses)
  if (!isEnrolled || !hasPaid) {
    return null;
  }

  const handleJoinGroup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to access the WhatsApp group');
      }

      console.log('🔍 [WhatsApp] Attempting to generate token for course:', courseId);
      console.log('🔍 [WhatsApp] Token exists:', !!token);

      // Get the token from the backend
      const response = await fetch(`${config.API_BASE_URL}/api/courses/${courseId}/group-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      console.log('🔍 [WhatsApp] Response status:', response.status);
      console.log('🔍 [WhatsApp] Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate access token');
      }

      // Show warning about link expiration
      const confirmJoin = window.confirm(t('whatsapp.expiry_warning'));

      if (confirmJoin) {
        // Open WhatsApp group in a new tab
        window.open(`${config.API_BASE_URL}${data.joinUrl}`, '_blank', 'noopener,noreferrer');
      }

    } catch (err) {
      console.error('Error joining WhatsApp group:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to join WhatsApp group';
      
      // If it's an authentication error, suggest logging in
      if (errorMessage.includes('not authenticated') || errorMessage.includes('Invalid token') || errorMessage.includes('401')) {
        setError('Please log in to access the WhatsApp group. Click here to login.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        onClick={handleJoinGroup}
        disabled={isLoading}
        className={`
          w-full flex items-center justify-center space-x-3 px-6 py-3 rounded-lg font-semibold
          transition-all duration-200 transform hover:scale-105
          ${isLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
          }
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{t('whatsapp.generating_token')}</span>
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            <span>{t('whatsapp.join_group')}</span>
            <ExternalLink className="h-4 w-4" />
          </>
        )}
      </button>

      {error && (
        <div className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="font-medium">{t('whatsapp.error_title')}</p>
          <p className="text-xs mt-1">
            {error.includes('Please log in') ? (
              <button 
                onClick={() => window.location.href = '/login'}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {error}
              </button>
            ) : (
              error
            )}
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        <p>{t('whatsapp.access_info')}</p>
      </div>
    </div>
  );
};

export default WhatsAppGroupButton;
