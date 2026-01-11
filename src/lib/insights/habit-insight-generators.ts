/**
 * Habit-specific insight generators
 */

import i18n from '@/i18n';
import type { SmartInsight, InsightGeneratorContext } from './types';
import {
  analyzeCompletionPatterns,
  detectHabitChains,
  calculateConsistencyScore,
  findOptimalHabitTime,
  predictHabitRisk,
  analyzeStreakQuality,
} from './analyzers/habit-analyzer';
import { detectTriggerHabits, findHabitSynergies } from './analyzers/habit-correlation';
import { calculateHabitsQuality, getHabitsNeedingAttention, getTopPerformingHabits } from './habit-quality';
import { generateHabitRecommendations } from './ai-recommendations';

function getHabitName(habit: any): string {
  return habit?.name || habit?.title || i18n.t('insights:habits.defaultName');
}

/**
 * Get localized time label
 */
function getTimeLabel(time: string): string {
  return i18n.t(`insights:timeLabels.${time}`, { defaultValue: time });
}

/**
 * Generate pattern-based insights
 */
export function generatePatternInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData, todayMetrics } = context;

  if (!habitsData || habitsData.length === 0) return insights;

  const completions = todayMetrics?.habit_completions || [];

  habitsData.forEach((habit: any) => {
    const optimalTime = findOptimalHabitTime(habit.id, completions);
    
    if (optimalTime && optimalTime.confidence > 70 && optimalTime.successRate > 75) {
      const timeLabel = getTimeLabel(optimalTime.time);
      
      insights.push({
        id: `pattern-optimal-time-${habit.id}`,
        type: 'habit_pattern',
        emoji: '⏰',
        message: i18n.t('insights:habits.moreSuccessful', {
          title: getHabitName(habit),
          percent: Math.round(optimalTime.successRate),
          timeLabel,
        }),
        priority: Math.round(optimalTime.confidence),
        action: {
          type: 'modal',
          data: { habitId: habit.id, suggestedTime: optimalTime.time },
        },
        timestamp: new Date(),
        source: 'habit-patterns',
      });
    }
  });

  // Habit chains
  const chains = detectHabitChains(completions);
  chains.slice(0, 2).forEach(chain => {
    const habit1 = habitsData.find((h: any) => h.id === chain.habit1);
    const habit2 = habitsData.find((h: any) => h.id === chain.habit2);

    if (habit1 && habit2) {
      insights.push({
        id: `pattern-chain-${chain.habit1}-${chain.habit2}`,
        type: 'habit_pattern',
        emoji: '🔗',
        message: i18n.t('insights:habits.togetherRate', {
          habit1: getHabitName(habit1),
          habit2: getHabitName(habit2),
          percent: Math.round(chain.coOccurrenceRate),
        }),
        priority: Math.round(chain.coOccurrenceRate),
        action: {
          type: 'modal',
          data: { habit1: chain.habit1, habit2: chain.habit2 },
        },
        timestamp: new Date(),
        source: 'habit-patterns',
      });
    }
  });

  return insights;
}

/**
 * Generate risk-based insights
 */
export function generateRiskInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData, todayMetrics } = context;

  if (!habitsData || habitsData.length === 0) return insights;

  const completions = todayMetrics?.habit_completions || [];

  habitsData.forEach((habit: any) => {
    const risk = predictHabitRisk(habit, completions);

    if (risk >= 70 && habit.current_streak > 0) {
      insights.push({
        id: `risk-streak-${habit.id}`,
        type: 'habit_risk',
        emoji: '⚠️',
        message: i18n.t('insights:habits.atRisk', {
          title: getHabitName(habit),
          days: habit.current_streak,
          count: habit.current_streak,
        }),
        priority: Math.round(risk),
        action: {
          type: 'navigate',
          path: '/habits-v3',
        },
        timestamp: new Date(),
        source: 'habit-risks',
      });
    }

    const streakQuality = analyzeStreakQuality(habit, completions);
    if (streakQuality.quality === 'poor' && habit.current_streak > 5) {
      insights.push({
        id: `risk-quality-${habit.id}`,
        type: 'habit_risk',
        emoji: '📉',
        message: i18n.t('insights:habits.qualityDecreasing', {
          title: getHabitName(habit),
        }),
        priority: 65,
        action: {
          type: 'modal',
          data: { habitId: habit.id, quality: streakQuality },
        },
        timestamp: new Date(),
        source: 'habit-risks',
      });
    }
  });

  return insights;
}

/**
 * Generate optimization insights
 */
export function generateOptimizationInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData, todayMetrics } = context;

  if (!habitsData || habitsData.length === 0) return insights;

  const completions = todayMetrics?.habit_completions || [];

  // Low consistency habits
  habitsData.forEach((habit: any) => {
    const consistency = calculateConsistencyScore(habit, completions, 30);
    
    if (consistency < 50 && consistency > 0) {
      insights.push({
        id: `optimize-consistency-${habit.id}`,
        type: 'habit_optimization',
        emoji: '🎯',
        message: i18n.t('insights:habits.improveConsistency', {
          title: getHabitName(habit),
          percent: Math.round(consistency),
        }),
        priority: 70 - Math.round(consistency / 2),
        action: {
          type: 'modal',
          data: { habitId: habit.id, suggestion: i18n.t('recommendations:setReminder') },
        },
        timestamp: new Date(),
        source: 'habit-optimization',
      });
    }
  });

  // Synergies
  const synergies = findHabitSynergies(habitsData, completions);
  synergies.slice(0, 2).forEach(synergy => {
    const habit1 = habitsData.find((h: any) => h.id === synergy.habit1);
    const habit2 = habitsData.find((h: any) => h.id === synergy.habit2);

    if (habit1 && habit2) {
      insights.push({
        id: `optimize-synergy-${synergy.habit1}-${synergy.habit2}`,
        type: 'habit_optimization',
        emoji: '⚡',
        message: i18n.t('insights:habits.combine', {
          habit1: getHabitName(habit1),
          habit2: getHabitName(habit2),
        }),
        priority: Math.round(synergy.synergyScore * 0.7),
        action: {
          type: 'modal',
          data: { habit1: synergy.habit1, habit2: synergy.habit2 },
        },
        timestamp: new Date(),
        source: 'habit-optimization',
      });
    }
  });

  return insights;
}

/**
 * Generate achievement insights
 */
export function generateHabitAchievementInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData, todayMetrics } = context;

  if (!habitsData || habitsData.length === 0) return insights;

  const completions = todayMetrics?.habit_completions || [];
  const qualityScores = calculateHabitsQuality(habitsData, completions, 30);
  const topHabits = getTopPerformingHabits(qualityScores);

  // New streak milestones
  habitsData.forEach((habit: any) => {
    if (habit.current_streak === habit.best_streak && habit.current_streak > 0) {
      if ([7, 14, 21, 30, 50, 100].includes(habit.current_streak)) {
        insights.push({
          id: `achievement-milestone-${habit.id}`,
          type: 'achievement',
          emoji: '🏆',
          message: i18n.t('insights:habits.newRecord', {
            days: habit.current_streak,
            title: getHabitName(habit),
          }),
          priority: 85,
          action: {
            type: 'modal',
            data: { habitId: habit.id, milestone: habit.current_streak },
          },
          timestamp: new Date(),
          source: 'habit-achievements',
        });
      }
    }
  });

  // Top performing habits
  if (topHabits.length > 0) {
    const best = topHabits[0];
    const habit = habitsData.find((h: any) => h.id === best.habitId);
    
    if (habit && best.overallScore >= 90) {
      insights.push({
        id: `achievement-quality-${habit.id}`,
        type: 'achievement',
        emoji: '⭐',
        message: i18n.t('insights:habits.qualityGrade', {
          title: getHabitName(habit),
          grade: best.grade,
          score: best.overallScore,
        }),
        priority: 75,
        action: {
          type: 'modal',
          data: { habitId: habit.id, qualityScore: best },
        },
        timestamp: new Date(),
        source: 'habit-achievements',
      });
    }
  }

  return insights;
}

/**
 * Generate AI recommendation insights
 */
export function generateAIRecommendationInsights(context: InsightGeneratorContext): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const { habitsData, todayMetrics } = context;

  if (!habitsData || habitsData.length === 0) return insights;

  const completions = todayMetrics?.habit_completions || [];
  const qualityScores = calculateHabitsQuality(habitsData, completions, 30);
  const recommendations = generateHabitRecommendations(habitsData, completions, qualityScores);

  recommendations.slice(0, 3).forEach(rec => {
    insights.push({
      id: `ai-rec-${rec.type}-${Date.now()}`,
      type: 'recommendation',
      emoji: '🤖',
      message: rec.description,
      priority: rec.priority,
      action: {
        type: 'modal',
        data: rec.data,
      },
      timestamp: new Date(),
      source: 'ai-recommendations',
    });
  });

  return insights;
}
