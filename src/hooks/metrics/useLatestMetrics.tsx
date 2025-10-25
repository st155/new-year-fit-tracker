import { useMemo } from 'react';
import { useUnifiedMetricsQuery, UnifiedMetric } from './useUnifiedMetricsQuery';

// Shared deduplication logic
function deduplicateByPriority<T extends { 
  metric_name: string; 
  priority: number; 
  measurement_date: string;
  created_at?: string;
}>(metrics: T[]): Record<string, T> {
  return metrics.reduce((acc, metric) => {
    const existing = acc[metric.metric_name];
    
    if (!existing) {
      acc[metric.metric_name] = metric;
      return acc;
    }

    const existingPriority = existing.priority || 999;
    const currentPriority = metric.priority || 999;
    
    if (currentPriority < existingPriority) {
      acc[metric.metric_name] = metric;
    } else if (currentPriority === existingPriority) {
      const existingDate = new Date(existing.measurement_date);
      const currentDate = new Date(metric.measurement_date);
      
      if (currentDate > existingDate) {
        acc[metric.metric_name] = metric;
      } else if (existingDate.getTime() === currentDate.getTime()) {
        if (new Date(metric.created_at || 0) > new Date(existing.created_at || 0)) {
          acc[metric.metric_name] = metric;
        }
      }
    }
    
    return acc;
  }, {} as Record<string, T>);
}

export function useLatestMetrics(userId: string | undefined) {
  const { data: metrics = [], isLoading, error } = useUnifiedMetricsQuery(userId);
  
  const latestMetrics = useMemo(() => 
    deduplicateByPriority(metrics), 
    [metrics]
  );
  
  return { metrics: latestMetrics, loading: isLoading, error };
}

// For device-specific filtering
export type DeviceFilter = 'all' | 'whoop' | 'withings' | 'terra' | 'manual' | 'apple_health' | 'garmin' | 'ultrahuman';

export function useDeviceMetrics(
  userId: string | undefined, 
  deviceFilter: DeviceFilter
) {
  const { data: metrics = [], isLoading, error, refetch } = useUnifiedMetricsQuery(userId);
  
  const deviceMetrics = useMemo(() => {
    const filtered = deviceFilter === 'all' 
      ? metrics 
      : metrics.filter(m => m.source.toLowerCase() === deviceFilter.toLowerCase());
    
    return deduplicateByPriority(filtered);
  }, [metrics, deviceFilter]);
  
  return { metrics: deviceMetrics, loading: isLoading, error, refetch };
}
