/**
 * Challenge Scoring Utilities
 * Badge calculation, points formatting, and rank display
 */

import type { MetricsBadge, LeaderboardEntry, PointsBreakdown } from '../types';

// ============ Badge Calculation ============

interface BadgeInput {
  userId: string;
  username: string;
  activeDays: number;
  lastActivityDate: string;
  streakDays: number;
  avgRecovery: number;
  avgStrain: number;
  avgSleep: number;
  avgSleepEfficiency: number;
  avgRestingHr: number;
  avgHrv: number;
  totalSteps: number;
  totalActiveCalories: number;
  totalGoals: number;
  goalsWithBaseline: number;
  trackableGoals: number;
  totalPoints: number;
}

export function calculateBadges(entry: BadgeInput): MetricsBadge[] {
  const badges: MetricsBadge[] = [];

  // Activity badges
  if (entry.streakDays >= 30) {
    badges.push({
      id: 'streak-legend',
      name: 'Streak Legend',
      description: '30+ day streak',
      icon: '🔥',
      rarity: 'legendary',
      category: 'consistency'
    });
  } else if (entry.streakDays >= 14) {
    badges.push({
      id: 'streak-master',
      name: 'Streak Master',
      description: '14+ day streak',
      icon: '⚡',
      rarity: 'epic',
      category: 'consistency'
    });
  } else if (entry.streakDays >= 7) {
    badges.push({
      id: 'streak-warrior',
      name: 'Streak Warrior',
      description: '7+ day streak',
      icon: '💪',
      rarity: 'rare',
      category: 'consistency'
    });
  }

  // Steps badges
  if (entry.totalSteps >= 500000) {
    badges.push({
      id: 'marathon-runner',
      name: 'Marathon Runner',
      description: '500k+ total steps',
      icon: '🏃',
      rarity: 'legendary',
      category: 'performance'
    });
  } else if (entry.totalSteps >= 200000) {
    badges.push({
      id: 'step-champion',
      name: 'Step Champion',
      description: '200k+ total steps',
      icon: '👟',
      rarity: 'epic',
      category: 'performance'
    });
  } else if (entry.totalSteps >= 100000) {
    badges.push({
      id: 'active-mover',
      name: 'Active Mover',
      description: '100k+ total steps',
      icon: '🚶',
      rarity: 'rare',
      category: 'performance'
    });
  }

  // Recovery badges
  if (entry.avgRecovery >= 80) {
    badges.push({
      id: 'recovery-pro',
      name: 'Recovery Pro',
      description: '80%+ avg recovery',
      icon: '💚',
      rarity: 'epic',
      category: 'recovery'
    });
  } else if (entry.avgRecovery >= 60) {
    badges.push({
      id: 'well-rested',
      name: 'Well Rested',
      description: '60%+ avg recovery',
      icon: '😴',
      rarity: 'rare',
      category: 'recovery'
    });
  }

  // Sleep badges
  if (entry.avgSleep >= 8) {
    badges.push({
      id: 'sleep-master',
      name: 'Sleep Master',
      description: '8+ hours avg sleep',
      icon: '🌙',
      rarity: 'epic',
      category: 'recovery'
    });
  } else if (entry.avgSleep >= 7) {
    badges.push({
      id: 'good-sleeper',
      name: 'Good Sleeper',
      description: '7+ hours avg sleep',
      icon: '💤',
      rarity: 'rare',
      category: 'recovery'
    });
  }

  // HRV badges
  if (entry.avgHrv >= 80) {
    badges.push({
      id: 'hrv-elite',
      name: 'HRV Elite',
      description: '80+ ms avg HRV',
      icon: '❤️',
      rarity: 'legendary',
      category: 'recovery'
    });
  } else if (entry.avgHrv >= 50) {
    badges.push({
      id: 'hrv-healthy',
      name: 'HRV Healthy',
      description: '50+ ms avg HRV',
      icon: '💓',
      rarity: 'rare',
      category: 'recovery'
    });
  }

  // Goal badges
  if (entry.goalsWithBaseline >= 5) {
    badges.push({
      id: 'goal-setter',
      name: 'Goal Setter',
      description: '5+ tracked goals',
      icon: '🎯',
      rarity: 'rare',
      category: 'consistency'
    });
  }

  // Points badges
  if (entry.totalPoints >= 10000) {
    badges.push({
      id: 'points-legend',
      name: 'Points Legend',
      description: '10k+ total points',
      icon: '👑',
      rarity: 'legendary',
      category: 'performance'
    });
  } else if (entry.totalPoints >= 5000) {
    badges.push({
      id: 'high-scorer',
      name: 'High Scorer',
      description: '5k+ total points',
      icon: '🏆',
      rarity: 'epic',
      category: 'performance'
    });
  }

  return badges;
}

// ============ Badge Bonus Calculation ============

export function calculateBadgeBonus(badges: MetricsBadge[]): number {
  let bonus = 0;
  
  for (const badge of badges) {
    switch (badge.rarity) {
      case 'common':
        bonus += 10;
        break;
      case 'rare':
        bonus += 25;
        break;
      case 'epic':
        bonus += 50;
        break;
      case 'legendary':
        bonus += 100;
        break;
    }
  }
  
  return bonus;
}

// ============ Leaderboard Helpers ============

export function enrichLeaderboardEntry(
  entry: Omit<LeaderboardEntry, 'badges' | 'rank'>,
  rank: number
): LeaderboardEntry {
  const badges = calculateBadges(entry);
  
  return {
    ...entry,
    rank,
    badges,
  };
}

// ============ Display Formatters ============

export function formatPoints(points: number): string {
  return points.toLocaleString('en-US');
}

export function getRankDisplay(rank: number): string {
  if (rank === 1) return '🥇 1st';
  if (rank === 2) return '🥈 2nd';
  if (rank === 3) return '🥉 3rd';
  return `${rank}th`;
}

export function getRankColorClass(rank: number): string {
  if (rank === 1) return 'text-yellow-500';
  if (rank === 2) return 'text-gray-400';
  if (rank === 3) return 'text-amber-600';
  return 'text-muted-foreground';
}

// ============ Points Breakdown Helpers ============

export function calculateTotalFromBreakdown(breakdown: PointsBreakdown): number {
  const performance = Object.values(breakdown.performance).reduce((a, b) => a + b, 0);
  const recovery = Object.values(breakdown.recovery).reduce((a, b) => a + b, 0);
  const synergy = Object.values(breakdown.synergy).reduce((a, b) => a + b, 0);
  const bonus = Object.values(breakdown.bonus).reduce((a, b) => a + b, 0);
  
  return performance + recovery + synergy + bonus;
}
