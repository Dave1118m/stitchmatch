import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'dropdown' | 'inline';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDark = useDarkMode();

  const currentLang = i18n.language?.startsWith('am') ? 'am' : 'en';

  const languages = [
    { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸', short: 'EN' },
    { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ', flag: '🇪🇹', short: 'አማ' },
  ];

  const activeLanguage = languages.find((l) => l.code === currentLang) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('stitchmatch_lang', code);
    setIsOpen(false);
  };

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-1 p-1 rounded-xl border ${
        isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-slate-100/90 border-slate-200'
      } ${className}`}>
        {languages.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectLanguage(lang.code)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-sm'
                  : isDark
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/60'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <span className="text-sm">{lang.flag}</span>
              <span>{lang.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
          isDark
            ? 'bg-gray-800/90 border-gray-700 text-gray-200 hover:border-gray-500 hover:bg-gray-750 shadow-sm'
            : 'bg-white/90 border-slate-200 text-gray-700 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
        }`}
      >
        <Globe className="h-4 w-4 text-primary-500 flex-shrink-0" />
        <span className="flex items-center space-x-1">
          <span>{activeLanguage.flag}</span>
          <span className="font-semibold tracking-wide">{activeLanguage.nativeLabel}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-xl border z-50 overflow-hidden backdrop-blur-lg animate-in fade-in zoom-in-95 duration-150 ${
            isDark
              ? 'bg-gray-800/95 border-gray-700 divide-y divide-gray-700/60'
              : 'bg-white/95 border-slate-200 divide-y divide-slate-100'
          }`}
        >
          <div className="p-1.5 space-y-1">
            {languages.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-primary-900/40 text-primary-300'
                        : 'bg-primary-50 text-primary-700'
                      : isDark
                      ? 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
                      : 'text-gray-700 hover:bg-slate-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <div>
                      <div className="font-semibold leading-tight">{lang.nativeLabel}</div>
                      <div className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{lang.label}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
