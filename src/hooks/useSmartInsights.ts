/**
 * Smart Insights Hook
 * Aggregates and prioritizes insights from multiple sources
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useDataQuality } from './useDataQuality';
import { useGoalsQuery } from '@/features/goals/hooks';
import { useHabits } from './useHabits';
import { useTodayMetrics } from './metrics/useTodayMetrics';
import { useMetrics } from './composite/data/useMetrics';
import type { SmartInsight } from '@/lib/insights/types';
import {
  generateQualityInsights,
  generateTrendInsights,
  generateGoalInsights,
  generateHabitInsights,
  generateAchievementInsights,
  generateInfoInsights,
  generateRecommendationInsights,
} from '@/lib/insights/insight-generators';
import {
  generateCorrelationInsights,
  generateAnomalyInsights,
  generatePredictionInsights,
  generateSocialInsights,
  generateTrainerInsights,
  generateTemporalInsights,
} from '@/lib/insights/advanced-generators';
import {
  prioritizeInsights,
  deduplicateInsights,
  limitInsights,
  applyPersonalization,
} from '@/lib/insights/insight-prioritizer';
import { useInsightPersonalization } from './useInsightPersonalization';
import { useChallengeProgress } from './useChallengeProgress';
import { useTrainerMessages } from './useTrainerMessages';

interface UseSmartInsightsOptions {
  maxInsights?: number;
  minPriority?: number;
  enabledSources?: string[];
}

export function useSmartInsights(options: UseSmartInsightsOptions = {}) {
  const { maxInsights = 7, minPriority = 30, enabledSources = ['all'] } = options;
  const { user } = useAuth();

  // Fetch data from all sources
  const qualityData = useDataQuality();
  const { personalGoals, challengeGoals, isLoading: goalsLoading } = useGoalsQuery(user?.id);
  const { habits } = useHabits(user?.id);
  const { metrics: todayMetrics, loading: todayLoading } = useTodayMetrics(user?.id);
  const { 
    latest: latestMetrics, 
    history: metricsHistory, 
    isLoading: metricsLoading 
  } = useMetrics({
    dateRange: {
      start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch advanced data sources
  const { data: challengeData } = useChallengeProgress(user?.id);
  const { data: trainerData } = useTrainerMessages(user?.id);
  const { preferences } = useInsightPersonalization();

  const isLoading = todayLoading || metricsLoading || qualityData.isLoading || goalsLoading;

  // Generate insights
  const insights = useMemo(() => {
    if (!user?.id || isLoading) return [];

    const context = {
      userId: user.id,
      qualityData,
      metricsData: { latest: latestMetrics, history: metricsHistory },
      goalsData: { personal: personalGoals, challenge: challengeGoals },
      habitsData: habits,
      todayMetrics,
      challengeData,
      trainerData,
    };

    const allInsights: SmartInsight[] = [];

    // Generate from each source
    const shouldInclude = (source: string) => 
      enabledSources.includes('all') || enabledSources.includes(source);

    if (shouldInclude('quality')) {
      allInsights.push(...generateQualityInsights(context));
    }

    if (shouldInclude('trends')) {
      allInsights.push(...generateTrendInsights(context));
    }

    if (shouldInclude('goals')) {
      allInsights.push(...generateGoalInsights(context));
    }

    if (shouldInclude('habits')) {
      allInsights.push(...generateHabitInsights(context));
    }

    if (shouldInclude('achievements')) {
      allInsights.push(...generateAchievementInsights(context));
    }

    if (shouldInclude('info')) {
      allInsights.push(...generateInfoInsights(context));
    }

    if (shouldInclude('recommendations')) {
      allInsights.push(...generateRecommendationInsights(context));
    }

    // Advanced insights
    if (shouldInclude('correlations')) {
      allInsights.push(...generateCorrelationInsights(context));
    }

    if (shouldInclude('anomalies')) {
      allInsights.push(...generateAnomalyInsights(context));
    }

    if (shouldInclude('predictions')) {
      allInsights.push(...generatePredictionInsights(context));
    }

    if (shouldInclude('social')) {
      allInsights.push(...generateSocialInsights(context));
    }

    if (shouldInclude('trainer')) {
      allInsights.push(...generateTrainerInsights(context));
    }

    if (shouldInclude('temporal')) {
      allInsights.push(...generateTemporalInsights(context));
    }

    // Process insights
    let processed = allInsights;
    
    // Deduplicate
    processed = deduplicateInsights(processed);
    
    // Apply personalization
    processed = applyPersonalization(processed, preferences);
    
    // Prioritize
    processed = prioritizeInsights(processed);
    
    // Filter by minimum priority
    processed = processed.filter(i => i.priority >= minPriority);
    
    // Limit count
    processed = limitInsights(processed, maxInsights);

    return processed;
  }, [
    user?.id,
    isLoading,
    qualityData,
    latestMetrics,
    metricsHistory,
    personalGoals,
    challengeGoals,
    habits,
    todayMetrics,
    challengeData,
    trainerData,
    preferences,
    enabledSources,
    maxInsights,
    minPriority,
  ]);

  return {
    insights,
    isLoading,
  };
}
