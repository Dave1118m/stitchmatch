import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { notificationsAPI } from '../lib/api';
import { Scissors, MessageSquare, User, LogOut, Settings, Moon, Sun, Menu, X, Bell, ClipboardList, Shield } from 'lucide-react';

export default function Layout({ children }: { children: ReactNode }) {
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
  const isDark = useDarkMode();

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
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
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      loadNotifications();
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      loadNotifications();
      loadUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read', err);
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
    { path: '/dashboard', label: 'Requests', icon: ClipboardList, roles: ['customer', 'tailor', 'admin'] },
    { path: '/tailors', label: 'Find Tailors', icon: Scissors, roles: ['customer'] },
    { path: '/messages', label: 'Messages', icon: MessageSquare, roles: ['customer', 'tailor'] },
    { path: '/profile', label: 'Profile', icon: User, roles: ['customer', 'tailor', 'admin'] },
    { path: '/admin', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
  ];

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

          {/* Role Switcher & Bottom Bar */}
          <div className={`p-2 lg:p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
            <div>
              {sidebarOpen ? (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 px-1">
                    Switch Role
                  </p>
                  <div className={`p-1 rounded-xl flex items-center gap-1 ${darkMode ? 'bg-gray-900/60' : 'bg-gray-100'}`}>
                    {[
                      { role: 'customer', label: 'Customer', icon: User },
                      { role: 'tailor', label: 'Tailor', icon: Scissors },
                      { role: 'admin', label: 'Admin', icon: Shield },
                    ].map((r) => {
                      const RoleIcon = r.icon;
                      const isSelected = user?.role === r.role;
                      const isLoading = switchingRole === r.role;
                      return (
                        <button
                          key={r.role}
                          onClick={() => handleSwitchRole(r.role)}
                          disabled={switchingRole !== null}
                          title={`Switch to ${r.label}`}
                          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                              : darkMode
                              ? 'text-gray-400 hover:text-white hover:bg-gray-700/60'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                          } ${switchingRole !== null && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          ) : (
                            <RoleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          )}
                          <span className="truncate">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-2 flex flex-col items-center gap-1.5">
                  {[
                    { role: 'customer', label: 'Customer', icon: User },
                    { role: 'tailor', label: 'Tailor', icon: Scissors },
                    { role: 'admin', label: 'Admin', icon: Shield },
                  ].map((r) => {
                    const RoleIcon = r.icon;
                    const isSelected = user?.role === r.role;
                    const isLoading = switchingRole === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => handleSwitchRole(r.role)}
                        disabled={switchingRole !== null}
                        title={`Switch to ${r.label}`}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                            : darkMode
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RoleIcon className="w-4 h-4" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
              {sidebarOpen && <span className="font-medium">Settings</span>}
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
              {sidebarOpen && <span className="font-medium">Logout</span>}
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

              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={handleNotificationClick}
                    className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors relative`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Notification Dropdown */}
                  {showNotifications && (
                    <div className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-50`}>
                      <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No notifications</div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => markAsRead(notification.id)}
                              className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-opacity-50 transition-colors ${
                                !notification.read 
                                  ? darkMode ? 'bg-blue-900/20 border-gray-700' : 'bg-blue-50 border-gray-200' 
                                  : darkMode ? 'border-gray-700' : 'border-gray-200'
                              } ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-2 h-2 mt-2 rounded-full ${!notification.read ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                <div className="flex-1">
                                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{notification.title}</p>
                                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{notification.message}</p>
                                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {new Date(notification.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile */}
                <div className={`flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm`}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
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
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 px-1">
                  Switch Role
                </p>
                <div className={`p-1 rounded-xl flex items-center gap-1 ${darkMode ? 'bg-gray-900/60' : 'bg-gray-100'}`}>
                  {[
                    { role: 'customer', label: 'Customer', icon: User },
                    { role: 'tailor', label: 'Tailor', icon: Scissors },
                    { role: 'admin', label: 'Admin', icon: Shield },
                  ].map((r) => {
                    const RoleIcon = r.icon;
                    const isSelected = user?.role === r.role;
                    const isLoading = switchingRole === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => {
                          handleSwitchRole(r.role);
                          setMobileMenuOpen(false);
                        }}
                        disabled={switchingRole !== null}
                        className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                            : darkMode
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700/60'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {isLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        ) : (
                          <RoleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
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
                <span className="font-medium">Settings</span>
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
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
