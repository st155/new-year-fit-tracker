/**
 * Centralized hooks exports
 * 
 * Architecture:
 * - Primitive: Low-level utilities
 * - Composite: Data fetching & subscriptions
 * - Feature: Page-level orchestration
 */

// ===== PRIMITIVE HOOKS =====
export { useAuth } from './useAuth';
export { useForceTerraSync } from './useForceTerraSync';
export { useDebounce } from './primitive/useDebounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './primitive/useMediaQuery';

// ===== COMPOSITE HOOKS - Data =====
export { 
  useMetrics, 
  useLatestMetricsOnly, 
  useMetricHistory,
  useSingleMetric,
  type MetricData 
} from './composite/data/useMetrics';

export { 
  useBodyComposition,
  type BodyCompositionData,
  type Body3DModel
} from './composite/data/useBodyComposition';

// Data Quality hooks
export { useDataQuality } from './useDataQuality';
export { useConfidenceRecalculation } from './useConfidenceRecalculation';

// Keep existing hooks that are not deprecated
export { useLatestMetrics, useDeviceMetrics, type DeviceFilter } from './metrics/useLatestMetrics';
export { useLatestMetric } from './metrics/useLatestMetric';
export { useUnifiedMetricsQuery, metricsQueryKeys, type UnifiedMetric } from './metrics/useUnifiedMetricsQuery';

// ===== COMPOSITE HOOKS - Realtime =====
export {
  useRealtimeSubscription,
  useMetricsRealtime,
  useGoalsRealtime,
  useChallengeRealtime,
  useHabitsRealtime,
  useAIActionsRealtime,
} from './composite/realtime/useRealtimeSubscription';

// Data quality & insights
export { useTodayInsights } from './useTodayInsights';
export { useDataQualityHistory } from './useDataQualityHistory';

// ===== FEATURE HOOKS =====
export { useDashboard, type DashboardOptions } from './feature/useDashboard';
export { useProgressView } from './feature/useProgressView';

// ===== EXISTING HOOKS (not refactored yet) =====
export { useProfileQuery, profileQueryKeys } from './core/useProfileQuery';
export { useLeaderboardQuery, leaderboardQueryKeys } from './core/useLeaderboardQuery';
export { useWidgetsQuery, widgetKeys } from './useWidgetsQuery';
export { useWidgetsBatch } from './useWidgetsBatch';
export { useGoals } from './useGoals';
export { useChallenges } from './useChallenges';
export { useChallengeDetail } from './useChallengeDetail';
export { useChallengeGoals } from './useChallengeGoals';
export { useHabits } from './useHabits';
export { useHabitAttempts } from './useHabitAttempts';
export { useHabitMeasurements } from './useHabitMeasurements';
export { useActivityFeed } from './useActivityFeed';
export { useActivityReactions } from './useActivityReactions';
export { useBodyComposition as useBodyCompositionOld } from './useBodyComposition';
export { useInBodyAnalyses } from './useInBodyAnalyses';
export { useMetricData } from './useMetricData';
export { useMedicalDocuments } from './useMedicalDocuments';
export { useInBodyParser } from './useInBodyParser';
export { useOptimizedQuery, useRealtimeQuery, useStaticQuery } from './useOptimizedQuery';
export { usePullToRefresh } from './usePullToRefresh';
export { useSwipeNavigation } from './useSwipeNavigation';
export { useClientDetailData } from './useClientDetailData';
export { useClientAliases } from './useClientAliases';
export { useTrainerChat } from './useTrainerChat';
export { useTrainerChallenges } from './useTrainerChallenges';
export { useAIConversations } from './useAIConversations';
export { useAIPendingActions } from './useAIPendingActions';
export { useFastingWindow } from './useFastingWindow';
export { useGoalHabitSync } from './useGoalHabitSync';
export { usePrefetch } from './usePrefetch';
export { useTrainingPlanDetail } from './useTrainingPlanDetail';
export { useDashboardData } from './useSuspenseDashboardData';

// ===== DEPRECATED (will be removed) =====
// These still work but show console warnings
// See src/hooks/_deprecated/README.md for migration guide
