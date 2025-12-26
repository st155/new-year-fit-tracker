/**
 * Habits hooks barrel export
 */

// Keys
export { habitKeys } from './keys';

// Queries
export { 
  useHabitsQuery, 
  useHabitProgressQuery, 
  useHabitAttemptsQuery, 
  useHabitMeasurementsQuery,
  type HabitProgressDay,
  type HabitAttempt,
  type HabitMeasurement,
  type MeasurementStats,
} from './queries';

// Mutations
export { 
  useHabitMutations, 
  useDeleteHabit, 
  useCompleteHabit, 
  useUndoCompletion,
  type HabitCompletionResult,
} from './mutations';

// Analytics
export { 
  useHabitCompletions, 
  useStreakHistory, 
  useXPHistory, 
  useHabitAnalytics,
  useHabitInsights,
} from './analytics';

// UI
export { 
  useHabitCardState, 
  useHabitGrouping,
  type HabitCardStateReturn,
  type HabitGroup,
  type GroupedHabits,
} from './ui';

// Legacy adapter (deprecated)
export { useHabitsAdapter } from './useHabitsAdapter';

// Re-export query keys for backward compatibility
export { habitKeys as habitQueryKeys } from './keys';
