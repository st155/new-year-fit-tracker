import { useAuth } from '@/hooks/useAuth';
import { useUnifiedMetrics } from '@/hooks/useUnifiedMetrics';

export const useLatestUnifiedMetrics = () => {
  const { user } = useAuth();
  
  const { metrics, loading, error } = useUnifiedMetrics(user?.id);
  
  // Group by metric_name and get latest value
  const latestMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name] || new Date(metric.measurement_date) > new Date(acc[metric.metric_name].measurement_date)) {
      acc[metric.metric_name] = metric;
    }
    return acc;
  }, {} as Record<string, any>);
  
  return { metrics: latestMetrics, loading, error };
};
