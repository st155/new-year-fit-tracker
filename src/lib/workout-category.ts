// Workout category detection utility

const STRENGTH_TYPES = [
  'weightlifting', 'силовая', 'powerlifting', 'crossfit', 'strength',
  'functional fitness', 'bodybuilding', 'weight training', 'resistance',
  'тренажерный зал', 'gym', 'lifting', '-1' // -1 is often strength in Whoop
];

const CARDIO_TYPES = [
  'running', 'бег', 'cycling', 'велосипед', 'walking', 'ходьба',
  'swimming', 'плавание', 'hiit', 'rowing', 'гребля', 'elliptical',
  'stairmaster', 'jogging', 'marathon', 'sprint', 'cardio',
  'bike', 'run', 'walk', 'swim'
];

export type WorkoutCategory = 'strength' | 'cardio' | 'other';

export function getWorkoutCategory(workoutType: string | number | undefined | null): WorkoutCategory {
  if (!workoutType) return 'other';
  
  const normalized = String(workoutType).toLowerCase().trim();
  
  if (STRENGTH_TYPES.some(t => normalized.includes(t))) return 'strength';
  if (CARDIO_TYPES.some(t => normalized.includes(t))) return 'cardio';
  
  return 'other';
}

export function isStrengthWorkout(workoutType: string | number | undefined | null): boolean {
  return getWorkoutCategory(workoutType) === 'strength';
}

export function isCardioWorkout(workoutType: string | number | undefined | null): boolean {
  return getWorkoutCategory(workoutType) === 'cardio';
}
