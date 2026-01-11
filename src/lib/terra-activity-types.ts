/**
 * Terra Activity Type Code to readable name mapping
 * Based on Terra API documentation
 * 
 * Uses i18n for localized activity names
 */
import i18n from '@/i18n';

/**
 * Mapping of Terra activity type codes to i18n keys
 */
const TERRA_ACTIVITY_KEYS: Record<number, string> = {
  0: 'activity',
  1: 'running',
  2: 'cycling',
  8: 'running', // Garmin Running type
  15: 'elliptical',
  16: 'baseball',
  17: 'basketball',
  18: 'rowing',
  19: 'fencing',
  20: 'fieldHockey',
  21: 'americanFootball',
  22: 'golf',
  24: 'hockey',
  25: 'lacrosse',
  27: 'rugby',
  28: 'sailing',
  29: 'skiing',
  30: 'soccer',
  31: 'softball',
  32: 'squash',
  33: 'swimming',
  34: 'tennis',
  35: 'trackAndField',
  36: 'volleyball',
  37: 'waterPolo',
  38: 'wrestling',
  39: 'boxing',
  42: 'dancing',
  43: 'pilates',
  44: 'yoga',
  45: 'strengthTraining',
  47: 'crossCountrySkiing',
  48: 'crossfit',
  49: 'duathlon',
  51: 'gymnastics',
  52: 'hiking',
  53: 'equestrianSports',
  55: 'kayaking',
  56: 'martialArts',
  57: 'mountainBiking',
  59: 'powerlifting',
  60: 'climbing',
  61: 'paddleboarding',
  62: 'triathlon',
  63: 'functionalTraining',
  64: 'surfing',
  65: 'ellipticalTrainer',
  66: 'stepper',
  70: 'meditation',
  71: 'other',
  73: 'diving',
  74: 'tacticalOps',
  75: 'medicalOps',
  76: 'flying',
  77: 'waterOps',
  82: 'ultimate',
  83: 'climbing',
  84: 'jumpRope',
  85: 'aussieFootball',
  86: 'skateboarding',
  87: 'coaching',
  88: 'iceBath',
  89: 'walking',
  90: 'gaming',
  91: 'snowboarding',
  92: 'motocross',
  93: 'caddy',
  94: 'obstacleRace',
  95: 'racing',
  96: 'hiit',
  97: 'spin',
  98: 'jiujitsu',
  99: 'manualLabor',
  100: 'cricket',
  101: 'pickleball',
  102: 'rollerSkating',
  103: 'fitnessBoxing',
  104: 'spikeball',
  105: 'wheelchair',
  106: 'paddleTennis',
  107: 'barre',
  108: 'stagePerformance',
  109: 'stressWork',
  110: 'parkour',
  111: 'gaelicFootball',
  112: 'hurling',
  121: 'circusArts',
  125: 'massage',
  230: 'watchingSport',
  231: 'assaultBike',
  232: 'kickboxing',
  233: 'stretching',
  234: 'tableTennis',
  235: 'badminton',
  236: 'netball',
  237: 'sauna',
  238: 'discGolf',
  239: 'gardening',
  240: 'airCompression',
  241: 'percussionMassage',
  242: 'paintball',
  243: 'figureSkating',
  244: 'handball',
};

/**
 * Map Terra activity type code to localized readable name
 */
export function mapTerraActivityType(activityType: string | number | null | undefined, provider?: string): string {
  if (!activityType) {
    return i18n.t('workouts:terraActivities.workout');
  }

  // If it's already a string (Withings, etc.), return as is
  if (typeof activityType === 'string') {
    // Try to parse if it's a numeric string
    const parsed = parseInt(activityType, 10);
    if (!isNaN(parsed)) {
      const key = TERRA_ACTIVITY_KEYS[parsed];
      if (key) {
        return i18n.t(`workouts:terraActivities.${key}`);
      }
      return i18n.t('workouts:terraActivities.activityCode', { code: parsed });
    }
    return activityType;
  }

  // For Whoop, Garmin, Ultrahuman - use numeric code mapping
  const numericType = typeof activityType === 'number' ? activityType : parseInt(activityType, 10);
  
  if (isNaN(numericType)) {
    return i18n.t('workouts:terraActivities.workout');
  }

  const key = TERRA_ACTIVITY_KEYS[numericType];
  if (key) {
    return i18n.t(`workouts:terraActivities.${key}`);
  }

  return i18n.t('workouts:terraActivities.activityCode', { code: numericType });
}

/**
 * @deprecated Use mapTerraActivityType function instead
 * Kept for backward compatibility
 */
export const TERRA_ACTIVITY_TYPES: Record<number, string> = new Proxy({} as Record<number, string>, {
  get(target, prop) {
    if (typeof prop === 'string') {
      const numericType = parseInt(prop, 10);
      if (!isNaN(numericType)) {
        const key = TERRA_ACTIVITY_KEYS[numericType];
        if (key) {
          return i18n.t(`workouts:terraActivities.${key}`);
        }
        return i18n.t('workouts:terraActivities.activityCode', { code: numericType });
      }
    }
    return i18n.t('workouts:terraActivities.workout');
  }
});
