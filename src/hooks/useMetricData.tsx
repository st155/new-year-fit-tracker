import { useUnifiedMetricsQuery } from './metrics/useUnifiedMetricsQuery';

interface UseMetricDataOptions {
  userId?: string;
  metricName?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useMetricData(options: UseMetricDataOptions) {
  const { 
    data = [], 
    isLoading, 
    error: queryError 
  } = useUnifiedMetricsQuery(options.userId, {
    metricName: options.metricName,
    startDate: options.startDate,
    endDate: options.endDate,
  });

  // Apply limit (unified query doesn't have limit parameter yet)
  const limitedData = options.limit ? data.slice(0, options.limit) : data;

  return { 
    data: limitedData, 
    loading: isLoading, 
    error: queryError || null 
  };
}
