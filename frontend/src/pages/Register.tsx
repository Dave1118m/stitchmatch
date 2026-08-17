import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Scissors } from 'lucide-react';

export default function Register() {
  const { t } = useTranslation();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') === 'tailor' ? 'tailor' : 'customer';

  const [form, setForm] = useState({ name: '', email: '', password: '', role: initialRole, phone: '', location: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations matching backend Zod schema
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError('Password must contain at least one number');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const isDark = useDarkMode();
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-primary-50 via-white to-purple-50'} flex flex-col items-center justify-center p-3 sm:p-4 relative`}>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <LanguageSwitcher variant="dropdown" />
      </div>

      <div className="w-full max-w-md">
        <div className={`text-center mb-6 sm:mb-8`}>
          <Link to="/" className="inline-flex items-center space-x-2">
            <Scissors className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
            <span className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('nav.brand')}</span>
          </Link>
          <p className={isDark ? 'text-gray-300 mt-2 text-sm sm:text-base' : 'text-gray-600 mt-2 text-sm sm:text-base'}>{t('auth.registerSubtitle')}</p>
        </div>

        <div className="card !p-4 sm:!p-6">
          {error && <div className={`mb-4 p-3 ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'} rounded-lg text-sm font-medium`}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.nameLabel')}</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder={t('auth.namePlaceholder')} className="input-field text-sm sm:text-base" required />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.emailLabel')}</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={t('auth.emailPlaceholder')} className="input-field text-sm sm:text-base" required />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.passwordLabel')}</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={t('auth.passwordPlaceholder')} className="input-field text-sm sm:text-base" required minLength={8} />
              <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Must be at least 8 characters with 1 uppercase letter & 1 number.</p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>{t('auth.phoneLabel')}</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder={t('auth.phonePlaceholder')} className="input-field text-sm sm:text-base" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-sm sm:text-base">
              {loading ? t('auth.loading') : t('auth.createAccountBtn')}
            </button>
          </form>
        </div>

        <p className={`text-center mt-4 sm:mt-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {t('auth.alreadyAccount')} <Link to="/login" className="text-primary-600 hover:underline font-medium">{t('auth.signInBtn')}</Link>
        </p>
      </div>
    </div>
  );
}