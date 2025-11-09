/**
 * Analytics calculation utilities for habit statistics
 */

export interface AnalyticsSummary {
  completionRate: number;
  currentStreak: number;
  totalXP: number;
  activeHabits: number;
  completedToday: number;
  totalCompletions: number;
}

export interface CompletionTrend {
  date: string;
  completions: number;
  target: number;
}

export interface TimeOfDayStats {
  morning: number;
  afternoon: number;
  evening: number;
  night: number;
  anytime: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

/**
 * Calculate overall analytics summary
 */
export function calculateAnalytics(
  habits: any[],
  completions: any[],
  streakHistory?: any[]
): AnalyticsSummary {
  const activeHabits = habits.filter(h => h.is_active !== false).length;
  const today = new Date().toISOString().split('T')[0];
  const completedToday = completions.filter(c => 
    c.completed_at?.startsWith(today)
  ).length;
  
  const totalCompletions = completions.length;
  const totalPossible = habits.length * 30; // Assuming 30 days of data
  const completionRate = totalPossible > 0 
    ? Math.round((totalCompletions / totalPossible) * 100) 
    : 0;
  
  const currentStreak = calculateCurrentStreak(completions);
  const totalXP = completions.length * 10; // Default 10 XP per completion
  
  return {
    completionRate,
    currentStreak,
    totalXP,
    activeHabits,
    completedToday,
    totalCompletions
  };
}

/**
 * Calculate current streak from completions
 */
function calculateCurrentStreak(completions: any[]): number {
  if (completions.length === 0) return 0;
  
  const sortedDates = [...new Set(
    completions.map(c => c.completed_at?.split('T')[0])
  )].sort().reverse();
  
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < sortedDates.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    const expectedStr = expectedDate.toISOString().split('T')[0];
    
    if (sortedDates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate completion trend for last N days
 */
export function calculateCompletionTrend(
  completions: any[],
  days: number = 30
): CompletionTrend[] {
  const trend: CompletionTrend[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayCompletions = completions.filter(c => 
      c.completed_at?.startsWith(dateStr)
    ).length;
    
    trend.push({
      date: dateStr,
      completions: dayCompletions,
      target: 5 // Default target
    });
  }
  
  return trend;
}

/**
 * Calculate statistics by time of day
 */
export function calculateTimeOfDayStats(
  habits: any[],
  completions: any[]
): TimeOfDayStats {
  const stats: TimeOfDayStats = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
    anytime: 0
  };
  
  completions.forEach(completion => {
    const habit = habits.find(h => h.id === completion.habit_id);
    if (habit && habit.time_of_day) {
      const timeOfDay = habit.time_of_day as keyof TimeOfDayStats;
      if (timeOfDay in stats) {
        stats[timeOfDay]++;
      }
    }
  });
  
  return stats;
}

/**
 * Calculate category distribution
 */
export function calculateCategoryStats(habits: any[]): CategoryStats[] {
  const categoryCount: Record<string, number> = {};
  
  habits.forEach(habit => {
    const category = habit.category || 'other';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  const total = habits.length;
  
  return Object.entries(categoryCount).map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / total) * 100)
  }));
}

/**
 * Get top performing habits
 */
export function getTopHabits(habits: any[], completions: any[], limit: number = 5): any[] {
  const habitStats = habits.map(habit => {
    const habitCompletions = completions.filter(c => c.habit_id === habit.id);
    return {
      ...habit,
      completionCount: habitCompletions.length,
      totalXP: habitCompletions.length * 10 // Default 10 XP per completion
    };
  });
  
  return habitStats
    .sort((a, b) => b.completionCount - a.completionCount)
    .slice(0, limit);
}
