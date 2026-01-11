/**
 * Advanced Insight Generators
 * Generates AI-powered insights using data analysis
 */

import i18n from '@/i18n';
import type { SmartInsight, InsightGeneratorContext } from './types';
import {
  calculateCorrelation,
  groupByDate,
} from './analyzers/correlation-analyzer';
import {
  calculateStats,
  calculateZScore,
  percentFromMean,
  getAnomalySeverity,
} from './analyzers/anomaly-detector';
import {
  calculateTrend,
  predictGoalCompletion,
  calculatePercentChange,
} from './analyzers/predictor';
import {
  findOptimalTime,
  detectWeekendEffect,
} from './analyzers/pattern-detector';

/**
 * Generate correlation insights
 */
export function generateCorrelationInsights(
  context: InsightGeneratorContext
): SmartInsight[] {
  const { metricsData } = context;
  if (!metricsData?.history || metricsData.history.length < 7) return [];

  const insights: SmartInsight[] = [];

  // Group by date
  const dailyData = groupByDate(metricsData.history);
  if (dailyData.length < 7) return insights;

  // Extract metric arrays
  const sleepValues: number[] = [];
  const recoveryValues: number[] = [];
  const activityValues: number[] = [];

  dailyData.forEach((day) => {
    if (day['Sleep Duration']) sleepValues.push(day['Sleep Duration']);
    if (day['Recovery Score']) recoveryValues.push(day['Recovery Score']);
    if (day['Steps']) activityValues.push(day['Steps']);
  });

  // Sleep vs Recovery correlation
  if (sleepValues.length >= 5 && recoveryValues.length >= 5) {
    const correlation = calculateCorrelation(sleepValues, recoveryValues);

    if (Math.abs(correlation) > 0.4) {
      const avgSleep = sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length;
      const goodSleep = sleepValues.filter((v) => v > avgSleep);
      const goodSleepIndices = sleepValues
        .map((v, i) => (v > avgSleep ? i : -1))
        .filter((i) => i !== -1);
      const recoveryOnGoodSleep = goodSleepIndices
        .map((i) => recoveryValues[i])
        .filter((v) => v !== undefined);

      if (recoveryOnGoodSleep.length > 0) {
        const avgRecoveryGood =
          recoveryOnGoodSleep.reduce((a, b) => a + b, 0) / recoveryOnGoodSleep.length;
        const avgRecoveryAll =
          recoveryValues.reduce((a, b) => a + b, 0) / recoveryValues.length;
        const difference = ((avgRecoveryGood / avgRecoveryAll - 1) * 100);

        if (difference > 5) {
          insights.push({
            id: 'correlation-sleep-recovery',
            type: 'correlation',
            emoji: '💡',
            message: i18n.t('insights:correlations.sleepRecovery', { 
              hours: Math.round(avgSleep), 
              percent: Math.round(difference) 
            }),
            priority: 60,
            action: { type: 'navigate', path: '/metrics' },
            timestamp: new Date(),
            source: 'correlations',
          });
        }
      }
    }
  }

  return insights;
}

/**
 * Generate anomaly insights
 */
export function generateAnomalyInsights(
  context: InsightGeneratorContext
): SmartInsight[] {
  const { todayMetrics, metricsData } = context;
  if (!todayMetrics || !metricsData?.history) return [];

  const insights: SmartInsight[] = [];

  // Check Steps for anomalies
  const stepsHistory = metricsData.history
    .filter((m: any) => m.metric_name === 'Steps')
    .map((m: any) => m.value)
    .slice(0, 30);

  if (stepsHistory.length >= 5 && todayMetrics.steps) {
    const stats = calculateStats(stepsHistory);
    const zScore = calculateZScore(todayMetrics.steps, stats.mean, stats.std);

    if (zScore < -2) {
      const percentDiff = Math.round(Math.abs(percentFromMean(todayMetrics.steps, stats.mean)));
      const severity = getAnomalySeverity(zScore);

      insights.push({
        id: 'anomaly-steps-low',
        type: 'anomaly',
        emoji: severity === 'severe' ? '🚨' : '⚠️',
        message: i18n.t('insights:anomalies.lowActivity', { percent: percentDiff }),
        priority: severity === 'severe' ? 90 : 75,
        action: { type: 'navigate', path: '/metrics' },
        timestamp: new Date(),
        source: 'anomalies',
      });
    }
  }

  // Check Sleep Duration for anomalies
  const sleepHistory = metricsData.history
    .filter((m: any) => m.metric_name === 'Sleep Duration')
    .map((m: any) => m.value)
    .slice(0, 30);

  if (sleepHistory.length >= 5 && todayMetrics.sleep) {
    const stats = calculateStats(sleepHistory);
    const zScore = calculateZScore(todayMetrics.sleep, stats.mean, stats.std);

    if (zScore < -2) {
      insights.push({
        id: 'anomaly-sleep-low',
        type: 'anomaly',
        emoji: '😴',
        message: i18n.t('insights:anomalies.lowSleep', { 
          actual: todayMetrics.sleep.toFixed(1), 
          average: stats.mean.toFixed(1) 
        }),
        priority: 80,
        action: { type: 'navigate', path: '/metrics' },
        timestamp: new Date(),
        source: 'anomalies',
      });
    }
  }

  return insights;
}

/**
 * Generate prediction insights
 */
export function generatePredictionInsights(
  context: InsightGeneratorContext
): SmartInsight[] {
  const { goalsData, metricsData } = context;
  if (!goalsData || !metricsData) return [];

  const insights: SmartInsight[] = [];
  const allGoals = [...(goalsData.personal || []), ...(goalsData.challenge || [])];

  allGoals.forEach((goal: any) => {
    if (!goal.measurements || goal.measurements.length < 3) return;

    const measurements = goal.measurements
      .slice(0, 14)
      .map((m: any) => m.value)
      .reverse();

    const currentValue = measurements[measurements.length - 1];
    const targetValue = goal.target_value;

    if (currentValue === targetValue) return;

    const daysToGoal = predictGoalCompletion(currentValue, targetValue, measurements);

    if (daysToGoal > 0 && daysToGoal <= 7) {
      insights.push({
        id: `prediction-goal-${goal.id}`,
        type: 'prediction',
        emoji: '🎯',
        message: i18n.t('insights:predictions.goalReached', { title: goal.title, days: daysToGoal, count: daysToGoal }),
        priority: 70,
        action: { type: 'navigate', path: `/goals/${goal.id}` },
        timestamp: new Date(),
        source: 'predictions',
      });
    } else if (daysToGoal > 7 && daysToGoal <= 30) {
      const trend = calculateTrend(measurements);
      if (trend === 'up' && targetValue > currentValue) {
        insights.push({
          id: `prediction-goal-progress-${goal.id}`,
          type: 'prediction',
          emoji: '📈',
          message: i18n.t('insights:predictions.goodProgress', { title: goal.title }),
          priority: 50,
          action: { type: 'navigate', path: `/goals/${goal.id}` },
          timestamp: new Date(),
          source: 'predictions',
        });
      }
    }
  });

  return insights;
}

/**
 * Generate social/challenge insights
 */
export function generateSocialInsights(
  context: InsightGeneratorContext
): SmartInsight[] {
  const { challengeData } = context;
  if (!challengeData || challengeData.length === 0) return [];

  const insights: SmartInsight[] = [];

  challengeData.forEach((challenge: any) => {
    if (challenge.userRank && challenge.userRank <= 3) {
      const emoji = challenge.userRank === 1 ? '🥇' : challenge.userRank === 2 ? '🥈' : '🥉';
      insights.push({
        id: `social-top3-${challenge.challenge_id}`,
        type: 'social',
        emoji,
        message: i18n.t('insights:social.topRank', { rank: challenge.userRank, title: challenge.challenge?.title }),
        priority: 75,
        action: { type: 'navigate', path: `/challenges/${challenge.challenge_id}` },
        timestamp: new Date(),
        source: 'social',
      });
    }
  });

  return insights;
}

/**
 * Generate trainer insights
 */
export function generateTrainerInsights(
  context: InsightGeneratorContext
): SmartInsight[] {
  const { trainerData } = context;
  if (!trainerData) return [];

  const insights: SmartInsight[] = [];

  if (trainerData.unreadMessages > 0) {
    insights.push({
      id: 'trainer-unread-messages',
      type: 'trainer',
      emoji: '💬',
      message: i18n.t('insights:trainer.unreadMessages', { count: trainerData.unreadMessages }),
      priority: 70,
      action: { type: 'navigate', path: '/messages' },
      timestamp: new Date(),
      source: 'trainer',
    });
  }

  if (trainerData.newRecommendations > 0) {
    insights.push({
      id: 'trainer-new-recommendations',
      type: 'trainer',
      emoji: '👨‍⚕️',
      message: i18n.t('insights:trainer.newRecommendation'),
      priority: 75,
      action: { type: 'navigate', path: '/trainer' },
      timestamp: new Date(),
      source: 'trainer',
    });
  }

  return insights;
}

/**
 * Generate temporal pattern insights
 */
export function generateTemporalInsights(
  context: InsightGeneratorContext
): SmartInsight[] {
  const { metricsData } = context;
  if (!metricsData?.history || metricsData.history.length < 7) return [];

  const insights: SmartInsight[] = [];

  // Check weekend effect on activity
  const weekendEffect = detectWeekendEffect('Steps', metricsData.history);
  if (weekendEffect && Math.abs(weekendEffect.difference) > 20) {
    const direction = weekendEffect.difference < 0 
      ? i18n.t('insights:temporal.falls') 
      : i18n.t('insights:temporal.rises');
    const emoji = weekendEffect.difference < 0 ? '📉' : '📈';

    insights.push({
      id: 'temporal-weekend-activity',
      type: 'temporal',
      emoji,
      message: i18n.t('insights:temporal.weekendActivity', { 
        direction, 
        percent: Math.round(Math.abs(weekendEffect.difference)) 
      }),
      priority: 45,
      action: { type: 'navigate', path: '/analytics' },
      timestamp: new Date(),
      source: 'temporal',
    });
  }

  // Find optimal time for workouts
  const optimalTime = findOptimalTime('Steps', metricsData.history);
  if (optimalTime) {
    const timeLabel = i18n.t(`insights:timeLabels.${optimalTime}`);

    insights.push({
      id: 'temporal-optimal-activity',
      type: 'temporal',
      emoji: '⏰',
      message: i18n.t('insights:temporal.activityPeak', { time: timeLabel }),
      priority: 40,
      action: { type: 'navigate', path: '/analytics' },
      timestamp: new Date(),
      source: 'temporal',
    });
  }

  return insights;
}
