import { WORKOUT_TYPE_ICONS, getWorkoutIcon as getWorkoutTypeIcon } from './workout-types';

/**
 * Get emoji icon for workout type based on name
 */
export function getWorkoutIcon(workoutType: string): string {
  // First try direct lookup
  if (WORKOUT_TYPE_ICONS[workoutType]) {
    return WORKOUT_TYPE_ICONS[workoutType];
  }

  // Try case-insensitive and fuzzy matching
  const normalized = workoutType.toLowerCase().trim();
  
  // Common patterns
  const patterns: Record<string, string> = {
    'бег': '🏃',
    'run': '🏃',
    'велосипед': '🚴',
    'cycle': '🚴',
    'bike': '🚴',
    'сайкл': '🚴',
    'прогулка': '🚶',
    'walk': '🚶',
    'ходьба': '🚶',
    'хайкинг': '⛰️',
    'hik': '⛰️',
    'плавание': '🏊',
    'swim': '🏊',
    'силовая': '🏋️',
    'тяжелая': '🏋️',
    'weight': '🏋️',
    'функциональная': '💪',
    'кроссфит': '💪',
    'crossfit': '💪',
    'functional': '💪',
    'hiit': '⚡',
    'йога': '🧘',
    'yoga': '🧘',
    'пилатес': '🤸',
    'pilates': '🤸',
    'баскетбол': '🏀',
    'basket': '🏀',
    'футбол': '⚽',
    'soccer': '⚽',
    'football': '⚽',
    'теннис': '🎾',
    'tennis': '🎾',
    'гольф': '⛳',
    'golf': '⛳',
    'бокс': '🥊',
    'box': '🥊',
    'единоборства': '🥋',
    'martial': '🥋',
    'джиу': '🥋',
    'танцы': '💃',
    'dance': '💃',
    'гребля': '🚣',
    'row': '🚣',
    'скалолазание': '🧗',
    'climb': '🧗',
    'лыжи': '⛷️',
    'ski': '⛷️',
    'сноуборд': '🏂',
    'snowboard': '🏂',
    'серфинг': '🏄',
    'surf': '🏄',
    'хоккей': '🏒',
    'hockey': '🏒',
    'катание': '⛸️',
    'skating': '⛸️',
    'горный': '🚵',
    'mountain': '🚵',
    'эллипс': '🏃',
    'elliptical': '🏃',
    'степпер': '🪜',
    'stair': '🪜',
    'медитация': '🧘',
    'meditation': '🧘',
    'растяжка': '🤸',
    'stretch': '🤸',
    'сауна': '🧖',
    'sauna': '🧖',
    'ледяная': '🧊',
    'ice bath': '🧊',
    'триатлон': '🏊',
    'triathlon': '🏊',
    'гимнастика': '🤸',
    'gymnastics': '🤸',
    'волейбол': '🏐',
    'volley': '🏐',
    'бейсбол': '⚾',
    'baseball': '⚾',
    'крикет': '🏏',
    'cricket': '🏏',
    'регби': '🏉',
    'rugby': '🏉',
    'пиклбол': '🎾',
    'pickleball': '🎾',
    'настольный': '🏓',
    'table tennis': '🏓',
    'бадминтон': '🏸',
    'badminton': '🏸',
  };

  // Try to find a pattern match
  for (const [key, icon] of Object.entries(patterns)) {
    if (normalized.includes(key)) {
      return icon;
    }
  }

  // Fallback to workout-types function
  return getWorkoutTypeIcon(workoutType);
}
