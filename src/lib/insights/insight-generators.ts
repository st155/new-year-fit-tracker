/**
 * Smart Insight Generators
 */

import type { SmartInsight, InsightGeneratorContext } from './types';

/**
 * Generate quality-related insights
 */
export function generateQualityInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { qualityData } = context;

  if (!qualityData) return insights;

  // Poor quality metrics
  const poorMetrics = qualityData.metricsByQuality?.poor || [];
  if (poorMetrics.length > 0) {
    insights.push({
      id: 'quality-poor',
      type: 'critical',
      emoji: '🚨',
      message: `${poorMetrics.length} ${poorMetrics.length === 1 ? 'метрика требует' : 'метрик требуют'} внимания`,
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
      message: `${fairMetrics.length} ${fairMetrics.length === 1 ? 'метрика' : 'метрик'} с низким качеством`,
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
export function generateTrendInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { metricsData } = context;

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
        message: `${metricName}: ${isPositive ? '+' : ''}${change.toFixed(0)}% за неделю`,
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
export function generateGoalInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { goalsData } = context;

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
        insights.push({
          id: `goal-stale-${goal.id}`,
          type: 'warning',
          emoji: '⚠️',
          message: `Цель "${goal.title}" не обновлялась ${daysSinceCreation} ${daysSinceCreation === 1 ? 'день' : 'дней'}`,
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
      insights.push({
        id: `goal-near-${goal.id}`,
        type: 'achievement',
        emoji: '🎯',
        message: `Цель "${goal.title}" на ${Math.round(progress)}%!`,
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
      insights.push({
        id: `goal-complete-${goal.id}`,
        type: 'achievement',
        emoji: '🎉',
        message: `Цель "${goal.title}" достигнута!`,
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
export function generateHabitInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData } = context;

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
      message: `Стрейк: ${maxStreak} ${maxStreak === 1 ? 'день' : 'дней'} - ${streakHabit.title}`,
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
      message: `Все привычки выполнены (${totalHabits}/${totalHabits})`,
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
      message: `Привычки: ${completedToday}/${totalHabits} выполнено`,
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
export function generateAchievementInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { todayMetrics, metricsData } = context;

  if (!todayMetrics) return insights;

  // Steps record
  if (todayMetrics.steps > 15000) {
    insights.push({
      id: 'achievement-steps',
      type: 'achievement',
      emoji: '🏆',
      message: `Новый рекорд! ${todayMetrics.steps.toLocaleString()} шагов`,
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
      message: `Отличное восстановление: ${todayMetrics.recovery}%`,
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
export function generateInfoInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { metricsData } = context;

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
      message: `Сегодня синхронизировано ${todayMetrics.length} ${todayMetrics.length === 1 ? 'метрика' : 'метрик'}`,
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
export function generateRecommendationInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { metricsData } = context;

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
        message: `Добавьте метрику "${metricName}" для полной картины`,
        priority: 45,
        action: { type: 'navigate', path: '/add-metric' },
        timestamp: new Date(),
        source: 'recommendations',
      });
    }
  });

  return insights.slice(0, 1); // Limit to 1 recommendation
}
