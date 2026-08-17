import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '../hooks/useDarkMode';
import joinCustomerImg from '../assets/join_customer_client.jpg';
import joinTailorImg from '../assets/join_tailor_artisan.jpg';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Scissors, User, ArrowRight } from 'lucide-react';

export default function Join() {
  const { t } = useTranslation();
  const isDark = useDarkMode();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'tailor' | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      navigate(`/register?role=${selectedRole}`);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800' : 'bg-gradient-to-br from-primary-50 via-white to-purple-50'}`}>
      
      {/* Header */}
      <header className={`py-6 px-8 flex justify-between items-center w-full`}>
        <Link to="/" className="inline-flex items-center space-x-2">
          <Scissors className="h-8 w-8 text-primary-600" />
          <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('nav.brand')}</span>
        </Link>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher variant="dropdown" />
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {t('join.alreadyHaveAccount')} <Link to="/login" className="text-primary-600 hover:underline">{t('join.signIn')}</Link>
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <h1 className={`text-3xl sm:text-4xl font-bold mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('join.title')}
          </h1>

          <div className="grid sm:grid-cols-2 gap-6 mb-8 text-left">
            {/* Customer Card */}
            <div 
              onClick={() => setSelectedRole('customer')}
              className={`relative overflow-hidden rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                selectedRole === 'customer' 
                  ? 'border-primary-600 shadow-xl shadow-primary-900/20 scale-[1.02]' 
                  : isDark 
                    ? 'border-gray-700 bg-gray-800 hover:border-gray-500 hover:shadow-lg' 
                    : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg'
              }`}
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={joinCustomerImg} 
                  alt="Customer looking at bespoke clothes" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center space-x-2">
                      <User className="h-6 w-6 text-white" />
                      <h3 className="text-xl font-bold text-white">{t('nav.customer')}</h3>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === 'customer' ? 'border-primary-500 bg-primary-500' : 'border-white/50'
                    }`}>
                      {selectedRole === 'customer' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('join.customerTitle')}</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {t('join.customerDesc')}
                </p>
              </div>
            </div>

            {/* Tailor Card */}
            <div 
              onClick={() => setSelectedRole('tailor')}
              className={`relative overflow-hidden rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                selectedRole === 'tailor' 
                  ? 'border-primary-600 shadow-xl shadow-primary-900/20 scale-[1.02]' 
                  : isDark 
                  ? 'border-gray-700 bg-gray-800 hover:border-gray-500 hover:shadow-lg' 
                  : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-lg'
              }`}
            >
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={joinTailorImg} 
                  alt="Tailor working in atelier" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center space-x-2">
                      <Scissors className="h-6 w-6 text-white" />
                      <h3 className="text-xl font-bold text-white">{t('nav.tailor')}</h3>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === 'tailor' ? 'border-primary-500 bg-primary-500' : 'border-white/50'
                    }`}>
                      {selectedRole === 'tailor' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('join.tailorTitle')}</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {t('join.tailorDesc')}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`px-8 py-3 rounded-xl font-bold flex items-center justify-center mx-auto space-x-2 transition-all ${
              selectedRole 
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg' 
                : isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{selectedRole ? `${t('join.continue')} ${selectedRole === 'tailor' ? t('nav.tailor') : t('nav.customer')}` : t('auth.createAccountBtn')}</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
