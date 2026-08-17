import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from '../locales/en.json';
import amTranslations from '../locales/am.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  am: {
    translation: amTranslations,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('stitchmatch_lang') || 'en', // Explicit default to English
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'stitchmatch_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // React already escapes XSS
    },
  });

// Apply document language attribute on language change
const applyDocumentLang = (lng: string) => {
  const normalized = lng ? lng.split('-')[0] : 'en';
  document.documentElement.lang = normalized === 'am' ? 'am' : 'en';
};

// Initial run
applyDocumentLang(i18n.language);

i18n.on('languageChanged', (lng) => {
  applyDocumentLang(lng);
  localStorage.setItem('stitchmatch_lang', lng);
});

export default i18n;
