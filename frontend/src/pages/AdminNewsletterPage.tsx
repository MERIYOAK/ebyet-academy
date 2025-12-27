import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/environment';
import { Mail, Send, Search, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
// Toast component removed - using inline toast
interface Subscriber {
  _id: string;
  email: string;
  isSubscribed: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const AdminNewsletterPage: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubscribers, setTotalSubscribers] = useState(0);
  const [filterSubscribed, setFilterSubscribed] = useState<string>('true');

  // Email form state
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: '',
    isHtml: true
  });

  // Fetch subscribers
  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        subscribed: filterSubscribed
      });

      const response = await fetch(buildApiUrl(`/api/newsletter/subscribers?${params}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscribers');
      }

      const data = await response.json();
      if (data.success) {
        setSubscribers(data.data.subscribers || []);
        setTotalPages(data.data.pagination?.pages || 1);
        setTotalSubscribers(data.data.pagination?.total || 0);
        setError(null);
      } else {
        throw new Error(data.message || 'Failed to load subscribers');
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [page, filterSubscribed]);

  // Send bulk email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForm.subject.trim()) {
      setToast({ message: 'Subject is required', type: 'error' });
      return;
    }

    if (!emailForm.message.trim()) {
      setToast({ message: 'Message is required', type: 'error' });
      return;
    }

    try {
      setSendingEmail(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        throw new Error('Admin token not found');
      }

      const response = await fetch(buildApiUrl('/api/newsletter/send-bulk-email'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailForm.subject,
          message: emailForm.message,
          isHtml: emailForm.isHtml,
          onlySubscribed: filterSubscribed === 'true'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setToast({ message: result.message || 'Email sent successfully to all subscribers', type: 'success' });
        setShowEmailModal(false);
        setEmailForm({ subject: '', message: '', isHtml: true });
      } else {
        setToast({ message: result.message || 'Failed to send email', type: 'error' });
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setToast({ message: 'Failed to send email. Please try again.', type: 'error' });
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter subscribers by search term
  const filteredSubscribers = subscribers.filter(subscriber =>
    subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Newsletter Subscribers
              </h1>
              <p className="text-gray-400">
                Manage newsletter subscribers and send bulk emails
              </p>
            </div>
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              <Send className="w-5 h-5" />
              Send Email
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">
              Total Subscribers
            </div>
            <div className="text-2xl font-bold text-white">{totalSubscribers}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">
              Active Subscribers
            </div>
            <div className="text-2xl font-bold text-green-400">
              {subscribers.filter(s => s.isSubscribed).length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">
              Unsubscribed
            </div>
            <div className="text-2xl font-bold text-red-400">
              {subscribers.filter(s => !s.isSubscribed).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={filterSubscribed}
              onChange={(e) => {
                setFilterSubscribed(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="true">
                Subscribed Only
              </option>
              <option value="false">
                Unsubscribed Only
              </option>
              <option value="">
                All
              </option>
            </select>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-4 rounded-lg ${
            toast.type === 'success' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-auto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              No subscribers found
            </p>
          </div>
        ) : (
          <>
            {/* Subscribers Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                        Subscribed At
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredSubscribers.map((subscriber) => (
                      <tr key={subscriber._id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-white">{subscriber.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            subscriber.isSubscribed
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {subscriber.isSubscribed
                              ? 'Subscribed'
                              : 'Unsubscribed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {formatDate(subscriber.subscribedAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {subscriber.source || 'homepage'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Send Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">
                    Send Bulk Email
                  </h2>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      value={emailForm.message}
                      onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                      placeholder="Enter your email message here. HTML is supported."
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isHtml"
                      checked={emailForm.isHtml}
                      onChange={(e) => setEmailForm({ ...emailForm, isHtml: e.target.checked })}
                      className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <label htmlFor="isHtml" className="text-sm text-gray-300">
                      Enable HTML formatting
                    </label>
                  </div>

                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <p className="text-sm text-cyan-400">
                      This email will be sent to {filterSubscribed === 'true' 
                        ? subscribers.filter(s => s.isSubscribed).length 
                        : totalSubscribers} subscribers
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={sendingEmail}
                      className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {sendingEmail ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Email
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNewsletterPage;

