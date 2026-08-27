import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { tailorsAPI, usersAPI, messagesAPI, settingsAPI } from '../lib/api';
import { useDarkMode } from '../hooks/useDarkMode';
import { useToast } from '../context/ToastContext';
import { 
  Shield, CheckCircle, XCircle, Search, User, Scissors, 
  MessageSquare, Trash2, Power, Eye, AlertTriangle, 
  Settings, MessageSquareHeart, Star, Sparkles, Plus, 
  X, Tag, Globe, Bell, Check, Save, RefreshCw, Bot, Key, Cpu
} from 'lucide-react';

const FEEDBACK_CATEGORIES: Record<string, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  tailoring: { label: 'Tailoring', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  ai_measurement: { label: 'AI Scan', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  feature: { label: 'Feature Idea', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  bug: { label: 'Bug Report', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

export default function AdminPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDark = useDarkMode();
  const { toast } = useToast();

  const tabParam = searchParams.get('tab') as 'users' | 'approvals' | 'feedback' | 'settings' | null;
  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'feedback' | 'settings'>(
    tabParam === 'feedback' || tabParam === 'approvals' || tabParam === 'settings' ? tabParam : 'users'
  );
  
  // Data state
  const [users, setUsers] = useState<any[]>([]);
  const [pendingTailors, setPendingTailors] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingFeedback, setRefreshingFeedback] = useState(false);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>('all');
  
  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    announcementBanner: 'Welcome to የደስደስ Fashion! Quality custom tailoring verified.',
    maintenanceMode: false,
    commissionRate: '5.0',
    autoApproveTailors: false,
    specialtiesList: ['Bespoke Suits', 'Tuxedos', 'Evening Gowns', 'Bridal Wear', 'Alterations', 'Silk Dresses', 'Overcoats'],
    aiProvider: 'gemini',
    aiProviderName: 'Google Gemini',
    aiApiKey: '',
    aiModel: 'gemini-1.5-flash',
    aiApiBaseUrl: '',
  });
  const [newSpecialty, setNewSpecialty] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Modal & Inspector
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam && ['users', 'approvals', 'feedback', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'users' | 'approvals' | 'feedback' | 'settings') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadFeedbackOnly = async () => {
    setRefreshingFeedback(true);
    try {
      const fbRes = await settingsAPI.getFeedback();
      setFeedbacks(fbRes.data.feedbacks || []);
    } catch (fbErr) {
      console.error('Failed to load feedback list', fbErr);
    } finally {
      setRefreshingFeedback(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedbackOnly();
    }
  }, [activeTab]);

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

      // Load customer feedback
      try {
        const fbRes = await settingsAPI.getFeedback();
        setFeedbacks(fbRes.data.feedbacks || []);
      } catch (fbErr) {
        console.error('Failed to load feedback list', fbErr);
      }

      // Load platform settings
      try {
        const setRes = await settingsAPI.getAll();
        if (setRes.data?.settings) {
          setPlatformSettings((prev) => ({
            ...prev,
            ...setRes.data.settings,
          }));
        }
      } catch (setErr) {
        console.error('Failed to load settings', setErr);
      }
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
    setActionLoadingId(id);
    try {
      await tailorsAPI.approve(id, 'approved');
      toast.success('Tailor credentials verified and approved!');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      await tailorsAPI.approve(id, 'rejected');
      toast.info('Tailor application rejected.');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      const res = await usersAPI.toggleActive(userId);
      const isNowActive = res.data.user?.isActive;
      toast.success(`User account ${isNowActive ? 'activated' : 'deactivated'} successfully.`);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to toggle status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this user account?')) return;
    setActionLoadingId(userId);
    try {
      await usersAPI.adminDelete(userId);
      toast.success('User account deactivated successfully.');
      if (selectedUser?.id === userId) setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
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
      toast.error(err.response?.data?.error || 'Failed to open message conversation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      await settingsAPI.deleteFeedback(id);
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      toast.success('Feedback entry marked as reviewed / removed');
    } catch (err: any) {
      toast.error('Failed to remove feedback');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await settingsAPI.update(platformSettings);
      toast.success('Platform settings updated and broadcast successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update platform settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestAIConnection = async () => {
    if (!platformSettings.aiApiKey || !platformSettings.aiApiKey.trim()) {
      toast.error('Please paste an API key before testing connection.');
      return;
    }
    setTestingAI(true);
    try {
      const res = await settingsAPI.testAI({
        provider: platformSettings.aiProvider,
        providerName: platformSettings.aiProviderName,
        apiKey: platformSettings.aiApiKey,
        model: platformSettings.aiModel,
        baseUrl: platformSettings.aiApiBaseUrl,
      });
      toast.success(res.data?.message || 'AI Connection verified successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to connect to AI provider with this key.');
    } finally {
      setTestingAI(false);
    }
  };

  const handleProviderSelect = (provider: string) => {
    let defaultModel = 'gemini-1.5-flash';
    let defaultName = 'Google Gemini';
    let defaultBaseUrl = '';

    if (provider === 'live_ai_measurement') {
      defaultModel = 'live-scan-v1';
      defaultName = 'Live_AI_Measurement';
      defaultBaseUrl = 'https://api.liveaimeasurement.com/v1/scan';
    } else if (provider === 'snapaimeasure') {
      defaultModel = 'snap-measure-v2';
      defaultName = 'SnapAIMeasure';
      defaultBaseUrl = 'https://api.snapaimeasure.com/v1/body-measure';
    } else if (provider === 'openai') {
      defaultModel = 'gpt-4o';
      defaultName = 'OpenAI Vision';
      defaultBaseUrl = 'https://api.openai.com/v1/chat/completions';
    } else if (provider === 'claude') {
      defaultModel = 'claude-3-5-sonnet-20241022';
      defaultName = 'Anthropic Claude';
      defaultBaseUrl = 'https://api.anthropic.com/v1/messages';
    } else if (provider === 'custom') {
      defaultModel = 'custom-v1';
      defaultName = 'Custom AI Provider';
      defaultBaseUrl = '';
    }

    setPlatformSettings((prev) => ({
      ...prev,
      aiProvider: provider,
      aiProviderName: defaultName,
      aiModel: defaultModel,
      aiApiBaseUrl: defaultBaseUrl,
    }));
  };

  const handleAddSpecialty = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = newSpecialty.trim();
    if (!trimmed) return;
    if (!platformSettings.specialtiesList.includes(trimmed)) {
      setPlatformSettings((prev) => ({
        ...prev,
        specialtiesList: [...prev.specialtiesList, trimmed],
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (item: string) => {
    setPlatformSettings((prev) => ({
      ...prev,
      specialtiesList: prev.specialtiesList.filter((s) => s !== item),
    }));
  };

  // Stats calculation
  const totalTailors = users.filter((u) => u.role === 'tailor').length;
  const totalCustomers = users.filter((u) => u.role === 'customer').length;
  const activeCount = users.filter((u) => u.isActive).length;

  const filteredFeedbacks = feedbacks.filter((f) => 
    feedbackCategoryFilter === 'all' ? true : f.category === feedbackCategoryFilter
  );

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
            <Shield className="h-7 w-7 mr-2 text-primary-600" />
            {t('admin.title')}
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {t('admin.subtitle')}
          </p>
        </div>

        <button
          onClick={loadData}
          className="btn-secondary text-xs flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t('admin.refreshBtn')}</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => { handleTabChange('users'); setRoleFilter('tailor'); }}
          className={`card !p-4 flex items-center space-x-3 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
            activeTab === 'users' && roleFilter === 'tailor' ? 'ring-2 ring-purple-500' : ''
          }`}
          title="Filter tailor accounts"
        >
          <div className={`p-3 rounded-xl ${isDark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
            <Scissors className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('admin.totalTailors')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalTailors}</p>
          </div>
        </div>

        <div 
          onClick={() => { handleTabChange('users'); setRoleFilter('customer'); }}
          className={`card !p-4 flex items-center space-x-3 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
            activeTab === 'users' && roleFilter === 'customer' ? 'ring-2 ring-blue-500' : ''
          }`}
          title="Filter customer accounts"
        >
          <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('admin.totalCustomers')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalCustomers}</p>
          </div>
        </div>

        <div 
          onClick={() => handleTabChange('approvals')}
          className={`card !p-4 flex items-center space-x-3 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
            activeTab === 'approvals' ? 'ring-2 ring-yellow-500' : ''
          }`}
          title="View pending tailor approvals"
        >
          <div className={`p-3 rounded-xl ${isDark ? 'bg-yellow-900/40 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('admin.pendingApprovals')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingTailors.length}</p>
          </div>
        </div>

        <div 
          onClick={() => handleTabChange('feedback')}
          className={`card !p-4 flex items-center space-x-3 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all ${
            activeTab === 'feedback' ? 'ring-2 ring-emerald-500' : ''
          }`}
          title="View received customer & tailor feedback"
        >
          <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
            <MessageSquareHeart className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('admin.clientFeedback')}</p>
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{feedbacks.length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => handleTabChange('users')}
          className={`py-2.5 px-3 sm:px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <User className="h-4 w-4" />
          <span>{t('admin.tabs.users')}</span>
        </button>

        <button
          onClick={() => handleTabChange('approvals')}
          className={`py-2.5 px-3 sm:px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap relative ${
            activeTab === 'approvals'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <Scissors className="h-4 w-4" />
          <span>{t('admin.tabs.approvals')}</span>
          {pendingTailors.length > 0 && (
            <span className="ml-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingTailors.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('feedback')}
          className={`py-2.5 px-3 sm:px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'feedback'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <MessageSquareHeart className="h-4 w-4" />
          <span>{t('admin.tabs.feedback')} ({feedbacks.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('settings')}
          className={`py-2.5 px-3 sm:px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>{t('admin.tabs.settings')}</span>
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
              <option value="all">{t('admin.users.roleFilter.all')}</option>
              <option value="tailor">{t('admin.users.roleFilter.tailor')}</option>
              <option value="customer">{t('admin.users.roleFilter.customer')}</option>
              <option value="admin">{t('admin.users.roleFilter.admin')}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm py-2"
            >
              <option value="all">{t('admin.users.statusFilter.all')}</option>
              <option value="active">{t('admin.users.statusFilter.active')}</option>
              <option value="deactivated">{t('admin.users.statusFilter.deactivated')}</option>
            </select>
          </form>

          {/* User Table */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="card text-center py-12">
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('admin.users.noResults')}</p>
            </div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-gray-700 bg-gray-800/60 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                      <th className="p-4">{t('admin.users.tableHeaders.user')}</th>
                      <th className="p-4">{t('admin.users.tableHeaders.role')}</th>
                      <th className="p-4">{t('admin.users.tableHeaders.location')}</th>
                      <th className="p-4">{t('admin.users.tableHeaders.status')}</th>
                      <th className="p-4">{t('admin.users.tableHeaders.joined')}</th>
                      <th className="p-4 text-right">{t('admin.users.tableHeaders.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((u) => (
                      <tr key={u.id} className={`hover:${isDark ? 'bg-gray-750' : 'bg-gray-50/50'} transition-colors`}>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                                {u.name?.slice(0, 2).toUpperCase() || 'U'}
                              </div>
                            )}
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
                          {u.location || t('admin.users.notProvided')}
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {u.isActive ? t('admin.users.active') : t('admin.users.deactivated')}
                          </span>
                        </td>

                        <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setSelectedUser(u)}
                              className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                              title={t('admin.users.tooltips.viewProfile')}
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleStartDirectMessage(u.id)}
                                disabled={actionLoadingId === u.id}
                                className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400"
                                title={t('admin.users.tooltips.message')}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleActive(u.id)}
                              disabled={actionLoadingId === u.id}
                              className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${u.isActive ? 'text-amber-600' : 'text-green-600'}`}
                              title={u.isActive ? t('admin.users.tooltips.deactivate') : t('admin.users.tooltips.activate')}
                            >
                              <Power className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={actionLoadingId === u.id}
                              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                              title={t('admin.users.tooltips.delete')}
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
              {t('admin.approvals.title')} ({pendingTailors.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : pendingTailors.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2 opacity-80" />
              <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('admin.approvals.emptyTitle')}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.approvals.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTailors.map((tailor: any) => (
                <div key={tailor.id} className={`flex flex-col md:flex-row md:items-center md:justify-between p-4 ${isDark ? 'bg-gray-700/60' : 'bg-gray-50'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="space-y-1 mb-4 md:mb-0">
                    <div className="flex items-center space-x-2">
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tailor.user?.name}</p>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">{t('admin.approvals.pendingBadge')}</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{tailor.user?.email} • {tailor.user?.location || t('admin.approvals.locationUnspecified')}</p>
                    {tailor.bio && <p className={`text-xs italic ${isDark ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>"{tailor.bio}"</p>}
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.approvals.appliedOn')} {new Date(tailor.createdAt || tailor.user?.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartDirectMessage(tailor.id)}
                      className="btn-secondary text-xs flex items-center space-x-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{t('admin.approvals.messageBtn')}</span>
                    </button>

                    <button
                      onClick={() => handleApprove(tailor.id)}
                      disabled={actionLoadingId === tailor.id}
                      className="btn-primary text-xs flex items-center space-x-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{actionLoadingId === tailor.id ? t('admin.approvals.processing') : t('admin.approvals.approveBtn')}</span>
                    </button>

                    <button
                      onClick={() => handleReject(tailor.id)}
                      disabled={actionLoadingId === tailor.id}
                      className="btn-danger text-xs flex items-center space-x-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>{t('admin.approvals.rejectBtn')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER FEEDBACK INBOX */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="card !p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <MessageSquareHeart className="w-5 h-5 mr-2 text-purple-600" />
                  {t('admin.feedback.title')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {feedbacks.length} {t('admin.feedback.totalBadge')}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                {t('admin.feedback.subtitle')}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={loadFeedbackOnly}
                disabled={refreshingFeedback}
                className="btn-secondary text-xs py-2 px-3 flex items-center space-x-1.5 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingFeedback ? 'animate-spin text-purple-500' : ''}`} />
                <span>{refreshingFeedback ? t('admin.feedback.refreshing') : t('admin.feedback.refreshBtn')}</span>
              </button>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'general', 'tailoring', 'ai_measurement', 'feature', 'bug'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFeedbackCategoryFilter(cat)}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-semibold capitalize transition-all ${
                      feedbackCategoryFilter === cat
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : isDark
                          ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat === 'all' ? t('admin.feedback.categoryAll') : t(`admin.feedback.categories.${cat}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback Items List */}
          {filteredFeedbacks.length === 0 ? (
            <div className="card text-center py-16">
              <MessageSquareHeart className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t('admin.feedback.emptyTitle')}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('admin.feedback.emptyDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeedbacks.map((fb) => {
                const badge = FEEDBACK_CATEGORIES[fb.category] || FEEDBACK_CATEGORIES.general;
                return (
                  <div 
                    key={fb.id}
                    className={`card relative border transition-all ${
                      isDark ? 'border-gray-800 bg-gray-800/80 hover:border-gray-700' : 'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className={`text-xs font-semibold mt-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {fb.name || t('admin.feedback.anonymous')} <span className="text-gray-400 font-normal">({fb.email || t('admin.feedback.noEmail')})</span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-1">
                        {fb.userId && (
                          <button
                            onClick={() => handleStartDirectMessage(fb.userId)}
                            className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/60"
                            title="Direct Message Client"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteFeedback(fb.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Mark as Resolved / Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-sm leading-relaxed p-3 rounded-xl ${
                      isDark ? 'bg-gray-900/60 text-gray-200' : 'bg-gray-50 text-gray-800'
                    }`}>
                      "{fb.message}"
                    </p>

                    <p className={`text-[10px] mt-2.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {t('admin.feedback.receivedOn')} {new Date(fb.createdAt).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="card space-y-6">
            <div className="border-b dark:border-gray-700 pb-4 flex items-center justify-between">
              <div>
                <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
                  <Settings className="w-5 h-5 mr-2 text-primary-600" />
                  {t('admin.settings.title')}
                </h2>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('admin.settings.subtitle')}
                </p>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="btn-primary text-sm flex items-center space-x-2 shadow-lg"
              >
                {savingSettings ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('admin.settings.saveBtn')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Global Announcement Banner */}
              <div className="space-y-2 md:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Globe className="w-4 h-4 inline mr-1 text-purple-500" /> {t('admin.settings.announcementLabel')}
                </label>
                <textarea
                  value={platformSettings.announcementBanner}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, announcementBanner: e.target.value })}
                  rows={2}
                  className="input-field text-sm resize-none"
                />
                <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('admin.settings.announcementHint')}
                </p>
              </div>

              {/* 2. Platform Commission Rate (%) */}
              <div className="space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('admin.settings.commissionLabel')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={platformSettings.commissionRate}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, commissionRate: e.target.value })}
                  className="input-field text-sm"
                />
                <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {t('admin.settings.commissionHint')}
                </p>
              </div>

              {/* 3. Maintenance Mode Toggle */}
              <div className="space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('admin.settings.maintenanceLabel')}
                </label>
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  platformSettings.maintenanceMode 
                    ? 'bg-amber-500/10 border-amber-500/50' 
                    : isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div>
                    <p className={`text-xs font-bold ${platformSettings.maintenanceMode ? 'text-amber-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                      {platformSettings.maintenanceMode ? t('admin.settings.maintenanceModeOn') : t('admin.settings.maintenanceModeOff')}
                    </p>
                    <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {t('admin.settings.maintenanceHint')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlatformSettings({ ...platformSettings, maintenanceMode: !platformSettings.maintenanceMode })}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      platformSettings.maintenanceMode ? 'bg-amber-500' : 'bg-gray-400'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      platformSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              {/* 4. Specialties Tag Manager */}
              <div className="space-y-3 md:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Tag className="w-4 h-4 inline mr-1 text-purple-500" /> {t('admin.settings.specialtiesLabel')}
                </label>
                
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyDown={handleAddSpecialty}
                    className="input-field text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpecialty}
                    className="btn-primary text-xs px-4 flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('admin.settings.addSpecialtyBtn')}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {platformSettings.specialtiesList.map((item) => (
                    <span
                      key={item}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                        isDark 
                          ? 'bg-purple-950/40 border-purple-800 text-purple-300' 
                          : 'bg-purple-50 border-purple-200 text-purple-700'
                      }`}
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(item)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 5. AI 3D Body Measurement Engine & API Key Switcher */}
              <div className={`p-4 rounded-2xl border space-y-4 md:col-span-2 ${
                isDark ? 'bg-gradient-to-r from-purple-950/30 to-gray-800 border-purple-800/50' : 'bg-gradient-to-r from-purple-50 to-white border-purple-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 dark:border-gray-700">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('admin.settings.aiSectionTitle')}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t('admin.settings.aiSectionSubtitle')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestAIConnection}
                    disabled={testingAI}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5 font-bold shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    {testingAI ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Cpu className="w-3.5 h-3.5 text-purple-500" />
                    )}
                    <span>{testingAI ? t('admin.settings.testingBtn') : t('admin.settings.testConnectionBtn')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Select Preset Provider */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t('admin.settings.aiProviderLabel')}
                    </label>
                    <select
                      value={platformSettings.aiProvider}
                      onChange={(e) => handleProviderSelect(e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="gemini">Google Gemini Vision (Default)</option>
                      <option value="live_ai_measurement">Live_AI_Measurement</option>
                      <option value="snapaimeasure">SnapAIMeasure</option>
                      <option value="openai">OpenAI Vision (GPT-4o)</option>
                      <option value="claude">Anthropic Claude (3.5 Sonnet)</option>
                      <option value="custom">Custom AI Provider (Any Name / Key)</option>
                    </select>
                  </div>

                  {/* Provider Name */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t('admin.settings.providerNameLabel')}
                    </label>
                    <input
                      type="text"
                      value={platformSettings.aiProviderName}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, aiProviderName: e.target.value })}
                      className="input-field text-sm font-semibold"
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Key className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                      {t('admin.settings.apiKeyLabel')} *
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={platformSettings.aiApiKey}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, aiApiKey: e.target.value })}
                        className="input-field text-sm font-mono pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className={`absolute right-1.5 top-1.5 text-[10px] px-2 py-1 rounded font-semibold transition-colors ${
                          isDark ? 'bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {showApiKey ? t('admin.settings.hideKey') : t('admin.settings.showKey')}
                      </button>
                    </div>
                  </div>

                  {/* Model / Engine Version */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t('admin.settings.modelLabel')}
                    </label>
                    <input
                      type="text"
                      value={platformSettings.aiModel}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, aiModel: e.target.value })}
                      className="input-field text-sm font-mono"
                    />
                  </div>

                  {/* Custom API Base URL */}
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {t('admin.settings.apiUrlLabel')}
                    </label>
                    <input
                      type="text"
                      value={platformSettings.aiApiBaseUrl}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, aiApiBaseUrl: e.target.value })}
                      className="input-field text-sm font-mono"
                    />
                  </div>
                </div>

                <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  💡 {t('admin.settings.aiHint')}
                </p>
              </div>
            </div>
          </div>
        </form>
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
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    {selectedUser.name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
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
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('admin.modal.email')}:</span>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('admin.modal.phone')}:</span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{selectedUser.phone || t('admin.users.notProvided')}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('admin.modal.location')}:</span>
                <span className={isDark ? 'text-white' : 'text-gray-900'}>{selectedUser.location || t('admin.users.notProvided')}</span>
              </div>
              <div className="flex justify-between py-1 border-b dark:border-gray-700">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{t('admin.modal.accountStatus')}:</span>
                <span className={`font-semibold ${selectedUser.isActive ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedUser.isActive ? t('admin.modal.active') : t('admin.modal.deactivated')}
                </span>
              </div>

              {selectedUser.tailor && (
                <div className="pt-2 space-y-2">
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('admin.modal.tailorDetails')}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{selectedUser.tailor.bio}</p>
                  {selectedUser.tailor.basePricingMin && (
                    <p className="text-xs font-semibold text-primary-600">
                      {t('admin.modal.pricing')}: ${Number(selectedUser.tailor.basePricingMin)} - ${Number(selectedUser.tailor.basePricingMax)}
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
                  <span>{t('admin.modal.messageBtn')}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="btn-secondary text-xs"
              >
                {t('admin.modal.closeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}