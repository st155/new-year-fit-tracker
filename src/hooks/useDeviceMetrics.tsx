import { useAuth } from '@/hooks/useAuth';
import { useUnifiedMetrics } from '@/hooks/useUnifiedMetrics';
import type { DeviceFilter } from '@/hooks/useUnifiedMetrics';

export const useDeviceMetrics = (deviceFilter: DeviceFilter) => {
  const { user } = useAuth();
  
  const { metrics, loading, error, refetch } = useUnifiedMetrics(user?.id);
  
  // Filter by device and get latest value for each metric (prioritize by priority, then date, then created_at)
  const deviceMetrics = metrics
    .filter(m => deviceFilter === 'all' || m.source.toLowerCase() === deviceFilter.toLowerCase())
    .reduce((acc, metric) => {
      const existing = acc[metric.metric_name];
      
      if (!existing) {
        acc[metric.metric_name] = metric;
      } else {
        // Priority comparison (lower priority = better, e.g., Whoop=1 is better than Garmin=6)
        const existingPriority = existing.priority || 999;
        const currentPriority = metric.priority || 999;
        
        if (currentPriority < existingPriority) {
          // Current metric has better priority
          acc[metric.metric_name] = metric;
        } else if (currentPriority === existingPriority) {
          // Same priority - compare dates
          const existingDate = new Date(existing.measurement_date);
          const currentDate = new Date(metric.measurement_date);
          
          if (currentDate > existingDate) {
            acc[metric.metric_name] = metric;
          } else if (existingDate.getTime() === currentDate.getTime()) {
            // Same date - choose most recent by created_at
            if (new Date(metric.created_at || 0) > new Date(existing.created_at || 0)) {
              acc[metric.metric_name] = metric;
            }
          }
        }
      }
      
      return acc;
    }, {} as Record<string, any>);
  
  return { metrics: deviceMetrics, loading, error, refetch };
};
