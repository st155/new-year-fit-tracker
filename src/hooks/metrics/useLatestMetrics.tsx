import { useMemo } from 'react';
import { useUnifiedMetricsQuery, UnifiedMetric } from './useUnifiedMetricsQuery';
import type { MetricWithConfidence } from '@/lib/data-quality';

export function useLatestMetrics(userId: string | undefined) {
  const { data: metrics = [], isLoading, error } = useUnifiedMetricsQuery(userId, {
    useV2: true, // Use V2 by default
  });
  
  // V2 already returns deduplicated metrics, just convert to Map for convenience
  const latestMetrics = useMemo(() => {
    return metrics.reduce((acc, metric) => {
      acc[metric.metric_name] = metric;
      return acc;
    }, {} as Record<string, UnifiedMetric>);
  }, [metrics]);

  // Build quality map for easy confidence access
  const qualityMap = useMemo(() => {
    return new Map<string, number>(
      metrics.map(m => [m.metric_name, m.confidence_score || 0])
    );
  }, [metrics]);
  
  return { 
    metrics: latestMetrics, 
    qualityMap,
    loading: isLoading, 
    error 
  };
}

// For device-specific filtering
export type DeviceFilter = 'all' | 'whoop' | 'oura' | 'withings' | 'terra' | 'manual' | 'apple_health' | 'garmin' | 'ultrahuman';

export function useDeviceMetrics(
  userId: string | undefined, 
  deviceFilter: DeviceFilter
) {
  const { data: metrics = [], isLoading, error, refetch } = useUnifiedMetricsQuery(userId, {
    useV2: true,
  });
  
  const deviceMetrics = useMemo(() => {
    const filtered = deviceFilter === 'all' 
      ? metrics 
      : metrics.filter(m => m.source.toLowerCase() === deviceFilter.toLowerCase());
    
    return filtered.reduce((acc, metric) => {
      acc[metric.metric_name] = metric;
      return acc;
    }, {} as Record<string, UnifiedMetric>);
  }, [metrics, deviceFilter]);
  
  return { metrics: deviceMetrics, loading: isLoading, error, refetch };
}
