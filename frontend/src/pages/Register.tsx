import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { Scissors } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer', phone: '', location: '' });
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
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isDark = useDarkMode();
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-primary-50 via-white to-purple-50'} flex items-center justify-center p-3 sm:p-4`}>
      <div className="w-full max-w-md">
        <div className={`text-center mb-6 sm:mb-8`}>
          <Link to="/" className="inline-flex items-center space-x-2">
            <Scissors className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
            <span className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>StitchMatch</span>
          </Link>
          <p className={isDark ? 'text-gray-300 mt-2 text-sm sm:text-base' : 'text-gray-600 mt-2 text-sm sm:text-base'}>Create your account</p>
        </div>

        <div className="card !p-4 sm:!p-6">
          {error && <div className={`mb-4 p-3 ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'} rounded-lg text-sm`}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>I am a</label>
              <select name="role" value={form.role} onChange={handleChange} className="input-field text-sm sm:text-base">
                <option value="customer">Customer</option>
                <option value="tailor">Tailor</option>
                <option value="admin">Admin</option>
              </select>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Tip: Register admin via CLI with: <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">cd backend && node seed-admin.js</code></p>
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field text-sm sm:text-base" required />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field text-sm sm:text-base" required />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field text-sm sm:text-base" required minLength={6} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Phone (optional)</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input-field text-sm sm:text-base" />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Location (optional)</label>
              <input name="location" value={form.location} onChange={handleChange} className="input-field text-sm sm:text-base" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-sm sm:text-base">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className={`text-center mt-4 sm:mt-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}