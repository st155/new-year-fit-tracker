export const EXERCISE_CATEGORIES = {
  'Upper Push': ['bench press', 'overhead press', 'pushup', 'dip', 'press'],
  'Upper Pull': ['row', 'pull', 'chin', 'lat'],
  'Lower Body': ['squat', 'deadlift', 'lunge', 'leg press', 'rdl', 'romanian'],
  'Core': ['plank', 'crunch', 'ab', 'core'],
  'Cardio': ['run', 'bike', 'row', 'cardio'],
  'Accessory': ['curl', 'tricep', 'calf', 'lateral', 'raise', 'extension', 'fly']
} as const;

export function categorizeExercise(name: string): string {
  const nameLower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(EXERCISE_CATEGORIES)) {
    if (keywords.some(k => nameLower.includes(k))) {
      return category;
    }
  }
  return 'Other';
}
