/**
 * User preference storage (localStorage only for UI state)
 * 
 * GOLDEN RULE: localStorage ONLY for user preferences, NEVER for server data
 * 
 * USE FOR:
 * - Theme (dark/light mode)
 * - Language selection
 * - UI collapsed/expanded states
 * - Dashboard layout preferences
 * - Feature flags
 * 
 * DO NOT USE FOR:
 * - Metrics data
 * - Workout data
 * - User profile data
 * - Any data from Supabase
 */

export class PreferenceStorage {
  /**
   * Clear ALL localStorage (use on logout)
   */
  static clearAll(): void {
    console.log('[PreferenceStorage] Clearing all preferences');
    localStorage.clear();
  }

  /**
   * Get preference with type safety
   */
  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn('[PreferenceStorage] Failed to parse:', key, error);
      return defaultValue;
    }
  }

  /**
   * Set preference
   */
  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('[PreferenceStorage] Failed to set:', key, error);
    }
  }

  /**
   * Remove preference
   */
  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Check if key exists
   */
  static has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}

// Convenience exports for common preferences
export const getTheme = () => PreferenceStorage.get<'light' | 'dark'>('theme', 'dark');
export const setTheme = (theme: 'light' | 'dark') => PreferenceStorage.set('theme', theme);

export const getLanguage = () => PreferenceStorage.get<string>('language', 'en');
export const setLanguage = (lang: string) => PreferenceStorage.set('language', lang);
