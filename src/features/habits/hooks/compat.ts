/**
 * Backward-compatible re-exports for legacy imports
 * These aliases allow old import paths to continue working
 */

export { useHabitAttemptsQuery as useHabitAttempts } from './queries';
export { useHabitMeasurementsQuery as useHabitMeasurements } from './queries';
export { useHabitProgressQuery as useHabitProgress } from './queries';
export { useDeleteHabit } from './mutations';
export { useCompleteHabit as useHabitCompletion } from './mutations';
