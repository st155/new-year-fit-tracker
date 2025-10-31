// Challenge Scoring System v3 - Based on real metrics data
// Uses actual user_metrics data instead of just goal progress

export interface MetricsBadge {
  id: string;
  icon: string;
  name: string;
  description: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  
  // Points
  totalPoints: number;
  
  // Activity metrics
  activeDays: number;
  lastActivityDate: string;
  streakDays: number;
  
  // Health metrics (averages)
  avgRecovery: number;
  avgStrain: number;
  avgSleep: number;
  avgSleepEfficiency: number;
  avgRestingHr: number;
  avgHrv: number;
  
  // Cumulative metrics
  totalSteps: number;
  totalActiveCalories: number;
  
  // Weekly metrics (last 7 days)
  steps_last_7d?: number;
  avg_strain_last_7d?: number;
  avg_sleep_last_7d?: number;
  avg_recovery_last_7d?: number;
  workouts_last_7d?: number;
  weekly_consistency?: number;
  
  // Goals info
  totalGoals: number;
  goalsWithBaseline: number;
  trackableGoals: number;
  
  // Badges
  badges: MetricsBadge[];
  
  // Ranking
  rank?: number;
  isUser?: boolean;
}

/**
 * Calculate badges based on user metrics
 */
export function calculateBadges(entry: Omit<LeaderboardEntry, 'badges' | 'totalPoints'>): MetricsBadge[] {
  const badges: MetricsBadge[] = [];
  
  // 🔥 Fire Streak - 7+ consecutive days
  if (entry.streakDays >= 7) {
    badges.push({
      id: 'fire_streak',
      icon: '🔥',
      name: 'Fire Streak',
      description: `${entry.streakDays} days in a row`
    });
  }
  
  // 💪 Beast Mode - High average strain
  if (entry.avgStrain >= 18) {
    badges.push({
      id: 'beast_mode',
      icon: '💪',
      name: 'Beast Mode',
      description: 'Crushing high strain workouts'
    });
  }
  
  // 😴 Sleep Champion - Consistent good sleep
  if (entry.avgSleep >= 7.5 && entry.avgSleepEfficiency >= 85) {
    badges.push({
      id: 'sleep_champion',
      icon: '😴',
      name: 'Sleep Champion',
      description: 'Excellent sleep quality'
    });
  }
  
  // ❤️ Heart Health - Stable resting HR
  if (entry.avgRestingHr > 0 && entry.avgRestingHr <= 60) {
    badges.push({
      id: 'heart_health',
      icon: '❤️',
      name: 'Heart Health',
      description: 'Optimal resting heart rate'
    });
  }
  
  // 🎯 Consistent - Active 20+ days
  if (entry.activeDays >= 20) {
    badges.push({
      id: 'consistent',
      icon: '🎯',
      name: 'Consistent',
      description: `${entry.activeDays} active days`
    });
  }
  
  // 🏃 Step Master - 200k+ steps total
  if (entry.totalSteps >= 200000) {
    badges.push({
      id: 'step_master',
      icon: '🏃',
      name: 'Step Master',
      description: `${Math.round(entry.totalSteps / 1000)}k steps`
    });
  }
  
  // ⚡ High Recovery - Excellent recovery scores
  if (entry.avgRecovery >= 75) {
    badges.push({
      id: 'recovery_king',
      icon: '⚡',
      name: 'Recovery King',
      description: 'Consistently high recovery'
    });
  }
  
  // 🏆 Goal Crusher - 3+ trackable goals
  if (entry.trackableGoals >= 3) {
    badges.push({
      id: 'goal_crusher',
      icon: '🏆',
      name: 'Goal Crusher',
      description: `${entry.trackableGoals} tracked goals`
    });
  }
  
  return badges;
}

/**
 * Calculate bonus points from badges
 */
export function calculateBadgeBonus(badges: MetricsBadge[]): number {
  // Each badge is worth 25 bonus points
  return badges.length * 25;
}

/**
 * Enrich leaderboard entry with badges and rank
 */
export function enrichLeaderboardEntry(
  entry: Omit<LeaderboardEntry, 'badges' | 'rank'>,
  rank: number
): LeaderboardEntry {
  const badges = calculateBadges(entry);
  const badgeBonus = calculateBadgeBonus(badges);
  
  return {
    ...entry,
    totalPoints: entry.totalPoints + badgeBonus,
    badges,
    rank
  };
}

/**
 * Format points display
 */
export function formatPoints(points: number): string {
  return points.toLocaleString('en-US');
}

/**
 * Get rank display (medal or number)
 */
export function getRankDisplay(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

/**
 * Get rank color class
 */
export function getRankColorClass(rank: number): string {
  if (rank === 1) return 'from-yellow-400 to-yellow-600';
  if (rank === 2) return 'from-gray-300 to-gray-500';
  if (rank === 3) return 'from-orange-400 to-orange-600';
  return 'bg-muted';
}
