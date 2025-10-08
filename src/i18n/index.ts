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
    debug: true,
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    }
  });

console.log('i18n initialized with language:', i18n.language);

export default i18n;