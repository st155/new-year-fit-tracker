/**
 * Exercise database with aliases for normalizing different spellings
 * to canonical names for consistent storage and display
 */

export interface ExerciseDefinition {
  id: string;
  canonicalName: string;
  displayName: string;
  displayNameRu: string;
  aliases: string[];
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full_body';
  muscleGroups: string[];
  equipment?: string;
  isBodyweight?: boolean;
}

export const EXERCISES_DATABASE: ExerciseDefinition[] = [
  // === CHEST ===
  {
    id: 'bench_press',
    canonicalName: 'Bench press',
    displayName: 'Bench Press',
    displayNameRu: 'Жим лёжа',
    aliases: [
      'bench press', 'bench', 'bench press barbell', 'barbell bench press', 'bp',
      'flat bench', 'flat bench press', 'жим лежа', 'жим лёжа', 'жим штанги лежа'
    ],
    category: 'chest',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    equipment: 'barbell'
  },
  {
    id: 'bench_incline_press',
    canonicalName: 'Bench incline press',
    displayName: 'Incline Bench Press',
    displayNameRu: 'Наклонный жим',
    aliases: [
      'bench incline press', 'incline bench', 'incline press', 'incline bench press',
      'incline dumbbell press', 'incline dumbbell', 'наклонный жим', 'жим на наклонной',
      'жим на наклонной скамье', 'incline'
    ],
    category: 'chest',
    muscleGroups: ['chest', 'shoulders', 'triceps'],
    equipment: 'barbell'
  },
  {
    id: 'fly_dumbbell',
    canonicalName: 'Fly dumbbell',
    displayName: 'Dumbbell Fly',
    displayNameRu: 'Разводка с гантелями',
    aliases: [
      'fly dumbbell', 'dumbbell fly', 'chest fly', 'fly', 'flyes',
      'разводка', 'разводка гантелей', 'разведение гантелей'
    ],
    category: 'chest',
    muscleGroups: ['chest'],
    equipment: 'dumbbell'
  },
  {
    id: 'pushups',
    canonicalName: 'Push-ups',
    displayName: 'Push-ups',
    displayNameRu: 'Отжимания',
    aliases: ['push-ups', 'pushups', 'push ups', 'pushup', 'отжимания', 'отжимания от пола'],
    category: 'chest',
    muscleGroups: ['chest', 'triceps', 'core'],
    isBodyweight: true
  },
  {
    id: 'dips',
    canonicalName: 'Dips',
    displayName: 'Dips',
    displayNameRu: 'Отжимания на брусьях',
    aliases: ['dips', 'dip', 'брусья', 'отжимания на брусьях', 'диплы'],
    category: 'chest',
    muscleGroups: ['chest', 'triceps', 'shoulders'],
    isBodyweight: true
  },

  // === BACK ===
  {
    id: 'chinup_pullup',
    canonicalName: 'Chinup pullup',
    displayName: 'Pull-ups',
    displayNameRu: 'Подтягивания',
    aliases: [
      'chinup pullup', 'chin up', 'chinup', 'pull up', 'pullup', 'pullups', 'chinups',
      'chin-up', 'pull-up', 'подтягивания', 'подтягивание', 'турник'
    ],
    category: 'back',
    muscleGroups: ['back', 'biceps'],
    isBodyweight: true
  },
  {
    id: 'bent_row_dumbbells',
    canonicalName: 'Bent row dumbbells',
    displayName: 'Dumbbell Row',
    displayNameRu: 'Тяга гантелей в наклоне',
    aliases: [
      'bent row dumbbells', 'bent over row', 'dumbbell row', 'db row', 'bent row',
      'тяга гантелей', 'тяга в наклоне', 'тяга гантели в наклоне', 'тяга гантелей в наклоне'
    ],
    category: 'back',
    muscleGroups: ['back', 'biceps'],
    equipment: 'dumbbell'
  },
  {
    id: 'barbell_row',
    canonicalName: 'Barbell row',
    displayName: 'Barbell Row',
    displayNameRu: 'Тяга штанги в наклоне',
    aliases: [
      'barbell row', 'bb row', 'bent over barbell row', 'pendlay row',
      'тяга штанги', 'тяга штанги в наклоне'
    ],
    category: 'back',
    muscleGroups: ['back', 'biceps'],
    equipment: 'barbell'
  },
  {
    id: 'lat_pulldown',
    canonicalName: 'Lat pulldown',
    displayName: 'Lat Pulldown',
    displayNameRu: 'Тяга верхнего блока',
    aliases: [
      'lat pulldown', 'pulldown', 'lat pull down', 'cable pulldown',
      'тяга верхнего блока', 'верхний блок', 'тяга блока к груди'
    ],
    category: 'back',
    muscleGroups: ['back', 'biceps'],
    equipment: 'cable'
  },
  {
    id: 'deadlift',
    canonicalName: 'Deadlift',
    displayName: 'Deadlift',
    displayNameRu: 'Становая тяга',
    aliases: ['deadlift', 'dead lift', 'становая', 'становая тяга', 'мертвая тяга'],
    category: 'back',
    muscleGroups: ['back', 'legs', 'core'],
    equipment: 'barbell'
  },
  {
    id: 'hyperextension',
    canonicalName: 'Hyperextension',
    displayName: 'Hyperextension',
    displayNameRu: 'Гиперэкстензия',
    aliases: [
      'hyperextension', 'hyper', 'hyperextensions', 'back extension',
      'гиперэкстензия', 'разгибание спины', 'экстензия'
    ],
    category: 'back',
    muscleGroups: ['back', 'glutes'],
    isBodyweight: true
  },

  // === SHOULDERS ===
  {
    id: 'overhead_press_barbell',
    canonicalName: 'Overhead press barbell',
    displayName: 'Overhead Press',
    displayNameRu: 'Жим штанги стоя',
    aliases: [
      'overhead press barbell', 'overhead press', 'ohp', 'military press', 'shoulder press',
      'press', 'standing press', 'жим стоя', 'армейский жим', 'жим штанги стоя',
      'жим над головой', 'жим штанги над головой'
    ],
    category: 'shoulders',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'barbell'
  },
  {
    id: 'overhead_press_dumbbell',
    canonicalName: 'Overhead press dumbbell',
    displayName: 'Dumbbell Shoulder Press',
    displayNameRu: 'Жим гантелей сидя',
    aliases: [
      'overhead press dumbbell', 'dumbbell press', 'db press', 'seated dumbbell press',
      'dumbbell shoulder press', 'жим гантелей', 'жим гантелей сидя', 'жим гантелей стоя'
    ],
    category: 'shoulders',
    muscleGroups: ['shoulders', 'triceps'],
    equipment: 'dumbbell'
  },
  {
    id: 'lateral_raise',
    canonicalName: 'Lateral raise',
    displayName: 'Lateral Raise',
    displayNameRu: 'Махи в стороны',
    aliases: [
      'lateral raise', 'side raise', 'lateral raises', 'side raises',
      'махи в стороны', 'разведение гантелей в стороны', 'махи гантелями'
    ],
    category: 'shoulders',
    muscleGroups: ['shoulders'],
    equipment: 'dumbbell'
  },
  {
    id: 'front_raise',
    canonicalName: 'Front raise',
    displayName: 'Front Raise',
    displayNameRu: 'Подъём гантелей перед собой',
    aliases: [
      'front raise', 'front raises', 'подъем перед собой', 'махи перед собой'
    ],
    category: 'shoulders',
    muscleGroups: ['shoulders'],
    equipment: 'dumbbell'
  },

  // === ARMS ===
  {
    id: 'biceps_dumbbell',
    canonicalName: 'Biceps dumbbell',
    displayName: 'Dumbbell Bicep Curl',
    displayNameRu: 'Подъём на бицепс с гантелями',
    aliases: [
      'biceps dumbbell', 'dumbbell curl', 'bicep curl', 'biceps curl', 'curls',
      'dumbbell bicep curl', 'db curl', 'бицепс гантели', 'подъем на бицепс',
      'сгибание на бицепс', 'бицепс с гантелями'
    ],
    category: 'arms',
    muscleGroups: ['biceps'],
    equipment: 'dumbbell'
  },
  {
    id: 'biceps_cable',
    canonicalName: 'Biceps cable',
    displayName: 'Cable Bicep Curl',
    displayNameRu: 'Бицепс на блоке',
    aliases: [
      'biceps cable', 'cable curl', 'cable bicep', 'cable curls',
      'бицепс блок', 'бицепс на блоке', 'сгибание на блоке'
    ],
    category: 'arms',
    muscleGroups: ['biceps'],
    equipment: 'cable'
  },
  {
    id: 'biceps_barbell',
    canonicalName: 'Biceps barbell',
    displayName: 'Barbell Curl',
    displayNameRu: 'Подъём штанги на бицепс',
    aliases: [
      'biceps barbell', 'barbell curl', 'bb curl', 'ez curl', 'ez bar curl',
      'biceps curl barbell', 'barbell bicep curl', 'bicep curl barbell',
      'подъем штанги на бицепс', 'бицепс со штангой', 'бицепс штанга'
    ],
    category: 'arms',
    muscleGroups: ['biceps'],
    equipment: 'barbell'
  },
  {
    id: 'triceps_cable',
    canonicalName: 'Triceps cable',
    displayName: 'Cable Tricep Pushdown',
    displayNameRu: 'Трицепс на блоке',
    aliases: [
      'triceps cable', 'cable triceps', 'pushdown', 'tricep pushdown', 'cable pushdown',
      'rope pushdown', 'трицепс блок', 'трицепс на блоке', 'разгибание на трицепс',
      'разгибание трицепс'
    ],
    category: 'arms',
    muscleGroups: ['triceps'],
    equipment: 'cable'
  },
  {
    id: 'triceps_dumbbell',
    canonicalName: 'Triceps dumbbell',
    displayName: 'Dumbbell Tricep Extension',
    displayNameRu: 'Французский жим с гантелей',
    aliases: [
      'triceps dumbbell', 'tricep extension', 'overhead tricep extension',
      'dumbbell tricep', 'французский жим', 'разгибание с гантелей'
    ],
    category: 'arms',
    muscleGroups: ['triceps'],
    equipment: 'dumbbell'
  },
  {
    id: 'skull_crushers',
    canonicalName: 'Skull crushers',
    displayName: 'Skull Crushers',
    displayNameRu: 'Французский жим лёжа',
    aliases: [
      'skull crushers', 'skull crusher', 'lying tricep extension',
      'французский жим лежа', 'французский жим лёжа'
    ],
    category: 'arms',
    muscleGroups: ['triceps'],
    equipment: 'barbell'
  },

  // === LEGS ===
  {
    id: 'squat',
    canonicalName: 'Squat',
    displayName: 'Squat',
    displayNameRu: 'Приседания',
    aliases: [
      'squat', 'squats', 'back squat', 'barbell squat',
      'приседания', 'присед', 'приседания со штангой'
    ],
    category: 'legs',
    muscleGroups: ['quads', 'glutes', 'core'],
    equipment: 'barbell'
  },
  {
    id: 'squat_dumbbell',
    canonicalName: 'Squat dumbbell',
    displayName: 'Goblet Squat',
    displayNameRu: 'Приседания с гантелями',
    aliases: [
      'squat dumbbell', 'dumbbell squat', 'goblet squat', 'db squat',
      'dumbbell squats', 'приседания с гантелями', 'гоблет присед', 'присед с гантелями'
    ],
    category: 'legs',
    muscleGroups: ['quads', 'glutes', 'core'],
    equipment: 'dumbbell'
  },
  {
    id: 'leg_press',
    canonicalName: 'Leg press',
    displayName: 'Leg Press',
    displayNameRu: 'Жим ногами',
    aliases: ['leg press', 'legpress', 'жим ногами', 'жим ног'],
    category: 'legs',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'machine'
  },
  {
    id: 'lunges',
    canonicalName: 'Lunges alternating',
    displayName: 'Lunges',
    displayNameRu: 'Выпады',
    aliases: [
      'lunges alternating', 'lunges', 'lunge', 'walking lunges', 'forward lunges',
      'lunges alternating dumbbell', 'dumbbell lunges', 'alternating lunges',
      'выпады', 'выпады попеременные', 'шагающие выпады', 'выпады с гантелями'
    ],
    category: 'legs',
    muscleGroups: ['quads', 'glutes'],
    equipment: 'dumbbell'
  },
  {
    id: 'leg_curl',
    canonicalName: 'Leg curl',
    displayName: 'Leg Curl',
    displayNameRu: 'Сгибание ног',
    aliases: [
      'leg curl', 'hamstring curl', 'lying leg curl', 'seated leg curl',
      'сгибание ног', 'сгибание ног лежа'
    ],
    category: 'legs',
    muscleGroups: ['hamstrings'],
    equipment: 'machine'
  },
  {
    id: 'leg_extension',
    canonicalName: 'Leg extension',
    displayName: 'Leg Extension',
    displayNameRu: 'Разгибание ног',
    aliases: ['leg extension', 'quad extension', 'разгибание ног', 'разгибание ног сидя'],
    category: 'legs',
    muscleGroups: ['quads'],
    equipment: 'machine'
  },
  {
    id: 'calf_raises',
    canonicalName: 'Calf raises',
    displayName: 'Calf Raises',
    displayNameRu: 'Подъём на носки',
    aliases: [
      'calf raises', 'calf raise', 'standing calf raise', 'seated calf raise',
      'подъем на носки', 'икры', 'икроножные'
    ],
    category: 'legs',
    muscleGroups: ['calves'],
    equipment: 'machine'
  },

  // === CORE ===
  {
    id: 'situp',
    canonicalName: 'Sit-up',
    displayName: 'Sit-ups',
    displayNameRu: 'Скручивания',
    aliases: [
      'sit-up', 'situp', 'situps', 'sit-ups', 'sit up', 'crunch', 'crunches',
      'скручивания', 'пресс', 'подъем туловища'
    ],
    category: 'core',
    muscleGroups: ['abs'],
    isBodyweight: true
  },
  {
    id: 'plank',
    canonicalName: 'Plank',
    displayName: 'Plank',
    displayNameRu: 'Планка',
    aliases: ['plank', 'планка', 'планки'],
    category: 'core',
    muscleGroups: ['core'],
    isBodyweight: true
  },
  {
    id: 'legs_hanging_raise',
    canonicalName: 'Legs hanging raise',
    displayName: 'Hanging Leg Raise',
    displayNameRu: 'Подъём ног в висе',
    aliases: [
      'legs hanging raise', 'hanging leg raise', 'leg raise', 'hanging raises',
      'leg hanging raise', 'hanging leg raises', 'knee raises', 'knee raise',
      'подъем ног', 'подъём ног', 'подъем ног в висе', 'ноги в висе'
    ],
    category: 'core',
    muscleGroups: ['abs', 'hip_flexors'],
    isBodyweight: true
  },
  {
    id: 'russian_twist',
    canonicalName: 'Russian twist',
    displayName: 'Russian Twist',
    displayNameRu: 'Русский твист',
    aliases: ['russian twist', 'russian twists', 'русский твист', 'твист'],
    category: 'core',
    muscleGroups: ['abs', 'obliques'],
    isBodyweight: true
  },

  // === CARDIO ===
  {
    id: 'running',
    canonicalName: 'Running',
    displayName: 'Running',
    displayNameRu: 'Бег',
    aliases: ['running', 'run', 'jog', 'jogging', 'бег', 'пробежка'],
    category: 'cardio',
    muscleGroups: ['legs', 'cardio']
  },
  {
    id: 'cycling',
    canonicalName: 'Cycling',
    displayName: 'Cycling',
    displayNameRu: 'Велосипед',
    aliases: ['cycling', 'bike', 'bicycle', 'велосипед', 'вело', 'велотренажер'],
    category: 'cardio',
    muscleGroups: ['legs', 'cardio'],
    equipment: 'machine'
  },
  {
    id: 'rowing',
    canonicalName: 'Rowing',
    displayName: 'Rowing',
    displayNameRu: 'Гребля',
    aliases: ['rowing', 'row machine', 'гребля', 'гребной тренажер'],
    category: 'cardio',
    muscleGroups: ['back', 'arms', 'cardio'],
    equipment: 'machine'
  }
];

// Build alias index for fast lookup
const aliasIndex = new Map<string, ExerciseDefinition>();

EXERCISES_DATABASE.forEach(exercise => {
  // Add canonical name as alias too
  aliasIndex.set(exercise.canonicalName.toLowerCase(), exercise);
  aliasIndex.set(exercise.displayName.toLowerCase(), exercise);
  aliasIndex.set(exercise.displayNameRu.toLowerCase(), exercise);
  
  exercise.aliases.forEach(alias => {
    aliasIndex.set(alias.toLowerCase(), exercise);
  });
});

export interface NormalizedExercise {
  canonicalName: string;
  displayName: string;
  displayNameRu: string;
  matched: boolean;
  definition?: ExerciseDefinition;
}

/**
 * Normalize an exercise name to its canonical form
 */
export function normalizeExerciseName(input: string): NormalizedExercise {
  const normalized = input.toLowerCase().trim();
  
  // 1. Exact match with alias
  const exactMatch = aliasIndex.get(normalized);
  if (exactMatch) {
    return {
      canonicalName: exactMatch.canonicalName,
      displayName: exactMatch.displayName,
      displayNameRu: exactMatch.displayNameRu,
      matched: true,
      definition: exactMatch
    };
  }
  
  // 2. Partial match - check if input contains or is contained by an alias
  for (const [alias, exercise] of aliasIndex) {
    // Skip very short aliases to avoid false matches
    if (alias.length < 4) continue;
    
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return {
        canonicalName: exercise.canonicalName,
        displayName: exercise.displayName,
        displayNameRu: exercise.displayNameRu,
        matched: true,
        definition: exercise
      };
    }
  }
  
  // 3. Word-by-word match for multi-word inputs
  const inputWords = normalized.split(/\s+/);
  if (inputWords.length > 1) {
    for (const [alias, exercise] of aliasIndex) {
      const aliasWords = alias.split(/\s+/);
      // Check if significant overlap
      const matchingWords = inputWords.filter(w => aliasWords.includes(w));
      if (matchingWords.length >= Math.min(2, aliasWords.length)) {
        return {
          canonicalName: exercise.canonicalName,
          displayName: exercise.displayName,
          displayNameRu: exercise.displayNameRu,
          matched: true,
          definition: exercise
        };
      }
    }
  }
  
  // 4. No match found - return input as is
  return {
    canonicalName: input.trim(),
    displayName: input.trim(),
    displayNameRu: input.trim(),
    matched: false
  };
}

/**
 * Get exercise definition by canonical name
 */
export function getExerciseByCanonicalName(name: string): ExerciseDefinition | undefined {
  return EXERCISES_DATABASE.find(e => e.canonicalName.toLowerCase() === name.toLowerCase());
}

/**
 * Get all exercises in a category
 */
export function getExercisesByCategory(category: ExerciseDefinition['category']): ExerciseDefinition[] {
  return EXERCISES_DATABASE.filter(e => e.category === category);
}

/**
 * Check if an exercise is bodyweight
 */
export function isBodyweightExercise(name: string): boolean {
  const normalized = normalizeExerciseName(name);
  return normalized.definition?.isBodyweight ?? false;
}

/**
 * Search exercises by query (for autocomplete)
 */
export function searchExercises(query: string, limit = 10): ExerciseDefinition[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  const results: ExerciseDefinition[] = [];
  const seen = new Set<string>();
  
  for (const exercise of EXERCISES_DATABASE) {
    if (seen.has(exercise.id)) continue;
    
    // Check if any alias matches
    const matches = exercise.aliases.some(a => a.includes(q)) ||
      exercise.displayName.toLowerCase().includes(q) ||
      exercise.displayNameRu.toLowerCase().includes(q) ||
      exercise.canonicalName.toLowerCase().includes(q);
    
    if (matches) {
      results.push(exercise);
      seen.add(exercise.id);
      if (results.length >= limit) break;
    }
  }
  
  return results;
}
