import { EXERCISES, Exercise } from './exercises-database';
import i18n from '@/i18n';

// Base muscle group data without translated strings
const MUSCLE_GROUPS_DATA = {
  chest: {
    icon: '💪',
    color: 'hsl(0, 70%, 50%)',
    keywords: ['chest', 'грудь', 'pec', 'bench', 'жим', 'push-up', 'отжимания', 'fly', 'разводка']
  },
  back: {
    icon: '🔙',
    color: 'hsl(200, 70%, 50%)',
    keywords: ['back', 'спина', 'lat', 'row', 'тяга', 'pull-up', 'подтягивания', 'deadlift', 'становая']
  },
  legs: {
    icon: '🦵',
    color: 'hsl(30, 70%, 50%)',
    keywords: ['leg', 'ноги', 'squat', 'присед', 'lunge', 'выпад', 'quad', 'hamstring', 'glute', 'ягодиц', 'бедр', 'икр', 'calf']
  },
  shoulders: {
    icon: '🎯',
    color: 'hsl(280, 70%, 50%)',
    keywords: ['shoulder', 'плеч', 'delt', 'overhead', 'press', 'lateral', 'raise', 'махи']
  },
  arms: {
    icon: '💪',
    color: 'hsl(150, 70%, 50%)',
    keywords: ['arm', 'рук', 'bicep', 'бицепс', 'tricep', 'трицепс', 'curl', 'extension', 'французский']
  },
  core: {
    icon: '🔥',
    color: 'hsl(45, 70%, 50%)',
    keywords: ['core', 'кор', 'abs', 'пресс', 'plank', 'планка', 'crunch', 'скручивания', 'oblique']
  },
  cardio: {
    icon: '❤️',
    color: 'hsl(350, 70%, 50%)',
    keywords: ['cardio', 'кардио', 'run', 'бег', 'cycle', 'велосипед', 'swim', 'плавание', 'hiit', 'interval']
  }
} as const;

export type MuscleGroupKey = keyof typeof MUSCLE_GROUPS_DATA;

export interface MuscleGroupData {
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  keywords: readonly string[];
}

// Getter function with localization
export function getMuscleGroups(): Record<MuscleGroupKey, MuscleGroupData> {
  const keys = Object.keys(MUSCLE_GROUPS_DATA) as MuscleGroupKey[];
  const result = {} as Record<MuscleGroupKey, MuscleGroupData>;
  
  for (const key of keys) {
    const data = MUSCLE_GROUPS_DATA[key];
    result[key] = {
      icon: data.icon,
      color: data.color,
      keywords: data.keywords,
      name: i18n.t(`workouts:muscleGroups.${key}`),
      nameEn: i18n.t(`workouts:muscleGroups.${key}`, { lng: 'en' }),
    };
  }
  
  return result;
}

// Legacy export for backward compatibility (will use current language)
export const MUSCLE_GROUPS = getMuscleGroups();

// Дополнительный маппинг для неточных названий упражнений
const EXERCISE_ALIASES: Record<string, MuscleGroupKey[]> = {
  // Грудь
  'cable crossover': ['chest'],
  'incline press': ['chest', 'shoulders'],
  'decline press': ['chest'],
  'chest dip': ['chest', 'arms'],
  'pec deck': ['chest'],
  'bench incline press': ['chest', 'shoulders'],
  'fly dumbbell': ['chest'],
  'bench press': ['chest'],
  'push up': ['chest', 'arms'],
  'pushup': ['chest', 'arms'],
  
  // Спина
  'lat pulldown': ['back'],
  't-bar row': ['back'],
  'cable row': ['back'],
  'hyperextension': ['back', 'core'],
  'good morning': ['back', 'legs'],
  'face pull': ['back', 'shoulders'],
  'chinup': ['back', 'arms'],
  'pullup': ['back', 'arms'],
  'chin-up': ['back', 'arms'],
  'pull-up': ['back', 'arms'],
  'chinup pullup': ['back', 'arms'],
  'bent row': ['back'],
  'bent row dumbbells': ['back'],
  'bent over row': ['back'],
  'seated row': ['back'],
  
  // Ноги
  'hack squat': ['legs'],
  'front squat': ['legs', 'core'],
  'romanian deadlift': ['legs', 'back'],
  'leg extension': ['legs'],
  'leg curl': ['legs'],
  'hip thrust': ['legs'],
  'calf raise': ['legs'],
  'box jump': ['legs', 'cardio'],
  'lunges': ['legs'],
  'lunge': ['legs'],
  'lunges alternating': ['legs'],
  'alternating lunges': ['legs'],
  'walking lunges': ['legs'],
  'split squat': ['legs'],
  'bulgarian split squat': ['legs'],
  'goblet squat': ['legs'],
  'leg press': ['legs'],
  
  // Плечи
  'arnold press': ['shoulders'],
  'front raise': ['shoulders'],
  'rear delt fly': ['shoulders', 'back'],
  'upright row': ['shoulders'],
  'shrug': ['shoulders'],
  'overhead press': ['shoulders'],
  'overhead press barbell': ['shoulders'],
  'military press': ['shoulders'],
  'lateral raise': ['shoulders'],
  'shoulder press': ['shoulders'],
  
  // Руки
  'hammer curl': ['arms'],
  'preacher curl': ['arms'],
  'skull crusher': ['arms'],
  'dip': ['arms', 'chest'],
  'dips': ['arms', 'chest'],
  'close grip bench': ['arms', 'chest'],
  'cable curl': ['arms'],
  'rope pushdown': ['arms'],
  'biceps curl': ['arms'],
  'biceps cable': ['arms'],
  'biceps dumbbell': ['arms'],
  'triceps cable': ['arms'],
  'triceps extension': ['arms'],
  'triceps pushdown': ['arms'],
  
  // Кор
  'russian twist': ['core'],
  'leg raise': ['core'],
  'legs hanging raise': ['core'],
  'hanging leg raise': ['core'],
  'mountain climber': ['core', 'cardio'],
  'ab wheel': ['core'],
  'dead bug': ['core'],
  'bird dog': ['core', 'back'],
  'hollow hold': ['core'],
  'plank': ['core'],
  'side plank': ['core'],
  'sit-up': ['core'],
  'situp': ['core'],
  'sit up': ['core'],
  'crunch': ['core'],
  'crunches': ['core'],
  
  // Кардио
  'treadmill': ['cardio'],
  'elliptical': ['cardio'],
  'rowing machine': ['cardio', 'back'],
  'jump rope': ['cardio'],
  'burpee': ['cardio', 'legs', 'chest'],
  'battle rope': ['cardio', 'arms', 'core'],
  'running': ['cardio'],
  'cycling': ['cardio'],
  'swimming': ['cardio'],
};

/**
 * Нормализует название упражнения для поиска
 */
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Находит упражнение в базе данных по названию (fuzzy search)
 */
export function findExerciseInDatabase(exerciseName: string): Exercise | null {
  const normalized = normalizeExerciseName(exerciseName);
  
  // Точное совпадение
  const exactMatch = EXERCISES.find(
    ex => normalizeExerciseName(ex.name) === normalized ||
          normalizeExerciseName(ex.nameRu) === normalized
  );
  if (exactMatch) return exactMatch;
  
  // Частичное совпадение
  const partialMatch = EXERCISES.find(
    ex => normalizeExerciseName(ex.name).includes(normalized) ||
          normalizeExerciseName(ex.nameRu).includes(normalized) ||
          normalized.includes(normalizeExerciseName(ex.name)) ||
          normalized.includes(normalizeExerciseName(ex.nameRu))
  );
  if (partialMatch) return partialMatch;
  
  return null;
}

/**
 * Маппит название упражнения на группы мышц
 */
export function mapExerciseToMuscleGroups(exerciseName: string): MuscleGroupKey[] {
  const normalized = normalizeExerciseName(exerciseName);
  
  // Сначала ищем в базе упражнений
  const exercise = findExerciseInDatabase(exerciseName);
  if (exercise) {
    return [exercise.category];
  }
  
  // Проверяем алиасы
  for (const [alias, groups] of Object.entries(EXERCISE_ALIASES)) {
    if (normalized.includes(normalizeExerciseName(alias)) ||
        normalizeExerciseName(alias).includes(normalized)) {
      return groups;
    }
  }
  
  // Ищем по ключевым словам в группах мышц
  const matchedGroups: MuscleGroupKey[] = [];
  for (const [group, data] of Object.entries(MUSCLE_GROUPS)) {
    const hasKeywordMatch = data.keywords.some(keyword => 
      normalized.includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(normalized)
    );
    if (hasKeywordMatch) {
      matchedGroups.push(group as MuscleGroupKey);
    }
  }
  
  if (matchedGroups.length > 0) {
    return matchedGroups;
  }
  
  // Не удалось определить - возвращаем пустой массив
  return [];
}

/**
 * Анализирует список упражнений и возвращает статистику по группам мышц
 */
export function analyzeExercisesMuscleDistribution(
  exercises: Array<{ name: string; sets?: number; reps?: number; weight?: number }>
): Record<MuscleGroupKey, { count: number; exercises: string[]; totalSets: number }> {
  const distribution: Record<MuscleGroupKey, { count: number; exercises: string[]; totalSets: number }> = {
    chest: { count: 0, exercises: [], totalSets: 0 },
    back: { count: 0, exercises: [], totalSets: 0 },
    legs: { count: 0, exercises: [], totalSets: 0 },
    shoulders: { count: 0, exercises: [], totalSets: 0 },
    arms: { count: 0, exercises: [], totalSets: 0 },
    core: { count: 0, exercises: [], totalSets: 0 },
    cardio: { count: 0, exercises: [], totalSets: 0 }
  };
  
  for (const exercise of exercises) {
    const muscleGroups = mapExerciseToMuscleGroups(exercise.name);
    const sets = exercise.sets || 1;
    
    for (const group of muscleGroups) {
      distribution[group].count += 1;
      if (!distribution[group].exercises.includes(exercise.name)) {
        distribution[group].exercises.push(exercise.name);
      }
      distribution[group].totalSets += sets;
    }
  }
  
  return distribution;
}

/**
 * Возвращает отсутствующие группы мышц на основе списка упражнений
 */
export function findMissingMuscleGroups(
  exercises: Array<{ name: string }>
): MuscleGroupKey[] {
  const distribution = analyzeExercisesMuscleDistribution(exercises);
  return (Object.keys(distribution) as MuscleGroupKey[]).filter(
    group => distribution[group].count === 0
  );
}
