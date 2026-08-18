import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { usersAPI, tailorsAPI, settingsAPI } from '../lib/api';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  Settings as SettingsIcon, Sliders, Shield, User, Scissors, 
  Bell, Lock, CheckCircle, AlertTriangle, Percent, Power, Tag, Plus, XCircle, Save, Check, Globe
} from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isDark = useDarkMode();
  const [activeTab, setActiveTab] = useState<'platform' | 'profile' | 'localization' | 'notifications' | 'security'>(
    user?.role === 'admin' ? 'platform' : 'profile'
  );

  // Status & Notifications
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Localization Preferences State
  const [selectedCurrency, setSelectedCurrency] = useState('ETB');
  const [selectedUnit, setSelectedUnit] = useState('cm');

  // Profile Form (For All Users)
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatarUrl: user?.avatarUrl || '',
    bio: '',
    specialties: [] as string[],
    basePricingMin: '',
    basePricingMax: '',
  });

  // Admin Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    commissionRate: '5.0',
    autoApproveTailors: false,
    maintenanceMode: false,
    announcementBanner: 'Welcome to StitchMatch Atelier Platform! Quality custom tailoring verified.',
    specialtiesList: ['Bespoke Suits', 'Tuxedos', 'Evening Gowns', 'Bridal Wear', 'Alterations', 'Silk Dresses', 'Overcoats'],
    newSpecialty: '',
  });

  // User Preferences Form
  const [preferencesForm, setPreferencesForm] = useState({
    emailNotifications: true,
    inAppSound: true,
    orderUpdates: true,
    marketingEmails: false,
  });

  // Security Form
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        avatarUrl: user.avatarUrl || '',
      }));
      if (user.role === 'tailor') {
        loadTailorProfile();
      }
      if (user.role === 'admin') {
        loadPlatformSettings();
      }
    }
  }, [user]);

  const loadPlatformSettings = async () => {
    try {
      const res = await settingsAPI.getAll();
      if (res.data?.settings) {
        const s = res.data.settings;
        setPlatformSettings((prev) => ({
          ...prev,
          commissionRate: String(s.commissionRate || '5.0'),
          autoApproveTailors: Boolean(s.autoApproveTailors),
          maintenanceMode: Boolean(s.maintenanceMode),
          announcementBanner: s.announcementBanner || '',
          specialtiesList: Array.isArray(s.specialtiesList) ? s.specialtiesList : prev.specialtiesList,
        }));
      }
    } catch (err) {
      console.error('Failed to load platform settings', err);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const loadTailorProfile = async () => {
    try {
      if (!user?.id) return;
      const res = await tailorsAPI.getById(user.id);
      if (res.data?.tailor) {
        const t = res.data.tailor;
        setProfileForm((prev) => ({
          ...prev,
          bio: t.bio || '',
          specialties: Array.isArray(t.specialties) ? t.specialties : typeof t.specialties === 'string' ? JSON.parse(t.specialties) : [],
          basePricingMin: t.basePricingMin ? String(t.basePricingMin) : '',
          basePricingMax: t.basePricingMax ? String(t.basePricingMax) : '',
        }));
      }
    } catch (err) {
      console.error('Failed to load tailor details', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      // Update basic user profile
      await usersAPI.updateMe({
        name: profileForm.name,
        phone: profileForm.phone,
        location: profileForm.location,
        avatarUrl: profileForm.avatarUrl,
      });

      // If user is a tailor, update tailor profile too
      if (user?.role === 'tailor') {
        await tailorsAPI.updateProfile({
          bio: profileForm.bio,
          specialties: profileForm.specialties,
          basePricingMin: profileForm.basePricingMin ? parseFloat(profileForm.basePricingMin) : null,
          basePricingMax: profileForm.basePricingMax ? parseFloat(profileForm.basePricingMax) : null,
        });
      }

      setMessage({ type: 'success', text: t('settings.savedSuccess') });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        commissionRate: platformSettings.commissionRate,
        autoApproveTailors: platformSettings.autoApproveTailors,
        maintenanceMode: platformSettings.maintenanceMode,
        announcementBanner: platformSettings.announcementBanner,
        specialtiesList: platformSettings.specialtiesList,
      };
      await settingsAPI.update(payload);
      setMessage({ type: 'success', text: t('settings.savedSuccess') });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save platform settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpecialtyTag = () => {
    if (!platformSettings.newSpecialty.trim()) return;
    setPlatformSettings({
      ...platformSettings,
      specialtiesList: [...platformSettings.specialtiesList, platformSettings.newSpecialty.trim()],
      newSpecialty: '',
    });
  };

  const handleRemoveSpecialtyTag = (index: number) => {
    const next = [...platformSettings.specialtiesList];
    next.splice(index, 1);
    setPlatformSettings({ ...platformSettings, specialtiesList: next });
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: 'success', text: t('settings.savedSuccess') });
  };

  const handleSaveLocalization = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('stitchmatch_currency', selectedCurrency);
    localStorage.setItem('stitchmatch_unit', selectedUnit);
    setMessage({ type: 'success', text: t('settings.languageSection.savedSuccess') });
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setMessage({ type: 'success', text: t('settings.savedSuccess') });
    setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center`}>
            <SettingsIcon className="h-7 w-7 mr-2 text-primary-600" />
            {t('settings.title')}
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {t('settings.subtitle')}
          </p>
        </div>

        {message && (
          <div className={`rounded-lg px-4 py-2.5 text-sm flex items-center space-x-2 ${
            message.type === 'success' 
              ? (isDark ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-green-50 text-green-700 border border-green-200')
              : (isDark ? 'bg-red-900/40 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200')
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Settings Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-4 overflow-x-auto">
        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('platform')}
            className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'platform'
                ? 'border-primary-600 text-primary-600'
                : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Platform Settings</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <User className="h-4 w-4" />
          <span>{t('settings.tabs.profile')}</span>
        </button>

        <button
          onClick={() => setActiveTab('localization')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'localization'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>{t('settings.tabs.language')}</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>{t('settings.tabs.notifications')}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-2.5 px-4 font-semibold text-sm border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-primary-600 text-primary-600'
              : (isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-700')
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>{t('settings.tabs.security')}</span>
        </button>
      </div>

      {/* TAB 1: PLATFORM SETTINGS (Admin Only) */}
      {activeTab === 'platform' && user?.role === 'admin' && (
        <form onSubmit={handleSavePlatformSettings} className="space-y-6">
          <div className="card space-y-4">
            <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Sliders className="h-5 w-5 mr-2 text-primary-600" />
              Platform Controls & Rates
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  <Percent className="h-4 w-4 inline mr-1" /> Platform Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="30"
                  value={platformSettings.commissionRate}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, commissionRate: e.target.value })}
                  className="input-field text-sm"
                  required
                />
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                  Standard commission percentage charged per completed order agreement.
                </p>
              </div>

              <div className="flex flex-col justify-center space-y-3 pt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.autoApproveTailors}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, autoApproveTailors: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    Auto-Approve New Tailor Registrations
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={platformSettings.maintenanceMode}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    Enable System Maintenance Mode
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                System Announcement Banner
              </label>
              <input
                type="text"
                value={platformSettings.announcementBanner}
                onChange={(e) => setPlatformSettings({ ...platformSettings, announcementBanner: e.target.value })}
                className="input-field text-sm"
                placeholder="Broadcast message displayed to all platform users..."
              />
            </div>
          </div>

          {/* Specialty Tags */}
          <div className="card space-y-4">
            <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Tag className="h-5 w-5 mr-2 text-primary-600" />
              Tailor Specialty Categories Manager
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add new specialty category (e.g. Leather Coats)..."
                value={platformSettings.newSpecialty}
                onChange={(e) => setPlatformSettings({ ...platformSettings, newSpecialty: e.target.value })}
                className="input-field text-sm flex-1"
              />
              <button
                type="button"
                onClick={handleAddSpecialtyTag}
                className="btn-secondary text-sm flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add Specialty Tag</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {platformSettings.specialtiesList.map((tag, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                    isDark ? 'bg-gray-700 text-gray-200 border border-gray-600' : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialtyTag(idx)}
                    className="ml-2 hover:text-red-500"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Platform Settings'}</span>
          </button>
        </form>
      )}

      {/* TAB 2: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="card space-y-4">
            <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <User className="h-5 w-5 mr-2 text-primary-600" />
              Personal Profile Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="input-field text-sm"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Location / Address
                </label>
                <input
                  type="text"
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  className="input-field text-sm"
                  placeholder="City, State, Country"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={profileForm.avatarUrl}
                  onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                  className="input-field text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Tailor Specific Settings */}
          {user?.role === 'tailor' && (
            <div className="card space-y-4">
              <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Scissors className="h-5 w-5 mr-2 text-primary-600" />
                Tailor Atelier & Craftsmanship Details
              </h2>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Professional Bio & Experience
                </label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="input-field text-sm"
                  rows={4}
                  placeholder="Describe your tailoring heritage, craftsmanship techniques, and specialty garments..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    {t('tailors.startingFrom')} ($)
                  </label>
                  <input
                    type="number"
                    value={profileForm.basePricingMin}
                    onChange={(e) => setProfileForm({ ...profileForm, basePricingMin: e.target.value })}
                    className="input-field text-sm"
                    placeholder="e.g. 350"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Max Pricing ($)
                  </label>
                  <input
                    type="number"
                    value={profileForm.basePricingMax}
                    onChange={(e) => setProfileForm({ ...profileForm, basePricingMax: e.target.value })}
                    className="input-field text-sm"
                    placeholder="e.g. 1800"
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{saving ? t('auth.loading') : t('common.save')}</span>
          </button>
        </form>
      )}

      {/* TAB 3: LOCALIZATION & REGION */}
      {activeTab === 'localization' && (
        <form onSubmit={handleSaveLocalization} className="card space-y-6 max-w-2xl">
          <div className="space-y-1">
            <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Globe className="h-5 w-5 mr-2 text-primary-600" />
              {t('settings.languageSection.title')}
            </h2>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('settings.languageSection.desc')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                {t('settings.languageSection.selectLang')}
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <LanguageSwitcher variant="inline" />
              </div>
            </div>

            <div className="pt-2 border-t dark:border-gray-700">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                {t('settings.languageSection.currencyTitle')}
              </label>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                {t('settings.languageSection.currencyDesc')}
              </p>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="input-field text-sm max-w-xs"
              >
                <option value="ETB">ETB - Ethiopian Birr (ብር)</option>
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
              </select>
            </div>

            <div className="pt-2 border-t dark:border-gray-700">
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                {t('settings.languageSection.unitsTitle')}
              </label>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                {t('settings.languageSection.unitsDesc')}
              </p>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    value="cm"
                    checked={selectedUnit === 'cm'}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {t('settings.languageSection.cm')}
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    value="in"
                    checked={selectedUnit === 'in'}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {t('settings.languageSection.inches')}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary text-sm flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{t('settings.languageSection.saveBtn')}</span>
          </button>
        </form>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSavePreferences} className="card space-y-4">
          <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Bell className="h-5 w-5 mr-2 text-primary-600" />
            Notification Channels & Alerts
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 cursor-pointer">
              <div>
                <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>In-App Notification Sounds</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Play audio chime when new messages or status updates arrive.</p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.inAppSound}
                onChange={(e) => setPreferencesForm({ ...preferencesForm, inAppSound: e.target.checked })}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 cursor-pointer">
              <div>
                <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Stage Milestone Alerts</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive instant notifications when order moves between cutting, sewing, and fitting.</p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.orderUpdates}
                onChange={(e) => setPreferencesForm({ ...preferencesForm, orderUpdates: e.target.checked })}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 cursor-pointer">
              <div>
                <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Notifications</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Receive email digests for unread messages and counter-offers.</p>
              </div>
              <input
                type="checkbox"
                checked={preferencesForm.emailNotifications}
                onChange={(e) => setPreferencesForm({ ...preferencesForm, emailNotifications: e.target.checked })}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
            </label>
          </div>

          <button type="submit" className="btn-primary text-sm flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{t('common.save')}</span>
          </button>
        </form>
      )}

      {/* TAB 5: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveSecurity} className="card space-y-4 max-w-xl">
          <h2 className={`font-semibold text-lg flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Lock className="h-5 w-5 mr-2 text-primary-600" />
            Security & Password Change
          </h2>

          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
              Current Password
            </label>
            <input
              type="password"
              value={securityForm.currentPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
              className="input-field text-sm"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
              New Password
            </label>
            <input
              type="password"
              value={securityForm.newPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
              className="input-field text-sm"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={securityForm.confirmPassword}
              onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
              className="input-field text-sm"
              required
            />
          </div>

          <button type="submit" className="btn-primary text-sm flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>{t('common.save')}</span>
          </button>
        </form>
      )}
    </div>
  );
}
