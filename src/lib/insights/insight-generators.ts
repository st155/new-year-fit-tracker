/**
 * Smart Insight Generators
 * Supports i18n via options parameter
 */

import i18n from '@/i18n';
import type { SmartInsight, InsightGeneratorContext } from './types';

/**
 * Insight text options for localization
 */
export interface InsightTextOptions {
  quality?: {
    poor: (count: number) => string;
    fair: (count: number) => string;
  };
  trends?: {
    weeklyChange: (metric: string, change: string, isPositive: boolean) => string;
  };
  goals?: {
    defaultTitle: string;
    stale: (title: string, days: number) => string;
    nearCompletion: (title: string, progress: number) => string;
    completed: (title: string) => string;
  };
  habits?: {
    streak: (days: number, title: string) => string;
    allComplete: (done: number, total: number) => string;
    progress: (done: number, total: number) => string;
  };
  achievements?: {
    stepsRecord: (steps: string) => string;
    highRecovery: (recovery: number) => string;
  };
  info?: {
    syncedToday: (count: number) => string;
  };
  recommendations?: {
    addMetric: (name: string) => string;
  };
}

// Create default options using i18n
const createDefaultOptions = (): InsightTextOptions => ({
  quality: {
    poor: (count) => i18n.t('insights:quality.poor', { count }),
    fair: (count) => i18n.t('insights:quality.fair', { count }),
  },
  trends: {
    weeklyChange: (metric, change, isPositive) => i18n.t('insights:trends.weeklyChange', { metric, change: isPositive ? `+${change}` : change }),
  },
  goals: {
    defaultTitle: i18n.t('insights:goals.defaultTitle'),
    stale: (title, days) => i18n.t('insights:goals.stale', { title, days }),
    nearCompletion: (title, progress) => i18n.t('insights:goals.nearCompletion', { title, progress }),
    completed: (title) => i18n.t('insights:goals.completed', { title }),
  },
  habits: {
    streak: (days, title) => i18n.t('insights:habits.streak', { days, title }),
    allComplete: (done, total) => i18n.t('insights:habits.allComplete', { done, total }),
    progress: (done, total) => i18n.t('insights:habits.progress', { done, total }),
  },
  achievements: {
    stepsRecord: (steps) => i18n.t('insights:achievements.stepsRecord', { steps }),
    highRecovery: (recovery) => i18n.t('insights:achievements.highRecovery', { recovery }),
  },
  info: {
    syncedToday: (count) => i18n.t('insights:info.syncedToday', { count }),
  },
  recommendations: {
    addMetric: (name) => i18n.t('insights:recommendations.addMetric', { name }),
  },
});

/**
 * Generate quality-related insights
 */
export function generateQualityInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { qualityData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.quality, ...options?.quality };

  if (!qualityData) return insights;

  // Poor quality metrics
  const poorMetrics = qualityData.metricsByQuality?.poor || [];
  if (poorMetrics.length > 0) {
    insights.push({
      id: 'quality-poor',
      type: 'critical',
      emoji: '🚨',
      message: texts.poor!(poorMetrics.length),
      priority: 95,
      action: { type: 'navigate', path: '/data-quality' },
      timestamp: new Date(),
      source: 'quality',
    });
  }

  // Fair quality metrics (warning)
  const fairMetrics = qualityData.metricsByQuality?.fair || [];
  if (fairMetrics.length > 0 && poorMetrics.length === 0) {
    insights.push({
      id: 'quality-fair',
      type: 'warning',
      emoji: '⚠️',
      message: texts.fair!(fairMetrics.length),
      priority: 70,
      action: { type: 'navigate', path: '/data-quality' },
      timestamp: new Date(),
      source: 'quality',
    });
  }

  return insights;
}

/**
 * Generate trend-related insights
 */
export function generateTrendInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { metricsData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.trends, ...options?.trends };

  if (!metricsData?.history) return insights;

  // Analyze trends for key metrics
  const keyMetrics = ['Sleep Duration', 'Steps', 'Recovery Score', 'Day Strain'];
  
  keyMetrics.forEach(metricName => {
    const history = metricsData.history.filter((m: any) => m.metric_name === metricName);
    if (history.length < 5) return; // Need at least 5 days of data

    // Calculate trend (last 3 days vs previous 4 days)
    const recent = history.slice(0, 3).reduce((sum: number, m: any) => sum + m.value, 0) / 3;
    const previous = history.slice(3, 7).reduce((sum: number, m: any) => sum + m.value, 0) / 4;
    const change = ((recent - previous) / previous) * 100;

    if (Math.abs(change) > 15) {
      const isPositive = change > 0;
      insights.push({
        id: `trend-${metricName.toLowerCase().replace(' ', '-')}`,
        type: isPositive ? 'achievement' : 'warning',
        emoji: isPositive ? '📈' : '📉',
        message: texts.weeklyChange!(metricName, change.toFixed(0), isPositive),
        priority: Math.abs(change) > 25 ? 75 : 55,
        action: { type: 'navigate', path: `/metrics/${metricName.toLowerCase().replace(' ', '-')}` },
        timestamp: new Date(),
        source: 'trends',
      });
    }
  });

  return insights;
}

/**
 * Generate goal-related insights
 */
export function generateGoalInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { goalsData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.goals, ...options?.goals };

  if (!goalsData) return insights;

  const allGoals = [...(goalsData.personal || []), ...(goalsData.challenge || [])];

  // Goals close to completion
  allGoals.forEach((goal: any) => {
    if (!goal.measurements || goal.measurements.length === 0) {
      // Goal with no measurements for >7 days
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceCreation > 7) {
        const goalTitle = goal.title || goal.metric_name || texts.defaultTitle!;
        insights.push({
          id: `goal-stale-${goal.id}`,
          type: 'warning',
          emoji: '⚠️',
          message: texts.stale!(goalTitle, daysSinceCreation),
          priority: 65,
          action: { type: 'navigate', path: `/goals/${goal.id}` },
          timestamp: new Date(),
          source: 'goals',
        });
      }
      return;
    }

    // Calculate progress
    const latestValue = goal.measurements[0]?.value || 0;
    const progress = goal.target_value > 0 
      ? (latestValue / goal.target_value) * 100 
      : 0;

    // Near completion (80-99%)
    if (progress >= 80 && progress < 100) {
      const goalTitle = goal.title || goal.metric_name || texts.defaultTitle!;
      insights.push({
        id: `goal-near-${goal.id}`,
        type: 'achievement',
        emoji: '🎯',
        message: texts.nearCompletion!(goalTitle, Math.round(progress)),
        priority: 85,
        action: { type: 'navigate', path: `/goals/${goal.id}` },
        timestamp: new Date(),
        source: 'goals',
      });
    }

    // Completed today
    const lastMeasurement = new Date(goal.measurements[0]?.created_at);
    const isToday = lastMeasurement.toDateString() === new Date().toDateString();
    if (progress >= 100 && isToday) {
      const goalTitle = goal.title || goal.metric_name || texts.defaultTitle!;
      insights.push({
        id: `goal-complete-${goal.id}`,
        type: 'achievement',
        emoji: '🎉',
        message: texts.completed!(goalTitle),
        priority: 90,
        action: { type: 'navigate', path: `/goals/${goal.id}` },
        timestamp: new Date(),
        source: 'goals',
      });
    }
  });

  return insights;
}

/**
 * Generate habit-related insights
 */
export function generateHabitInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.habits, ...options?.habits };

  if (!habitsData || habitsData.length === 0) return insights;

  // Calculate max streak
  let maxStreak = 0;
  let streakHabit: any = null;

  habitsData.forEach((habit: any) => {
    const currentStreak = habit.stats?.current_streak || 0;
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      streakHabit = habit;
    }
  });

  // Show streak achievement for 5+ days
  if (maxStreak >= 5 && streakHabit) {
    insights.push({
      id: 'habit-streak',
      type: 'achievement',
      emoji: '🔥',
      message: texts.streak!(maxStreak, streakHabit.title),
      priority: 80,
      action: { type: 'navigate', path: '/habits' },
      timestamp: new Date(),
      source: 'habits',
    });
  }

  // Count completed today
  const completedToday = habitsData.filter((h: any) => h.completed_today).length;
  const totalHabits = habitsData.length;

  if (completedToday === totalHabits && totalHabits > 0) {
    insights.push({
      id: 'habits-all-complete',
      type: 'achievement',
      emoji: '✅',
      message: texts.allComplete!(completedToday, totalHabits),
      priority: 75,
      action: { type: 'navigate', path: '/habits' },
      timestamp: new Date(),
      source: 'habits',
    });
  } else if (completedToday > 0 && completedToday < totalHabits) {
    insights.push({
      id: 'habits-progress',
      type: 'info',
      emoji: '📝',
      message: texts.progress!(completedToday, totalHabits),
      priority: 40,
      action: { type: 'navigate', path: '/habits' },
      timestamp: new Date(),
      source: 'habits',
    });
  }

  return insights;
}

/**
 * Generate achievement insights
 */
export function generateAchievementInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { todayMetrics, metricsData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.achievements, ...options?.achievements };

  if (!todayMetrics) return insights;

  // Steps record
  if (todayMetrics.steps > 15000) {
    insights.push({
      id: 'achievement-steps',
      type: 'achievement',
      emoji: '🏆',
      message: texts.stepsRecord!(todayMetrics.steps.toLocaleString()),
      priority: 88,
      action: { type: 'navigate', path: '/metrics/steps' },
      timestamp: new Date(),
      source: 'achievements',
    });
  }

  // High recovery
  if (todayMetrics.recovery >= 85) {
    insights.push({
      id: 'achievement-recovery',
      type: 'achievement',
      emoji: '💪',
      message: texts.highRecovery!(todayMetrics.recovery),
      priority: 78,
      action: { type: 'navigate', path: '/metrics/recovery' },
      timestamp: new Date(),
      source: 'achievements',
    });
  }

  return insights;
}

/**
 * Generate information insights (sync status, etc.)
 */
export function generateInfoInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { metricsData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.info, ...options?.info };

  if (!metricsData?.latest) return insights;

  // Count today's synced metrics
  const today = new Date().toISOString().split('T')[0];
  const todayMetrics = metricsData.latest.filter((m: any) => 
    m.measurement_date?.startsWith(today)
  );

  if (todayMetrics.length > 0) {
    insights.push({
      id: 'info-sync',
      type: 'info',
      emoji: '📊',
      message: texts.syncedToday!(todayMetrics.length),
      priority: 35,
      action: { type: 'navigate', path: '/integrations' },
      timestamp: new Date(),
      source: 'info',
    });
  }

  return insights;
}

/**
 * Generate recommendation insights
 */
export function generateRecommendationInsights(
  context: InsightGeneratorContext,
  options?: InsightTextOptions
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { metricsData } = context;
  const defaultOpts = createDefaultOptions();
  const texts = { ...defaultOpts.recommendations, ...options?.recommendations };

  if (!metricsData?.latest) return insights;

  // Check for missing key metrics
  const keyMetrics = ['Weight', 'Resting Heart Rate', 'Sleep Duration', 'Steps'];
  const metricNames = new Set(metricsData.latest.map((m: any) => m.metric_name));

  keyMetrics.forEach(metricName => {
    if (!metricNames.has(metricName)) {
      insights.push({
        id: `recommendation-add-${metricName.toLowerCase().replace(' ', '-')}`,
        type: 'recommendation',
        emoji: '💡',
        message: texts.addMetric!(metricName),
        priority: 45,
        action: { type: 'navigate', path: '/add-metric' },
        timestamp: new Date(),
        source: 'recommendations',
      });
    }
  });

  return insights.slice(0, 1); // Limit to 1 recommendation
}
