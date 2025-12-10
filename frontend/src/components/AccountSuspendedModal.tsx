import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { X, AlertTriangle, HelpCircle } from 'lucide-react';

interface AccountSuspendedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

const AccountSuspendedModal: React.FC<AccountSuspendedModalProps> = ({
  isOpen,
  onClose,
  userEmail
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('auth.login.account_suspended_title', 'Account Suspended')}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              {t('auth.login.account_suspended_message', 
                'Your account has been suspended and you cannot access the platform at this time. This may be due to a temporary restriction or policy violation.'
              )}
            </p>
            {userEmail && userEmail !== 'Unknown' && (
              <p className="text-gray-600 text-sm mt-2">
                <strong>Account:</strong> {userEmail}
              </p>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <HelpCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-orange-800 mb-1">
                  {t('auth.login.need_help', 'Need Help?')}
                </h4>
                <p className="text-sm text-orange-700">
                  {t('auth.login.contact_support_message', 
                    'If you believe this is an error or need assistance, please contact our support team.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/terms-of-service"
              onClick={onClose}
              className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors duration-200 text-center text-sm font-medium flex items-center justify-center space-x-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t('auth.login.contact_support', 'Contact Support')}</span>
            </Link>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm font-medium"
            >
              {t('auth.login.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSuspendedModal;
