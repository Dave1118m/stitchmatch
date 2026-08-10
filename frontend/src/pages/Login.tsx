import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { Scissors } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isDark = useDarkMode();
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-primary-50 via-white to-purple-50'} flex items-center justify-center p-3 sm:p-4`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <Scissors className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
            <span className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>StitchMatch</span>
          </Link>
          <p className={isDark ? 'text-gray-300 mt-2 text-sm sm:text-base' : 'text-gray-600 mt-2 text-sm sm:text-base'}>Welcome back! Sign in to your account</p>
        </div>

        <div className="card !p-4 sm:!p-6">
          {error && (
            <div className={`mb-4 p-3 ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700'} rounded-lg text-sm`}>{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field text-sm sm:text-base"
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-sm sm:text-base"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-sm sm:text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? 'border-gray-600' : 'border-gray-300'}`} /></div>
              <div className="relative flex justify-center text-sm"><span className={`${isDark ? 'bg-gray-800 px-2 text-gray-400' : 'bg-white px-2 text-gray-500'}`}>Or continue with</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button className="btn-secondary flex items-center justify-center text-sm">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Google
              </button>
              <button className="btn-secondary flex items-center justify-center text-sm">
                <img src="https://www.facebook.com/favicon.ico" alt="Facebook" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> Facebook
              </button>
            </div>
          </div>
        </div>

        <p className={`text-center mt-4 sm:mt-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Don't have an account? <Link to="/register" className="text-primary-600 hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}