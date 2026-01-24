import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru',
    lng: 'ru',
    debug: import.meta.env.DEV,
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    ns: ['common', 'navigation', 'dashboard', 'auth', 'landing', 'leaderboard', 'fitnessData', 'body', 'trainer', 'goals', 'habits', 'home', 'challenges', 'progress', 'feed', 'supplements', 'workouts', 'mobileGoals', 'challengeDetail', 'goalDetail', 'habitDetail', 'workoutDetail', 'admin', 'health', 'notFound', 'profile', 'landingAI', 'trainerDashboard', 'habitTeams', 'recommendations', 'medicalDocs', 'trainingPlan', 'privacy', 'biomarkerDetail', 'metricDetail', 'habitTeamDetail', 'integrations', 'insights', 'units', 'errors', 'activity', 'dashboardPage', 'categoryDetail', 'loader', 'statsGrid', 'healthScore', 'trainerHealth', 'widgets', 'biostack', 'terraDiagnostics', 'gamification', 'testing', 'notifications', 'wellness', 'bodyComposition'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
