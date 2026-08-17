import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { notificationsAPI } from '../lib/api';
import { getSocket } from '../lib/socket';
import { showBrowserNotification } from '../lib/pushNotifications';
import LanguageSwitcher from './LanguageSwitcher';
import { 
  Scissors, MessageSquare, User, LogOut, Settings, Moon, Sun, Menu, X, 
  Bell, ClipboardList, Shield, ChevronDown, Check, CheckCheck, Trash2, 
  Star, ShoppingBag, ShieldCheck, AlertCircle, Clock
} from 'lucide-react';

function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Melodic two-tone glass chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.1); // B5
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Autoplay policy fallback
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const isDark = useDarkMode();

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Handle outside click for both dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load initial notification unread count
  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  // Real-Time Socket.IO Notification Listener
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    const handleNewNotification = (newNotif: any) => {
      console.log('[Real-Time Notification Received]:', newNotif);
      
      // 1. Play audio chime
      playNotificationChime();

      // 2. Increment badge count
      setUnreadCount((prev) => prev + 1);

      // 3. Prepend to active list
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);

      // 4. Trigger Web Push / OS Notification if backgrounded or visible
      showBrowserNotification(newNotif.title || 'StitchMatch Notification', {
        body: newNotif.message || 'You have an update regarding your order.',
        icon: '/favicon.ico',
        tag: `notif-${newNotif.id}`,
      });
    };

    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification', handleNewNotification);
    };
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      setUnreadCount(res.data.unread || 0);
    } catch (err) {
      console.error('Failed to load unread count', err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const handleNotificationClick = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      loadNotifications();
      loadUnreadCount();
    }
  };

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsAPI.delete(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleNotificationItemClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setShowNotifications(false);

    // Route dynamically based on notification type
    switch (notification.type) {
      case 'message':
        navigate('/messages');
        break;
      case 'request':
      case 'order':
      case 'measurement_ready':
      case 'measurement_failed':
        navigate('/dashboard');
        break;
      case 'approval':
      case 'review':
        navigate('/profile');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchRole = async (targetRole: string) => {
    if (!user || user.role === targetRole || switchingRole) return;
    setSwitchingRole(targetRole);
    try {
      await switchRole(targetRole);
      if (targetRole === 'admin' && location.pathname !== '/admin') {
        navigate('/admin');
      } else if (targetRole !== 'admin' && location.pathname === '/admin') {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to switch role', err);
    } finally {
      setSwitchingRole(null);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const mainNavLinks = [
    { path: '/dashboard', label: t('nav.requests'), icon: ClipboardList, roles: ['customer', 'tailor', 'admin'] },
    { path: '/tailors', label: t('nav.findTailors'), icon: Scissors, roles: ['customer'] },
    { path: '/messages', label: t('nav.messages'), icon: MessageSquare, roles: ['customer', 'tailor'] },
    { path: '/profile', label: t('nav.profile'), icon: User, roles: ['customer', 'tailor', 'admin'] },
    { path: '/admin', label: t('nav.adminPanel'), icon: Shield, roles: ['admin'] },
  ];

  const roleOptions = [
    { role: 'customer', label: t('nav.customer'), icon: User, description: t('nav.customerDesc') },
    { role: 'tailor', label: t('nav.tailor'), icon: Scissors, description: t('nav.tailorDesc') },
    { role: 'admin', label: t('nav.admin'), icon: Shield, description: t('nav.adminDesc') },
  ];

  const currentRoleObj = roleOptions.find((r) => r.role === user?.role) || roleOptions[0];
  const CurrentRoleIcon = currentRoleObj.icon;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex min-h-screen">
        {/* Sidebar - Desktop */}
        <aside className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg transition-all duration-300 fixed left-0 top-0 h-full z-40 hidden lg:flex lg:flex-col`}>
          {/* Logo */}
          <div className={`p-4 lg:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg flex-shrink-0">
                <Scissors className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              {sidebarOpen && (
                <span className={`text-lg lg:text-xl font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>StitchMatch</span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 lg:p-4 space-y-1 lg:space-y-2 overflow-y-auto">
            {mainNavLinks.map((link) =>
              link.roles.includes(user?.role || '') && (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-200 text-sm lg:text-base ${
                    isActive(link.path)
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                      : darkMode
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{link.label}</span>}
                </Link>
              )
            )}
          </nav>

          {/* Role Switcher Dropdown & Bottom Bar */}
          <div className={`p-2 lg:p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
            {/* Role Switcher Dropdown */}
            {sidebarOpen ? (
              <div className="relative" ref={roleDropdownRef}>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 px-1">
                  Active Role
                </label>
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white hover:bg-gray-700/70'
                      : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="p-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
                      <CurrentRoleIcon className="w-4 h-4" />
                    </div>
                    <span className="capitalize truncate font-semibold">{currentRoleObj.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popup */}
                {roleDropdownOpen && (
                  <div className={`absolute bottom-full left-0 mb-2 w-full min-w-[220px] rounded-2xl shadow-xl border overflow-hidden z-50 transition-all ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`px-3.5 py-2 border-b text-[10px] font-semibold uppercase tracking-wider ${
                      darkMode ? 'border-gray-700 text-gray-400 bg-gray-800/90' : 'border-gray-100 text-gray-500 bg-gray-50'
                    }`}>
                      Switch Account Role
                    </div>
                    <div className="p-1.5 space-y-1">
                      {roleOptions.map((r) => {
                        const OptionIcon = r.icon;
                        const isSelected = user?.role === r.role;
                        const isLoading = switchingRole === r.role;

                        return (
                          <button
                            key={r.role}
                            disabled={switchingRole !== null}
                            onClick={() => {
                              handleSwitchRole(r.role);
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full flex items-start space-x-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 text-left ${
                              isSelected
                                ? darkMode
                                  ? 'bg-purple-900/30 text-purple-300 font-semibold'
                                  : 'bg-purple-50 text-purple-700 font-semibold'
                                : darkMode
                                ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <div className={`mt-0.5 p-1 rounded-lg flex-shrink-0 ${
                              isSelected
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isLoading ? (
                                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <OptionIcon className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium leading-none">{r.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 ml-1" />}
                              </div>
                              <p className={`text-[10px] mt-1 line-clamp-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {r.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex justify-center" ref={roleDropdownRef}>
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  title={`Current Role: ${currentRoleObj.label}. Click to switch.`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                      : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <CurrentRoleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </button>

                {roleDropdownOpen && (
                  <div className={`absolute bottom-full left-12 mb-2 w-56 rounded-2xl shadow-xl border overflow-hidden z-50 transition-all ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`px-3.5 py-2 border-b text-[10px] font-semibold uppercase tracking-wider ${
                      darkMode ? 'border-gray-700 text-gray-400 bg-gray-800/90' : 'border-gray-100 text-gray-500 bg-gray-50'
                    }`}>
                      Switch Account Role
                    </div>
                    <div className="p-1.5 space-y-1">
                      {roleOptions.map((r) => {
                        const OptionIcon = r.icon;
                        const isSelected = user?.role === r.role;
                        const isLoading = switchingRole === r.role;

                        return (
                          <button
                            key={r.role}
                            disabled={switchingRole !== null}
                            onClick={() => {
                              handleSwitchRole(r.role);
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 text-left text-xs ${
                              isSelected
                                ? darkMode
                                  ? 'bg-purple-900/30 text-purple-300 font-semibold'
                                  : 'bg-purple-50 text-purple-700 font-semibold'
                                : darkMode
                                ? 'text-gray-300 hover:bg-gray-700/60'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <OptionIcon className="w-3.5 h-3.5" />
                              <span>{r.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/settings"
              className={`flex items-center space-x-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-200 text-sm lg:text-base ${
                isActive('/settings')
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Settings className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{t('nav.settings')}</span>}
            </Link>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-200 text-sm lg:text-base ${
                darkMode
                  ? 'text-gray-300 hover:bg-red-700/30 hover:text-red-400'
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{t('nav.logout')}</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} flex-1 transition-all duration-300 min-w-0`}>
          {/* Header */}
          <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-30`}>
            <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors hidden lg:block`}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors lg:hidden`}
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Language Switcher */}
                <LanguageSwitcher variant="dropdown" />

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  title={t('nav.toggleTheme')}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notificationsDropdownRef}>
                  <button 
                    onClick={handleNotificationClick}
                    aria-label={t('nav.notifications')}
                    className={`p-2 rounded-xl border transition-all relative ${
                      showNotifications
                        ? 'bg-purple-50 border-purple-300 dark:bg-purple-950/50 dark:border-purple-800 text-purple-600 dark:text-purple-400'
                        : darkMode 
                        ? 'border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-300' 
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 bg-gradient-to-r from-red-500 to-rose-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 transition-all ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                      {/* Dropdown Header */}
                      <div className={`p-3.5 border-b flex items-center justify-between ${
                        darkMode ? 'border-gray-700 bg-gray-900/60' : 'border-gray-100 bg-gray-50/80'
                      }`}>
                        <div className="flex items-center space-x-2">
                          <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <h3 className="font-bold text-sm">{t('nav.notifications')}</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        
                        {notifications.length > 0 && (
                          <div className="flex items-center space-x-1">
                            {unreadCount > 0 && (
                              <button
                                onClick={markAllAsRead}
                                title={t('nav.markAllRead')}
                                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 text-purple-400' 
                                    : 'hover:bg-purple-50 text-purple-600'
                                }`}
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span className="text-[11px] hidden sm:inline">{t('nav.markAllRead')}</span>
                              </button>
                            )}
                            <button
                              onClick={clearAllNotifications}
                              title="Clear all notifications"
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Dropdown List */}
                      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                        {notifications.length === 0 ? (
                          <div className="py-10 px-4 text-center">
                            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
                              darkMode ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-100 text-gray-400'
                            }`}>
                              <Bell className="w-6 h-6" />
                            </div>
                            <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {t('nav.noNotifications')}
                            </p>
                            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              Live updates about orders, messages, and requests will appear here.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notification) => {
                            const isUnread = !notification.read;
                            const type = notification.type;

                            return (
                              <div
                                key={notification.id}
                                onClick={() => handleNotificationItemClick(notification)}
                                className={`p-3.5 cursor-pointer transition-all flex items-start space-x-3 group relative ${
                                  isUnread 
                                    ? darkMode ? 'bg-purple-950/20 hover:bg-purple-950/40' : 'bg-purple-50/60 hover:bg-purple-50' 
                                    : darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                                }`}
                              >
                                {/* Type Icon Badge */}
                                <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                                  type === 'message'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                                    : type === 'review'
                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                                    : type === 'approval'
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                    : type === 'order'
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                                    : 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                                }`}>
                                  {type === 'message' && <MessageSquare className="w-4 h-4" />}
                                  {type === 'review' && <Star className="w-4 h-4" />}
                                  {type === 'approval' && <ShieldCheck className="w-4 h-4" />}
                                  {type === 'order' && <ShoppingBag className="w-4 h-4" />}
                                  {(type === 'request' || !type || type === 'general') && <Scissors className="w-4 h-4" />}
                                  {type?.startsWith('measurement') && <Scissors className="w-4 h-4" />}
                                </div>

                                <div className="flex-1 min-w-0 pr-6">
                                  <div className="flex items-center space-x-1.5">
                                    {isUnread && (
                                      <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0" />
                                    )}
                                    <p className={`text-xs sm:text-sm font-semibold truncate ${
                                      isUnread 
                                        ? (darkMode ? 'text-white' : 'text-gray-900') 
                                        : (darkMode ? 'text-gray-300' : 'text-gray-700')
                                    }`}>
                                      {notification.title}
                                    </p>
                                  </div>
                                  <p className={`text-xs mt-1 leading-relaxed ${
                                    darkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center space-x-1 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{new Date(notification.createdAt).toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Item Action Buttons */}
                                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  {isUnread && (
                                    <button
                                      onClick={(e) => markAsRead(notification.id, e)}
                                      title="Mark as read"
                                      className="p-1 rounded-md text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => deleteNotification(notification.id, e)}
                                    title="Delete notification"
                                    className="p-1 rounded-md text-gray-400 hover:text-red-500"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile */}
                <div className={`flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                  ) : (
                    <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm`}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden sm:block">
                    <p className={`text-xs sm:text-sm font-medium leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} capitalize`}>{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)}></div>
          <div className={`absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl flex flex-col`}>
            <div className={`p-4 sm:p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Link to="/" className="flex items-center space-x-3" onClick={() => setMobileMenuOpen(false)}>
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg flex-shrink-0">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
                <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>StitchMatch</span>
              </Link>
            </div>
            <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto">
              {mainNavLinks.map((link) =>
                link.roles.includes(user?.role || '') && (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-sm sm:text-base ${
                      isActive(link.path)
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : darkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <link.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                )
              )}
            </nav>
            <div className={`p-3 sm:p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} space-y-3`}>
              {/* Language Selection in Mobile Menu */}
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 px-1">
                  {t('nav.language')}
                </label>
                <LanguageSwitcher variant="inline" className="w-full justify-center" />
              </div>

              <div className="relative">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 px-1">
                  {t('nav.switchRole')}
                </label>
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 text-sm font-medium ${
                    darkMode
                      ? 'bg-gray-800/80 border-gray-700 text-white hover:bg-gray-700/70'
                      : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="p-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
                      <CurrentRoleIcon className="w-4 h-4" />
                    </div>
                    <span className="capitalize truncate font-semibold">{currentRoleObj.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${roleDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {roleDropdownOpen && (
                  <div className={`mt-2 rounded-2xl shadow-lg border overflow-hidden transition-all ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="p-1.5 space-y-1">
                      {roleOptions.map((r) => {
                        const OptionIcon = r.icon;
                        const isSelected = user?.role === r.role;
                        const isLoading = switchingRole === r.role;

                        return (
                          <button
                            key={r.role}
                            disabled={switchingRole !== null}
                            onClick={() => {
                              handleSwitchRole(r.role);
                              setRoleDropdownOpen(false);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left text-xs ${
                              isSelected
                                ? darkMode
                                  ? 'bg-purple-900/30 text-purple-300 font-semibold'
                                  : 'bg-purple-50 text-purple-700 font-semibold'
                                : darkMode
                                ? 'text-gray-300 hover:bg-gray-700/60'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <OptionIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span>{r.label}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-sm sm:text-base ${
                  isActive('/settings')
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">{t('nav.settings')}</span>
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-sm sm:text-base ${
                  darkMode
                    ? 'text-gray-300 hover:bg-red-700/30 hover:text-red-400'
                    : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
