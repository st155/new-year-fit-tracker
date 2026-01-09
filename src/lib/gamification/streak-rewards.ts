/**
 * Streak Rewards System
 * Defines rewards and milestones for habit streaks
 */

import i18n from '@/i18n';

export interface StreakMilestone {
  days: number;
  titleKey: string;
  reward: string;
  xp: number;
  badge: string;
  color: string;
}

const MILESTONE_KEYS = {
  3: 'started',
  7: 'week',
  14: 'twoWeeks',
  30: 'month',
  50: 'champion',
  100: 'legend',
  365: 'year',
} as const;

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    titleKey: 'started',
    reward: 'streak_started',
    xp: 20,
    badge: '🔥',
    color: 'from-orange-400 to-red-500',
  },
  {
    days: 7,
    titleKey: 'week',
    reward: 'streak_week',
    xp: 50,
    badge: '⚡',
    color: 'from-yellow-400 to-amber-500',
  },
  {
    days: 14,
    titleKey: 'twoWeeks',
    reward: 'streak_two_weeks',
    xp: 100,
    badge: '💪',
    color: 'from-blue-400 to-blue-600',
  },
  {
    days: 30,
    titleKey: 'month',
    reward: 'streak_month',
    xp: 250,
    badge: '🏆',
    color: 'from-purple-400 to-purple-600',
  },
  {
    days: 50,
    titleKey: 'champion',
    reward: 'streak_champion',
    xp: 500,
    badge: '👑',
    color: 'from-pink-400 to-pink-600',
  },
  {
    days: 100,
    titleKey: 'legend',
    reward: 'streak_legend',
    xp: 1000,
    badge: '🌟',
    color: 'from-amber-400 to-yellow-600',
  },
  {
    days: 365,
    titleKey: 'year',
    reward: 'streak_year',
    xp: 5000,
    badge: '💎',
    color: 'from-cyan-400 to-blue-600',
  },
];

/**
 * Get translated title for a milestone
 */
export function getMilestoneTitle(milestone: StreakMilestone): string {
  return i18n.t(`gamification:streaks.milestones.${milestone.titleKey}`);
}

/**
 * Get rewards earned for a specific streak
 */
export function getStreakRewards(streak: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter(m => m.days <= streak);
}

/**
 * Get the next milestone for a streak
 */
export function getNextMilestone(streak: number): StreakMilestone | null {
  const next = STREAK_MILESTONES.find(m => m.days > streak);
  return next || null;
}

/**
 * Get the current milestone for a streak
 */
export function getCurrentMilestone(streak: number): StreakMilestone | null {
  const milestones = getStreakRewards(streak);
  return milestones[milestones.length - 1] || null;
}

/**
 * Calculate progress to next milestone (0-100)
 */
export function getProgressToNextMilestone(streak: number): number {
  const current = getCurrentMilestone(streak);
  const next = getNextMilestone(streak);
  
  if (!next) return 100; // Max level reached
  
  const previousDays = current?.days || 0;
  const progressInRange = streak - previousDays;
  const rangeSize = next.days - previousDays;
  
  return Math.round((progressInRange / rangeSize) * 100);
}

/**
 * Get streak status message
 */
export function getStreakStatusMessage(streak: number): string {
  const next = getNextMilestone(streak);
  
  if (!next) {
    return i18n.t('gamification:streaks.messages.maxLevel');
  }
  
  const daysToNext = next.days - streak;
  const nextTitle = getMilestoneTitle(next);
  
  if (daysToNext === 1) {
    return i18n.t('gamification:streaks.messages.oneDayTo', { title: nextTitle });
  }
  
  return i18n.t('gamification:streaks.messages.daysTo', { days: daysToNext, title: nextTitle });
}

/**
 * Check if streak just reached a milestone
 */
export function isNewMilestone(previousStreak: number, currentStreak: number): StreakMilestone | null {
  if (currentStreak <= previousStreak) return null;
  
  const milestone = STREAK_MILESTONES.find(m => 
    m.days > previousStreak && m.days <= currentStreak
  );
  
  return milestone || null;
}

/**
 * Get milestone color gradient for UI
 */
export function getMilestoneGradient(streak: number): string {
  const milestone = getCurrentMilestone(streak);
  return milestone?.color || 'from-gray-400 to-gray-600';
}
