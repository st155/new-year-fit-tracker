import { useAuth } from '@/hooks/useAuth';
import { useUnifiedMetrics } from '@/hooks/useUnifiedMetrics';
import type { DeviceFilter } from '@/hooks/useUnifiedMetrics';

export const useDeviceMetrics = (deviceFilter: DeviceFilter) => {
  const { user } = useAuth();
  
  const { metrics, loading, error } = useUnifiedMetrics(user?.id);
  
  // Filter by device and get latest value for each metric
  const deviceMetrics = metrics
    .filter(m => deviceFilter === 'all' || m.source.toLowerCase() === deviceFilter.toLowerCase())
    .reduce((acc, metric) => {
      if (!acc[metric.metric_name] || new Date(metric.measurement_date) > new Date(acc[metric.metric_name].measurement_date)) {
        acc[metric.metric_name] = metric;
      }
      return acc;
    }, {} as Record<string, any>);
  
  return { metrics: deviceMetrics, loading, error };
};
