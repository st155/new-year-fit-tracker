export { useUnifiedMetricsQuery, metricsQueryKeys } from './useUnifiedMetricsQuery';
export type { UnifiedMetric } from './useUnifiedMetricsQuery';
export type { MetricWithConfidence } from '@/lib/data-quality';

// Re-export from composite for backwards compatibility
export { 
  useLatestMetrics, 
  useDeviceMetrics,
  type DeviceFilter,
} from '@/hooks/composite/data/useMetrics';

export { useMetricMapping } from './useMetricMapping';
export { useSystemStatus } from './useSystemStatus';
export { useSmartWidgetsData } from './useSmartWidgetsData';
export type { SmartWidgetData } from './useSmartWidgetsData';
export { useMultiSourceWidgetsData } from './useMultiSourceWidgetsData';
export type { MultiSourceWidgetData, SourceData } from './useMultiSourceWidgetsData';
export { useMetricsRealtime } from './useMetricsRealtime';
export { useTodayMetrics } from './useTodayMetrics';
export type { TodayMetrics } from './useTodayMetrics';
export { useChallengeHistory } from './useChallengeHistory';
export type { ChallengeStats } from './useChallengeHistory';
export { useWidgetHistory } from './useWidgetHistory';
export type { WidgetHistoryData } from './useWidgetHistory';
