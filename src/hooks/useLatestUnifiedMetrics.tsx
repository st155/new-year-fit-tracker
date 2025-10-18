import { useAuth } from '@/hooks/useAuth';
import { useUnifiedMetrics } from '@/hooks/useUnifiedMetrics';

export const useLatestUnifiedMetrics = () => {
  const { user } = useAuth();
  
  const { metrics, loading, error } = useUnifiedMetrics(user?.id);
  
  // Group by metric_name and get latest value
  const latestMetrics = metrics.reduce((acc, metric) => {
    const existing = acc[metric.metric_name];
    
    if (!existing) {
      acc[metric.metric_name] = metric;
    } else {
      const existingDate = new Date(existing.measurement_date);
      const currentDate = new Date(metric.measurement_date);
      
      // Если даты одинаковые - выбираем по created_at (самую свежую запись)
      if (existingDate.getTime() === currentDate.getTime()) {
        if (new Date(metric.created_at || 0) > new Date(existing.created_at || 0)) {
          acc[metric.metric_name] = metric;
        }
      } else if (currentDate > existingDate) {
        acc[metric.metric_name] = metric;
      }
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  return { metrics: latestMetrics, loading, error };
};
