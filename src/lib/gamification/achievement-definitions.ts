/**
 * Achievement Definitions
 * Defines all available achievements with their requirements
 */
import i18n from '@/i18n';

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

// Base achievement definitions without localized strings
const ACHIEVEMENT_DEFINITIONS_BASE: Omit<AchievementDefinition, 'name' | 'description'>[] = [
  // Streak achievements
  {
    id: 'streak_3',
    category: 'streak',
    icon: '🔥',
    rarity: 'common',
    xp_reward: 20,
    requirement: { type: 'streak', value: 3 }
  },
  {
    id: 'streak_7',
    category: 'streak',
    icon: '⚡',
    rarity: 'common',
    xp_reward: 50,
    requirement: { type: 'streak', value: 7 }
  },
  {
    id: 'streak_14',
    category: 'streak',
    icon: '💪',
    rarity: 'rare',
    xp_reward: 100,
    requirement: { type: 'streak', value: 14 }
  },
  {
    id: 'streak_30',
    category: 'streak',
    icon: '🏆',
    rarity: 'rare',
    xp_reward: 200,
    requirement: { type: 'streak', value: 30 }
  },
  {
    id: 'streak_50',
    category: 'streak',
    icon: '👑',
    rarity: 'epic',
    xp_reward: 500,
    requirement: { type: 'streak', value: 50 }
  },
  {
    id: 'streak_100',
    category: 'streak',
    icon: '🌟',
    rarity: 'legendary',
    xp_reward: 1000,
    requirement: { type: 'streak', value: 100 }
  },
  {
    id: 'streak_365',
    category: 'streak',
    icon: '💎',
    rarity: 'legendary',
    xp_reward: 5000,
    requirement: { type: 'streak', value: 365 }
  },
  
  // Completion achievements
  {
    id: 'first_habit',
    category: 'completion',
    icon: '🌱',
    rarity: 'common',
    xp_reward: 10,
    requirement: { type: 'total_completions', value: 1 }
  },
  {
    id: 'completions_10',
    category: 'completion',
    icon: '🎯',
    rarity: 'common',
    xp_reward: 30,
    requirement: { type: 'total_completions', value: 10 }
  },
  {
    id: 'completions_50',
    category: 'completion',
    icon: '🎖️',
    rarity: 'rare',
    xp_reward: 80,
    requirement: { type: 'total_completions', value: 50 }
  },
  {
    id: 'completions_100',
    category: 'completion',
    icon: '💯',
    rarity: 'rare',
    xp_reward: 150,
    requirement: { type: 'total_completions', value: 100 }
  },
  {
    id: 'completions_500',
    category: 'completion',
    icon: '🏅',
    rarity: 'epic',
    xp_reward: 400,
    requirement: { type: 'total_completions', value: 500 }
  },
  {
    id: 'completions_1000',
    category: 'completion',
    icon: '🔱',
    rarity: 'legendary',
    xp_reward: 1000,
    requirement: { type: 'total_completions', value: 1000 }
  },
  
  // Consistency achievements
  {
    id: 'perfect_day',
    category: 'consistency',
    icon: '⭐',
    rarity: 'rare',
    xp_reward: 50,
    requirement: { type: 'perfect_days', value: 1 }
  },
  {
    id: 'perfect_week',
    category: 'consistency',
    icon: '🌟',
    rarity: 'epic',
    xp_reward: 300,
    requirement: { type: 'perfect_days', value: 7 }
  },
  {
    id: 'perfect_month',
    category: 'consistency',
    icon: '✨',
    rarity: 'legendary',
    xp_reward: 1500,
    requirement: { type: 'perfect_days', value: 30 }
  },
  
  // Special achievements
  {
    id: 'early_bird',
    category: 'special',
    icon: '🐦',
    rarity: 'rare',
    xp_reward: 50,
    requirement: { type: 'completion_before_time', time: '06:00' }
  },
  {
    id: 'night_owl',
    category: 'special',
    icon: '🦉',
    rarity: 'rare',
    xp_reward: 50,
    requirement: { type: 'completion_after_time', time: '23:00' }
  },
  {
    id: 'comeback_kid',
    category: 'special',
    icon: '🔄',
    rarity: 'rare',
    xp_reward: 75,
    requirement: { type: 'streak_recovery', value: 1 }
  },
  {
    id: 'multi_habit',
    category: 'special',
    icon: '🎨',
    rarity: 'rare',
    xp_reward: 60,
    requirement: { type: 'daily_completions', value: 5 }
  },
  {
    id: 'super_user',
    category: 'special',
    icon: '⚡',
    rarity: 'epic',
    xp_reward: 250,
    requirement: { type: 'active_habits', value: 10 }
  },
  
  // Role-based achievements
  {
    id: 'trainer',
    category: 'special',
    icon: '🏋️‍♂️',
    rarity: 'legendary',
    xp_reward: 500,
    requirement: { type: 'special_role', value: 1 }
  },
  {
    id: 'early_adopter',
    category: 'special',
    icon: '🚀',
    rarity: 'epic',
    xp_reward: 200,
    requirement: { type: 'early_adopter', value: 1 }
  },
];

/**
 * Get localized achievement definitions
 */
export function getLocalizedAchievements(): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS_BASE.map(achievement => ({
    ...achievement,
    name: i18n.t(`gamification:achievements.items.${achievement.id}.name`),
    description: i18n.t(`gamification:achievements.items.${achievement.id}.description`),
  }));
}

// Export as getter for backward compatibility
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = getLocalizedAchievements();

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
