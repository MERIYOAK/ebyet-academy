import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { Plus, Edit, Trash2, Search, X, Eye, EyeOff } from 'lucide-react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';

interface Announcement {
  _id: string;
  title: {
    en: string;
    tg: string;
  };
  content: {
    en: string;
    tg: string;
  };
  date: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const AdminAnnouncementsPage: React.FC = () => {
  // Admin pages are in English only - always display English version of announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: { en: '', tg: '' },
    content: { en: '', tg: '' },
    date: '',
    isActive: true,
    order: 0
  });

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl('/api/announcements'), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch announcements');
      }

      const data = await response.json();
      setAnnouncements(data.announcements || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Handle create/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.en.trim() || !formData.title.tg.trim()) {
      setToast({ message: 'Title in both languages is required', type: 'error' });
      return;
    }

    if (!formData.content.en.trim() || !formData.content.tg.trim()) {
      setToast({ message: 'Content in both languages is required', type: 'error' });
      return;
    }

    if (!formData.date.trim()) {
      setToast({ message: 'Date is required', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const url = editingAnnouncement
        ? buildApiUrl(`/api/announcements/${editingAnnouncement._id}`)
        : buildApiUrl('/api/announcements');

      const method = editingAnnouncement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save announcement');
      }

      setToast({
        message: editingAnnouncement ? 'Announcement updated successfully' : 'Announcement created successfully',
        type: 'success'
      });

      setShowModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to save announcement',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/announcements/${deleteTarget._id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete announcement');
      }

      setToast({
        message: 'Announcement deleted successfully',
        type: 'success'
      });

      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to delete announcement',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit modal
  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: { en: announcement.title.en, tg: announcement.title.tg },
      content: { en: announcement.content.en, tg: announcement.content.tg },
      date: announcement.date,
      isActive: announcement.isActive,
      order: announcement.order
    });
    setShowModal(true);
  };

  // Open create modal
  const handleCreate = () => {
    setEditingAnnouncement(null);
    resetForm();
    setShowModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: { en: '', tg: '' },
      content: { en: '', tg: '' },
      date: '',
      isActive: true,
      order: 0
    });
  };

  // Toggle active status
  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl(`/api/announcements/${announcement._id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...announcement,
          isActive: !announcement.isActive
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update announcement');
      }

      fetchAnnouncements();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Failed to update announcement',
        type: 'error'
      });
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter(announcement => {
    const searchLower = searchTerm.toLowerCase();
    return (
      announcement.title.en.toLowerCase().includes(searchLower) ||
      announcement.title.tg.toLowerCase().includes(searchLower) ||
      announcement.content.en.toLowerCase().includes(searchLower) ||
      announcement.content.tg.toLowerCase().includes(searchLower) ||
      announcement.date.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
        <div className="text-white text-lg">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Header */}
      <div className="bg-gray-900/80 shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
          <div className="flex flex-col xxs:flex-row xxs:items-center xxs:justify-between space-y-4 xxs:space-y-0">
            <div>
              <h1 className="text-2xl xxs:text-3xl font-bold text-white">Announcement Management</h1>
              <p className="mt-2 text-gray-400 text-sm xxs:text-base">Manage announcements displayed on the home page</p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-3 xxs:px-4 py-2 border border-transparent text-xs xxs:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            >
              <Plus className="h-3 w-3 xxs:h-4 xxs:w-4 mr-1 xxs:mr-2" />
              Add Announcement
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 py-4 xxs:py-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="max-w-7xl mx-auto px-3 xxs:px-4 sm:px-6 lg:px-8 pb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No announcements found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement._id}
                className={`bg-gray-800 rounded-lg border ${
                  announcement.isActive ? 'border-cyan-500/50' : 'border-gray-700'
                } p-4 xxs:p-6`}
              >
                <div className="flex flex-col xxs:flex-row xxs:items-start xxs:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg xxs:text-xl font-semibold text-white">
                        {announcement.title.en}
                      </h3>
                      {announcement.isActive ? (
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{announcement.date}</p>
                    <p className="text-gray-300 text-sm xxs:text-base line-clamp-2">
                      {announcement.content.en}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Order: {announcement.order}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(announcement)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title={announcement.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {announcement.isActive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(announcement);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 xxs:px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 xxs:p-6 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="e.g., January 15, 2024"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="mt-1 text-xs text-gray-400">Lower numbers appear first</p>
              </div>

              {/* English Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title (English) *</label>
                <input
                  type="text"
                  value={formData.title.en}
                  onChange={(e) => setFormData({ ...formData, title: { ...formData.title, en: e.target.value } })}
                  placeholder="Enter title in English"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* Tigrinya Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title (Tigrinya) *</label>
                <input
                  type="text"
                  value={formData.title.tg}
                  onChange={(e) => setFormData({ ...formData, title: { ...formData.title, tg: e.target.value } })}
                  placeholder="Enter title in Tigrinya"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* English Content */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content (English) *</label>
                <textarea
                  value={formData.content.en}
                  onChange={(e) => setFormData({ ...formData, content: { ...formData.content, en: e.target.value } })}
                  placeholder="Enter content in English"
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* Tigrinya Content */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content (Tigrinya) *</label>
                <textarea
                  value={formData.content.tg}
                  onChange={(e) => setFormData({ ...formData, content: { ...formData.content, tg: e.target.value } })}
                  placeholder="Enter content in Tigrinya"
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-300">Active</label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        itemName={deleteTarget ? deleteTarget.title.en : ''}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminAnnouncementsPage;

