import { ru, enUS } from 'date-fns/locale';
import i18n from '@/i18n';

/**
 * Returns the appropriate date-fns locale based on current i18n language
 */
export const getDateLocale = () => {
  return i18n.language === 'ru' ? ru : enUS;
};

/**
 * Returns the appropriate date format string based on current i18n language
 */
export const getDateFormat = () => {
  return i18n.language === 'ru' ? 'dd.MM.yyyy' : 'MM/dd/yyyy';
};

/**
 * Returns the appropriate date-time format string based on current i18n language
 */
export const getDateTimeFormat = () => {
  return i18n.language === 'ru' ? 'dd.MM.yyyy HH:mm' : 'MM/dd/yyyy h:mm a';
};

/**
 * Returns the appropriate time format string based on current i18n language
 */
export const getTimeFormat = () => {
  return i18n.language === 'ru' ? 'HH:mm' : 'h:mm a';
};

/**
 * Returns the appropriate Intl locale string based on current i18n language
 * Use for toLocaleString, toLocaleDateString, toLocaleTimeString
 */
export const getIntlLocale = () => {
  return i18n.language === 'ru' ? 'ru-RU' : 'en-US';
};
