import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tailorsAPI, usersAPI, messagesAPI } from '../lib/api';
import { useDarkMode } from '../hooks/useDarkMode';
import { 
  Shield, CheckCircle, XCircle, Search, User, Scissors, 
  MessageSquare, Trash2, Power, Eye, AlertTriangle
} from 'lucide-react';

export default function AdminPanel() {
  const navigate = useNavigate();
  const isDark = useDarkMode();
  const [activeTab, setActiveTab] = useState<'users' | 'approvals'>('users');
  
  // Data state
  const [users, setUsers] = useState<any[]>([]);
  const [pendingTailors, setPendingTailors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal & Inspector
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load pending tailors
      const pendingRes = await tailorsAPI.getPending();
      setPendingTailors(pendingRes.data.tailors || []);

      // Load users
      const params: any = {};
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const usersRes = await usersAPI.getAdminAll(params);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleApprove = async (id: string) => {
    setActionMessage(null);
    setActionLoadingId(id);
    try {
      await tailorsAPI.approve(id, 'approved');
      setActionMessage({ type: 'success', text: 'Tailor approved successfully.' });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to approve' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionMessage(null);
    setActionLoadingId(id);
    try {
      await tailorsAPI.approve(id, 'rejected');
      setActionMessage({ type: 'success', text: 'Tailor request rejected.' });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reject' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      const res = await usersAPI.toggleActive(userId);
      const isNowActive = res.data.user?.isActive;
      setActionMessage({ 
        type: 'success', 
        text: `User account ${isNowActive ? 'activated' : 'deactivated'} successfully.` 
      });
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to toggle status' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this user account?')) return;
    setActionLoadingId(userId);
    try {
      await usersAPI.adminDelete(userId);
      setActionMessage({ type: 'success', text: 'User account deactivated successfully.' });
      if (selectedUser?.id === userId) setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete user' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartDirectMessage = async (targetUserId: string) => {
    setActionLoadingId(targetUserId);
    try {
      const res = await messagesAPI.adminDirect(targetUserId);
      const convId = res.data.conversation?.id;
      if (convId) {
        navigate(`/messages/${convId}`);
      } else {
        navigate('/messages');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to open message conversation' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats calculation
  const totalTailors = users.filter((u) => u.role === 'tailor').length;
  const totalCustomers = users.filter((u) => u.role === 'customer').length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
            <Shield className="h-7 w-7 mr-2 text-primary-600" />
            Admin Command Center
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Manage tailors, customers, approvals, direct messaging, and account controls
          </p>
        </div>

        {actionMessage && (
          <div className={`rounded-lg px-4 py-2 text-sm flex items-center space-x-2 ${
            actionMessage.type === 'success' 
              ? (isDark ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200')
              : (isDark ? 'bg-red-900/40 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200')
          }`}>
            {actionMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card !p-4 flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
            <Scissors className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Tailors</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalTailors}</p>
          </div>
        </div>

        <div className="card !p-4 flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Customers</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalCustomers}</p>
          </div>
        </div>

        <div className="card !p-4 flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-yellow-900/40 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pending Approvals</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingTailors.length}</p>
          </div>
        </div>

        <div className="card !p-4 flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${isDark ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600'}`}>
            <Power className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active Accounts</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <User className="h-4 w-4" />
          <span>User Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 relative ${
            activeTab === 'approvals'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <Scissors className="h-4 w-4" />
          <span>Pending Tailors</span>
          {pendingTailors.length > 0 && (
            <span className="ml-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingTailors.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY (Tailors & Customers) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <form onSubmit={handleSearchSubmit} className="card !p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative col-span-2">
              <Search className={`absolute left-3 top-3 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search by name, email, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-9 text-sm py-2"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All Roles (Tailors & Customers)</option>
              <option value="tailor">Tailors Only</option>
              <option value="customer">Customers Only</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </form>

          {/* User Table */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="card text-center py-12">
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No users found matching filters.</p>
            </div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-gray-700 bg-gray-800/60 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      <th className="p-4">User Details</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((u) => (
                      <tr key={u.id} className={`hover:${isDark ? 'bg-gray-750' : 'bg-gray-50/50'} transition-colors`}>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            />
                            <div>
                              <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{u.name}</p>
                              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            u.role === 'tailor' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                            u.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        <td className="p-4 text-xs">
                          {u.location || 'Not provided'}
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Inspect Profile */}
                            <button
                              onClick={() => setSelectedUser(u)}
                              className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                              title="Inspect Full Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Direct Message */}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleStartDirectMessage(u.id)}
                                disabled={actionLoadingId === u.id}
                                className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400"
                                title={`Direct Message ${u.role === 'tailor' ? 'Tailor' : 'Customer'}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            )}

                            {/* Toggle Active Status */}
                            <button
                              onClick={() => handleToggleActive(u.id)}
                              disabled={actionLoadingId === u.id}
                              className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${u.isActive ? 'text-amber-600' : 'text-green-600'}`}
                              title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="h-4 w-4" />
                            </button>

                            {/* Delete User */}
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={actionLoadingId === u.id}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                              title="Delete Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING TAILOR APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`font-semibold flex items-center text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Scissors className="h-5 w-5 mr-2 text-primary-600" />
              Pending Tailor Registration Queue ({pendingTailors.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : pendingTailors.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2 opacity-80" />
              <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>All tailor applications have been reviewed!</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>New tailor signups will appear here for verification.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTailors.map((tailor: any) => (
                <div key={tailor.id} className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 ${isDark ? 'bg-gray-700/60' : 'bg-gray-50'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="space-y-1 mb-4 md:mb-0">
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user?.name}</p>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">Pending Approval</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tailor.user?.email} • {tailor.user?.location || 'Location unspecified'}</p>
                    {tailor.bio && <p className={`text-xs italic ${isDark ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>"{tailor.bio}"</p>}
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Applied on {new Date(tailor.createdAt || tailor.user?.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartDirectMessage(tailor.id)}
                      className="btn-secondary text-xs flex items-center space-x-1"
                      title="Direct message candidate"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Message</span>
                    </button>

                    <button
                      onClick={() => handleApprove(tailor.id)}
                      disabled={actionLoadingId === tailor.id}
                      className="btn-primary text-xs flex items-center space-x-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{actionLoadingId === tailor.id ? 'Processing...' : 'Approve Craftsmanship'}</span>
                    </button>

                    <button
                      onClick={() => handleReject(tailor.id)}
                      disabled={actionLoadingId === tailor.id}
                      className="btn-danger text-xs flex items-center space-x-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* USER PROFILE INSPECTOR MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedUser(null)}>
          <div 
            className={`w-full max-w-lg card space-y-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b pb-3 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full object-cover border"
                />
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 font-semibold capitalize">
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Email:</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Phone:</span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{selectedUser.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Location:</span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{selectedUser.location || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Account Status:</span>
                <span className={`font-semibold ${selectedUser.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedUser.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>

              {selectedUser.tailor && (
                <div className="pt-2 space-y-2">
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Tailor Details</p>
                  <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{selectedUser.tailor.bio}</p>
                  {selectedUser.tailor.basePricingMin && (
                    <p className="text-xs font-semibold text-primary-600">
                      Pricing: ${Number(selectedUser.tailor.basePricingMin)} - ${Number(selectedUser.tailor.basePricingMax)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t dark:border-gray-700">
              {selectedUser.role !== 'admin' && (
                <button
                  onClick={() => {
                    const id = selectedUser.id;
                    setSelectedUser(null);
                    handleStartDirectMessage(id);
                  }}
                  className="btn-primary text-xs flex items-center space-x-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Direct Message User</span>
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}