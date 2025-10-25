import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWidgetsQuery } from '@/hooks/useWidgetsQuery';
import { useWidgetsBatch } from '@/hooks/useWidgetsBatch';
import { useHabits } from '@/hooks/useHabits';
import { useChallenges } from '@/hooks/useChallenges';
import { useMetricsRealtime } from '@/hooks/composite/realtime/useRealtimeSubscription';

/**
 * FEATURE: Dashboard page data orchestration
 * 
 * Combines:
 * - Widgets + metrics batch fetching
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
  const { data: widgetsData, isLoading: metricsLoading } = useWidgetsBatch(
    user?.id, 
    widgetConfigs ?? []
  );
  
  const { habits: habitsData, isLoading: habitsLoading } = useHabits(user?.id);
  const { challenges, isLoading: challengesLoading } = useChallenges(user?.id);

  // ===== Realtime subscriptions =====
  useMetricsRealtime(enableRealtime && !!user);

  // ===== Combine data =====
  const dashboardData = useMemo(() => {
    // Map widgets to include data
    const widgets = (widgetConfigs ?? []).map(widget => {
      const key = `${widget.metric_name}-${widget.source}`;
      const data = widgetsData?.get(key);
      
      return {
        ...widget,
        value: data?.value,
        unit: data?.unit,
        date: data?.measurement_date,
        trend: data?.trend,
      };
    });

    return {
      widgets,
      habits: habitsData ?? [],
      challenges: challenges ?? [],
    };
  }, [widgetConfigs, widgetsData, habitsData, challenges]);

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
