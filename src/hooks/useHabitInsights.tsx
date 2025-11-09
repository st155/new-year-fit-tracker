/**
 * Habit-specific insights hook
 */

import { useMemo } from 'react';
import { useHabitCompletions } from './useHabitAnalytics';
import {
  generatePatternInsights,
  generateRiskInsights,
  generateOptimizationInsights,
  generateHabitAchievementInsights,
  generateAIRecommendationInsights,
} from '@/lib/insights/habit-insight-generators';
import { calculateHabitsQuality } from '@/lib/insights/habit-quality';
import type { SmartInsight } from '@/lib/insights/types';

interface UseHabitInsightsOptions {
  userId?: string;
  habits: any[];
  enabled?: boolean;
}

export function useHabitInsights({ userId, habits, enabled = true }: UseHabitInsightsOptions) {
  const { data: completions, isLoading } = useHabitCompletions(userId, 30);

  const insights = useMemo(() => {
    if (!enabled || !userId || !habits.length || isLoading || !completions) {
      return {
        all: [] as SmartInsight[],
        patterns: [] as SmartInsight[],
        risks: [] as SmartInsight[],
        optimizations: [] as SmartInsight[],
        achievements: [] as SmartInsight[],
        recommendations: [] as SmartInsight[],
        qualityScores: [],
      };
    }

    const context = {
      userId,
      habitsData: habits,
      todayMetrics: { habit_completions: completions },
    };

    const patterns = generatePatternInsights(context);
    const risks = generateRiskInsights(context);
    const optimizations = generateOptimizationInsights(context);
    const achievements = generateHabitAchievementInsights(context);
    const recommendations = generateAIRecommendationInsights(context);

    const all = [
      ...patterns,
      ...risks,
      ...optimizations,
      ...achievements,
      ...recommendations,
    ].sort((a, b) => b.priority - a.priority);

    const qualityScores = calculateHabitsQuality(habits, completions, 30);

    return {
      all,
      patterns,
      risks,
      optimizations,
      achievements,
      recommendations,
      qualityScores,
    };
  }, [userId, habits, completions, isLoading, enabled]);

  return {
    ...insights,
    isLoading,
  };
}
