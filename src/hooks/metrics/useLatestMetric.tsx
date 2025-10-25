import { useUnifiedMetricsQuery } from './useUnifiedMetricsQuery';

export function useLatestMetric(userId: string | undefined, metricName: string) {
  const { data: metrics = [], isLoading, error } = useUnifiedMetricsQuery(userId, { metricName });
  
  const latestMetric = metrics[0]; // Already sorted by priority + date
  
  return {
    value: latestMetric?.value,
    source: latestMetric?.source,
    unit: latestMetric?.unit,
    date: latestMetric?.measurement_date,
    loading: isLoading,
    error,
  };
}
