/**
 * @deprecated Use 'react-i18next' with useTranslation hook instead
 * 
 * Migration guide:
 * ```typescript
 * // Old way (deprecated):
 * import { useTranslation } from "@/lib/translations";
 * const { t } = useTranslation();
 * 
 * // New way:
 * import { useTranslation } from 'react-i18next';
 * const { t } = useTranslation('navigation'); // specify namespace
 * ```
 * 
 * Translation files are in: public/locales/{lang}/{namespace}.json
 * Available namespaces: 'common', 'navigation'
 */

// Re-export from react-i18next for backward compatibility
export { useTranslation } from 'react-i18next';

// Legacy stub function for direct imports (deprecated)
export const t = (key: string, _params?: Record<string, any>): string => {
  console.warn(`[i18n] Direct t() usage is deprecated. Use useTranslation hook from 'react-i18next'. Key: ${key}`);
  return key;
};
