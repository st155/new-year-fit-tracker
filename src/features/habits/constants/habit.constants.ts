/**
 * Habit Constants
 * 
 * Centralized constants for the Habits feature.
 */

// ============================================================================
// Query Keys
// ============================================================================

export const HABIT_QUERY_KEYS = {
  all: ['habits'] as const,
  lists: () => [...HABIT_QUERY_KEYS.all, 'list'] as const,
  list: (userId: string) => [...HABIT_QUERY_KEYS.lists(), userId] as const,
  details: () => [...HABIT_QUERY_KEYS.all, 'detail'] as const,
  detail: (habitId: string) => [...HABIT_QUERY_KEYS.details(), habitId] as const,
  
  // Completions
  completions: (habitId: string) => [...HABIT_QUERY_KEYS.all, 'completions', habitId] as const,
  completionsRange: (habitId: string, startDate: string, endDate: string) => 
    [...HABIT_QUERY_KEYS.completions(habitId), startDate, endDate] as const,
  
  // Attempts (for duration counters)
  attempts: (habitId: string) => [...HABIT_QUERY_KEYS.all, 'attempts', habitId] as const,
  
  // Measurements
  measurements: (habitId: string) => [...HABIT_QUERY_KEYS.all, 'measurements', habitId] as const,
  
  // Stats
  stats: (userId: string) => [...HABIT_QUERY_KEYS.all, 'stats', userId] as const,
  habitStats: (habitId: string) => [...HABIT_QUERY_KEYS.all, 'habit-stats', habitId] as const,
  
  // Progress
  progress: (habitId: string, startDate: string, endDate: string) =>
    [...HABIT_QUERY_KEYS.all, 'progress', habitId, startDate, endDate] as const,
  
  // Streaks
  streakHistory: (userId: string) => [...HABIT_QUERY_KEYS.all, 'streak-history', userId] as const,
  
  // Analytics
  analytics: (userId: string, days: number) => 
    [...HABIT_QUERY_KEYS.all, 'analytics', userId, days] as const,
  
  // Feed
  feed: (userId: string) => [...HABIT_QUERY_KEYS.all, 'feed', userId] as const,
  
  // Teams
  teams: (userId: string) => [...HABIT_QUERY_KEYS.all, 'teams', userId] as const,
  team: (teamId: string) => [...HABIT_QUERY_KEYS.all, 'team', teamId] as const,
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_HABIT_VALUES = {
  xp_reward: 10,
  difficulty_level: 'medium' as const,
  is_active: true,
  archived: false,
} as const;

export const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5000, // 5 seconds
  cacheTime: 10 * 60 * 1000, // 10 minutes
} as const;

// ============================================================================
// XP & Gamification
// ============================================================================

export const XP_VALUES = {
  base_completion: 10,
  streak_bonus_7: 5,
  streak_bonus_14: 10,
  streak_bonus_30: 20,
  first_today_bonus: 5,
  perfect_day_bonus: 20,
  difficulty_hard_bonus: 5,
} as const;

export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 180, 365] as const;

// ============================================================================
// Categories
// ============================================================================

export const HABIT_CATEGORIES = [
  { value: 'health', label: 'Здоровье', emoji: '❤️' },
  { value: 'fitness', label: 'Фитнес', emoji: '💪' },
  { value: 'nutrition', label: 'Питание', emoji: '🥗' },
  { value: 'sleep', label: 'Сон', emoji: '😴' },
  { value: 'mindfulness', label: 'Осознанность', emoji: '🧘' },
  { value: 'learning', label: 'Обучение', emoji: '📚' },
  { value: 'productivity', label: 'Продуктивность', emoji: '⚡' },
  { value: 'social', label: 'Социальное', emoji: '👥' },
  { value: 'custom', label: 'Другое', emoji: '✨' },
] as const;

export const HABIT_TYPES = [
  { value: 'daily_check', label: 'Ежедневная галочка', description: 'Простое выполнение каждый день' },
  { value: 'duration_counter', label: 'Счётчик времени', description: 'Время с начала (бросить курить и т.д.)' },
  { value: 'numeric_counter', label: 'Числовой счётчик', description: 'Количество (стаканы воды и т.д.)' },
  { value: 'fasting_tracker', label: 'Интервальное голодание', description: 'Окна приёма пищи' },
  { value: 'daily_measurement', label: 'Ежедневное измерение', description: 'Значение каждый день' },
] as const;

// ============================================================================
// Sentiment Keywords
// ============================================================================

export const NEGATIVE_HABIT_KEYWORDS = [
  'quit', 'stop', 'avoid', 'smoking', 'drinking', 'alcohol',
  'sugar', 'junk food', 'soda', 'screen time', 'social media',
  'procrastination', 'бросить', 'перестать', 'не курю', 'не пью',
] as const;

export const POSITIVE_HABIT_KEYWORDS = [
  'exercise', 'workout', 'run', 'walk', 'meditation', 'yoga',
  'reading', 'learning', 'practice', 'study', 'water', 'sleep',
  'fitness', 'health', 'тренировка', 'упражнение', 'чтение',
] as const;
