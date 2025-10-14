import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ru from './locales/ru.json';
import bg from './locales/bg.json';

const resources = {
  en: {
    translation: en
  },
  ru: {
    translation: ru
  },
  bg: {
    translation: bg
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'bg'],
    load: 'languageOnly', // map en-GB, ru-RU -> en, ru
    defaultNS: 'translation',
    debug: true,

    detection: {
      // Avoid picking up path/subdomain like "/auth" as language
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    }
  });

// Keep <html lang> in sync and sanitize unsupported values
const supported = new Set(['en', 'ru', 'bg']);
i18n.on('languageChanged', (lng) => {
  const lang = (lng || 'en').split('-')[0];
  if (!supported.has(lang)) {
    // Prevent infinite loop - only change if different
    if (i18n.language !== 'en') {
      i18n.changeLanguage('en');
    }
    localStorage.setItem('i18nextLng', 'en');
    if (typeof document !== 'undefined') document.documentElement.lang = 'en';
    return;
  }
  localStorage.setItem('i18nextLng', lang);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
});

console.log('i18n initialized with language:', i18n.language);

export default i18n;