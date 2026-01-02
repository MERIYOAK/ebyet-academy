import React from 'react';
import { X, AlertTriangle, FileVideo, FileText, Award, Database, Users, Package, Cloud } from 'lucide-react';

interface DeletionSummary {
  videos: number;
  materials: number;
  certificates: number;
  versions: number;
  progressRecords: number;
  usersAffected: number;
  bundlesAffected: number;
  s3Files: number;
  bundles?: Array<{
    id: string;
    title: string;
    willBecomeInactive: boolean;
  }>;
}

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  itemType?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  deletionSummary?: DeletionSummary | null;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  itemType,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  deletionSummary
}) => {
  if (!isOpen) return null;

  // Generate title and message from itemName and itemType if not provided
  const modalTitle = title || `Delete ${itemType || 'Item'}`;
  const modalMessage = message || `Are you sure you want to delete "${itemName || 'this item'}"? This action cannot be undone.`;

  const hasSummary = deletionSummary && (
    deletionSummary.videos > 0 ||
    deletionSummary.materials > 0 ||
    deletionSummary.certificates > 0 ||
    deletionSummary.versions > 0 ||
    deletionSummary.progressRecords > 0 ||
    deletionSummary.usersAffected > 0 ||
    deletionSummary.bundlesAffected > 0 ||
    deletionSummary.s3Files > 0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-gray-800 border border-gray-700 shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {modalTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              {modalMessage}
            </p>

            {/* Deletion Summary */}
            {hasSummary && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h4 className="text-sm font-semibold text-red-300 mb-3">What will be deleted:</h4>
                <div className="space-y-2 text-xs text-gray-300">
                  {deletionSummary!.videos > 0 && (
                    <div className="flex items-center space-x-2">
                      <FileVideo className="h-4 w-4 text-red-400" />
                      <span><strong>{deletionSummary!.videos}</strong> video{deletionSummary!.videos !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {deletionSummary!.materials > 0 && (
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-red-400" />
                      <span><strong>{deletionSummary!.materials}</strong> material{deletionSummary!.materials !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {deletionSummary!.certificates > 0 && (
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-green-400" />
                      <span><strong>{deletionSummary!.certificates}</strong> certificate{deletionSummary!.certificates !== 1 ? 's' : ''} <span className="text-green-300">(will be preserved)</span></span>
                    </div>
                  )}
                  {deletionSummary!.versions > 0 && (
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-red-400" />
                      <span><strong>{deletionSummary!.versions}</strong> course version{deletionSummary!.versions !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {deletionSummary!.progressRecords > 0 && (
                    <div className="flex items-center space-x-2">
                      <Database className="h-4 w-4 text-red-400" />
                      <span><strong>{deletionSummary!.progressRecords}</strong> progress record{deletionSummary!.progressRecords !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {deletionSummary!.s3Files > 0 && (
                    <div className="flex items-center space-x-2">
                      <Cloud className="h-4 w-4 text-red-400" />
                      <span><strong>{deletionSummary!.s3Files}</strong> file{deletionSummary!.s3Files !== 1 ? 's' : ''} from AWS S3</span>
                    </div>
                  )}
                  {deletionSummary!.usersAffected > 0 && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-orange-400" />
                      <span><strong>{deletionSummary!.usersAffected}</strong> user{deletionSummary!.usersAffected !== 1 ? 's' : ''} will lose access</span>
                    </div>
                  )}
                  {deletionSummary!.bundlesAffected > 0 && (
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-orange-400" />
                      <span><strong>{deletionSummary!.bundlesAffected}</strong> bundle{deletionSummary!.bundlesAffected !== 1 ? 's' : ''} will be affected</span>
                    </div>
                  )}
                  {deletionSummary!.bundles && deletionSummary!.bundles.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-red-500/20">
                      {deletionSummary!.bundles.map(bundle => (
                        <div key={bundle.id} className="text-xs text-gray-400 mt-1">
                          • {bundle.title} {bundle.willBecomeInactive && <span className="text-orange-400">(will become inactive)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-800/50 border-t border-gray-700">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 border border-transparent rounded-lg hover:from-orange-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 