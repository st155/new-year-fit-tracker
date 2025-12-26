import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWidgetsQuery } from '@/hooks/useWidgetsQuery';
import { useSmartWidgetsData } from '@/hooks/metrics';
import { useHabits } from '@/hooks/useHabits';
import { useChallengesQuery } from '@/features/challenges';
import { useMetricsRealtime } from '@/hooks/composite/realtime/useRealtimeSubscription';

/**
 * FEATURE: Dashboard page data orchestration
 * 
 * Combines:
 * - Widgets + smart metrics batch fetching
 * - Habits
 * - Challenges
 * - Realtime subscriptions
 * 
 * Usage:
 * ```tsx
 * const { widgets, habits, challenges, isLoading } = useDashboard();
 * ```
 */

export interface DashboardOptions {
  enableRealtime?: boolean;
}

export function useDashboard(options?: DashboardOptions) {
  const { user } = useAuth();
  const { enableRealtime = true } = options ?? {};

  // ===== Parallel data fetching =====
  const { data: widgetConfigs, isLoading: widgetsLoading } = useWidgetsQuery(user?.id);
  const { data: widgetsData, ages, isLoading: metricsLoading } = useSmartWidgetsData(
    user?.id, 
    widgetConfigs ?? []
  );
  
  const { habits: habitsData, isLoading: habitsLoading } = useHabits(user?.id);
  const { challenges, isLoading: challengesLoading } = useChallengesQuery(user?.id);

  // ===== Realtime subscriptions =====
  useMetricsRealtime(enableRealtime && !!user);

  // ===== Combine data =====
  const dashboardData = useMemo(() => {
    // Map widgets to include data from smart batch (no source needed - auto-selected)
    const widgets = (widgetConfigs ?? []).map(widget => {
      const data = widgetsData.get(widget.id);
      const age = ages.get(widget.id) ?? 0;
      
      return {
        ...widget,
        value: data?.value,
        unit: data?.unit,
        date: data?.measurement_date,
        source: data?.source,
        confidence: data?.confidence_score,
        age,
      };
    });

    return {
      widgets,
      habits: habitsData ?? [],
      challenges: challenges ?? [],
    };
  }, [widgetConfigs, widgetsData, ages, habitsData, challenges]);

  // ===== Stats =====
  const stats = useMemo(() => {
    const activeHabits = (habitsData ?? []).filter(h => h.is_active).length;
    const activeChallenges = (challenges ?? []).filter(c => c.isParticipant).length;
    
    return {
      totalWidgets: dashboardData.widgets.length,
      activeHabits,
      activeChallenges,
    };
  }, [dashboardData, habitsData, challenges]);

  // ===== Loading & Error states =====
  const isLoading = 
    widgetsLoading || 
    metricsLoading || 
    habitsLoading || 
    challengesLoading;

  return {
    // Data
    dashboardData,
    stats,
    
    // Individual data for detailed access
    widgets: dashboardData.widgets,
    habits: dashboardData.habits,
    challenges: dashboardData.challenges,
    
    // States
    isLoading,
  };
}
