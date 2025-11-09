/**
 * Achievement Definitions
 * Defines all available achievements with their requirements
 */

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'streak' | 'completion' | 'consistency' | 'special';

export interface AchievementRequirement {
  type: string;
  value?: number;
  category?: string;
  time?: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  rarity: AchievementRarity;
  xp_reward: number;
  requirement: AchievementRequirement;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Streak achievements
  {
    id: 'streak_3',
    name: 'Первая искра',
    description: 'Стрейк 3 дня для любой привычки',
    category: 'streak',
    icon: '🔥',
    rarity: 'common',
    xp_reward: 20,
    requirement: { type: 'streak', value: 3 }
  },
  {
    id: 'streak_7',
    name: 'Неделя силы',
    description: 'Стрейк 7 дней для любой привычки',
    category: 'streak',
    icon: '⚡',
    rarity: 'common',
    xp_reward: 50,
    requirement: { type: 'streak', value: 7 }
  },
  {
    id: 'streak_14',
    name: 'Две недели',
    description: 'Стрейк 14 дней',
    category: 'streak',
    icon: '💪',
    rarity: 'rare',
    xp_reward: 100,
    requirement: { type: 'streak', value: 14 }
  },
  {
    id: 'streak_30',
    name: 'Месячный марафон',
    description: 'Стрейк 30 дней',
    category: 'streak',
    icon: '🏆',
    rarity: 'rare',
    xp_reward: 200,
    requirement: { type: 'streak', value: 30 }
  },
  {
    id: 'streak_50',
    name: 'Чемпион привычек',
    description: 'Стрейк 50 дней',
    category: 'streak',
    icon: '👑',
    rarity: 'epic',
    xp_reward: 500,
    requirement: { type: 'streak', value: 50 }
  },
  {
    id: 'streak_100',
    name: 'Легенда привычек',
    description: 'Стрейк 100 дней',
    category: 'streak',
    icon: '🌟',
    rarity: 'legendary',
    xp_reward: 1000,
    requirement: { type: 'streak', value: 100 }
  },
  {
    id: 'streak_365',
    name: 'Годовой воин',
    description: 'Стрейк 365 дней',
    category: 'streak',
    icon: '💎',
    rarity: 'legendary',
    xp_reward: 5000,
    requirement: { type: 'streak', value: 365 }
  },
  
  // Completion achievements
  {
    id: 'first_habit',
    name: 'Первый шаг',
    description: 'Выполните первую привычку',
    category: 'completion',
    icon: '🌱',
    rarity: 'common',
    xp_reward: 10,
    requirement: { type: 'total_completions', value: 1 }
  },
  {
    id: 'completions_10',
    name: 'Новичок',
    description: '10 выполнений привычек',
    category: 'completion',
    icon: '🎯',
    rarity: 'common',
    xp_reward: 30,
    requirement: { type: 'total_completions', value: 10 }
  },
  {
    id: 'completions_50',
    name: 'Практик',
    description: '50 выполнений привычек',
    category: 'completion',
    icon: '🎖️',
    rarity: 'rare',
    xp_reward: 80,
    requirement: { type: 'total_completions', value: 50 }
  },
  {
    id: 'completions_100',
    name: 'Центурион',
    description: '100 выполнений привычек',
    category: 'completion',
    icon: '💯',
    rarity: 'rare',
    xp_reward: 150,
    requirement: { type: 'total_completions', value: 100 }
  },
  {
    id: 'completions_500',
    name: 'Мастер привычек',
    description: '500 выполнений',
    category: 'completion',
    icon: '🏅',
    rarity: 'epic',
    xp_reward: 400,
    requirement: { type: 'total_completions', value: 500 }
  },
  {
    id: 'completions_1000',
    name: 'Гуру',
    description: '1000 выполнений привычек',
    category: 'completion',
    icon: '🔱',
    rarity: 'legendary',
    xp_reward: 1000,
    requirement: { type: 'total_completions', value: 1000 }
  },
  
  // Consistency achievements
  {
    id: 'perfect_day',
    name: 'Идеальный день',
    description: 'Все привычки выполнены за день',
    category: 'consistency',
    icon: '⭐',
    rarity: 'rare',
    xp_reward: 50,
    requirement: { type: 'perfect_days', value: 1 }
  },
  {
    id: 'perfect_week',
    name: 'Идеальная неделя',
    description: 'Все привычки выполнены 7 дней подряд',
    category: 'consistency',
    icon: '🌟',
    rarity: 'epic',
    xp_reward: 300,
    requirement: { type: 'perfect_days', value: 7 }
  },
  {
    id: 'perfect_month',
    name: 'Идеальный месяц',
    description: 'Все привычки 30 дней',
    category: 'consistency',
    icon: '✨',
    rarity: 'legendary',
    xp_reward: 1500,
    requirement: { type: 'perfect_days', value: 30 }
  },
  
  // Special achievements
  {
    id: 'early_bird',
    name: 'Ранняя пташка',
    description: 'Выполните привычку до 6:00',
    category: 'special',
    icon: '🐦',
    rarity: 'rare',
    xp_reward: 50,
    requirement: { type: 'completion_before_time', time: '06:00' }
  },
  {
    id: 'night_owl',
    name: 'Полуночник',
    description: 'Выполните привычку после 23:00',
    category: 'special',
    icon: '🦉',
    rarity: 'rare',
    xp_reward: 50,
    requirement: { type: 'completion_after_time', time: '23:00' }
  },
  {
    id: 'comeback_kid',
    name: 'Возвращение',
    description: 'Восстановите стрейк после пропуска',
    category: 'special',
    icon: '🔄',
    rarity: 'rare',
    xp_reward: 75,
    requirement: { type: 'streak_recovery', value: 1 }
  },
  {
    id: 'multi_habit',
    name: 'Многозадачность',
    description: 'Выполните 5 привычек за день',
    category: 'special',
    icon: '🎨',
    rarity: 'rare',
    xp_reward: 60,
    requirement: { type: 'daily_completions', value: 5 }
  },
  {
    id: 'super_user',
    name: 'Суперпользователь',
    description: '10 активных привычек одновременно',
    category: 'special',
    icon: '⚡',
    rarity: 'epic',
    xp_reward: 250,
    requirement: { type: 'active_habits', value: 10 }
  },
];

/**
 * Get rarity color classes
 */
export function getRarityColor(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-600 dark:text-gray-400';
    case 'rare':
      return 'text-blue-600 dark:text-blue-400';
    case 'epic':
      return 'text-purple-600 dark:text-purple-400';
    case 'legendary':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Get rarity border color
 */
export function getRarityBorderColor(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'common':
      return 'border-gray-300 dark:border-gray-700';
    case 'rare':
      return 'border-blue-400 dark:border-blue-600';
    case 'epic':
      return 'border-purple-400 dark:border-purple-600';
    case 'legendary':
      return 'border-amber-400 dark:border-amber-600';
    default:
      return 'border-gray-300 dark:border-gray-700';
  }
}

/**
 * Get rarity background glow
 */
export function getRarityGlow(rarity: AchievementRarity): string {
  switch (rarity) {
    case 'common':
      return '';
    case 'rare':
      return 'shadow-blue-500/50';
    case 'epic':
      return 'shadow-purple-500/50';
    case 'legendary':
      return 'shadow-amber-500/50 animate-pulse';
    default:
      return '';
  }
}
