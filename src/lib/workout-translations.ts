/**
 * Translation utilities for workout names
 * Uses i18n for localized workout names
 */
import i18n from '@/i18n';

/**
 * Mapping of English workout names to i18n keys
 */
const WORKOUT_KEYS: Record<string, string> = {
  // Recovery & Wellness
  'sauna': 'sauna',
  'ice bath': 'iceBath',
  'meditation': 'meditation',
  'stretching': 'stretching',
  'massage therapy': 'massage',
  'massage': 'massage',
  'yoga': 'yoga',
  'breathwork': 'breathwork',
  'nap': 'nap',
  'recovery': 'recovery',
  
  // Cardio
  'walking': 'walking',
  'running': 'running',
  'cycling': 'cycling',
  'swimming': 'swimming',
  'hiking': 'hiking',
  'rowing': 'rowing',
  'elliptical': 'elliptical',
  'stair climbing': 'stairClimbing',
  'jump rope': 'jumpRope',
  'dance': 'dance',
  'aerobics': 'aerobics',
  'hiit': 'hiit',
  'cardio': 'cardio',
  
  // Strength
  'strength training': 'strengthTraining',
  'weightlifting': 'strengthTraining',
  'weight training': 'strengthTraining',
  'functional training': 'functionalTraining',
  'crossfit': 'crossfit',
  'calisthenics': 'calisthenics',
  'bodyweight': 'bodyweight',
  
  // Sports
  'tennis': 'tennis',
  'golf': 'golf',
  'basketball': 'basketball',
  'football': 'football',
  'soccer': 'soccer',
  'volleyball': 'volleyball',
  'boxing': 'boxing',
  'martial arts': 'martialArts',
  'skiing': 'skiing',
  'snowboarding': 'snowboarding',
  'surfing': 'surfing',
  'paddleboarding': 'paddleboarding',
  
  // Generic
  'workout': 'workout',
  'whoop workout': 'workout',
  'activity': 'activity',
  'other': 'other',
  'unknown': 'workout',
};

/**
 * Russian workout names for detection in mixed strings
 */
const RUSSIAN_WORKOUT_KEYS: Record<string, string> = {
  'бег': 'running',
  'прогулка': 'walking',
  'плавание': 'swimming',
  'велосипед': 'cycling',
  'йога': 'yoga',
  'силовая': 'strengthTraining',
  'тренировка': 'workout',
  'кардио': 'cardio',
  'растяжка': 'stretching',
  'медитация': 'meditation',
  'сауна': 'sauna',
};

/**
 * Translates workout name to the current locale
 * Handles English names, Russian names, and mixed strings with locations
 */
export function translateWorkoutName(name: string): string {
  if (!name) return i18n.t('workouts:activities.workout');
  
  const lowerName = name.toLowerCase().trim();
  
  // Direct English lookup
  const englishKey = WORKOUT_KEYS[lowerName];
  if (englishKey) {
    return i18n.t(`workouts:activities.${englishKey}`);
  }
  
  // Check if name contains a known English workout type (for names like "Morning Running")
  for (const [englishName, key] of Object.entries(WORKOUT_KEYS)) {
    if (lowerName.includes(englishName)) {
      return i18n.t(`workouts:activities.${key}`);
    }
  }
  
  // Check for Russian workout names in the string (for names like "Germasogeia Бег")
  for (const [russianName, key] of Object.entries(RUSSIAN_WORKOUT_KEYS)) {
    if (name.toLowerCase().includes(russianName)) {
      return i18n.t(`workouts:activities.${key}`);
    }
  }
  
  // Return original if no translation found (might already be in the target language)
  return name;
}

/**
 * @deprecated Use translateWorkoutName function instead
 * Kept for backward compatibility - now uses i18n dynamically
 */
export const WORKOUT_TRANSLATIONS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(target, prop) {
    if (typeof prop === 'string') {
      const lowerProp = prop.toLowerCase();
      const key = WORKOUT_KEYS[lowerProp];
      if (key) {
        return i18n.t(`workouts:activities.${key}`);
      }
    }
    return prop as string;
  }
});
