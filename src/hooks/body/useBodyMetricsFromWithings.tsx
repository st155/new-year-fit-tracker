import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetricData } from '../useAggregatedBodyMetrics';

interface WithingsMetrics {
  weight?: MetricData;
  bodyFat?: MetricData;
}

function calculateTrend(data: { value: number }[]) {
  if (data.length < 2) return { trend: 0, trendPercent: 0 };
  const current = data[0].value;
  const previous = data[1].value;
  const trend = current - previous;
  const trendPercent = previous ? (trend / previous) * 100 : 0;
  return { trend, trendPercent };
}

function getBodyFatZone(percent: number): string {
  if (percent <= 13) return 'athlete';
  if (percent <= 17) return 'optimal';
  if (percent <= 24) return 'average';
  return 'high';
}

export function useBodyMetricsFromWithings(userId?: string): WithingsMetrics | null {
  const { data: withingsData } = useQuery({
    queryKey: ['withings-metrics', userId],
    queryFn: async () => {
      if (!userId) return { weight: [], bodyFat: [] };

      // Fetch Withings weight data
      const { data: weightMetric } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('metric_name', 'Weight')
        .eq('source', 'withings')
        .maybeSingle();

      // Fetch Withings body fat data
      const { data: bodyFatMetric } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('metric_name', 'Body Fat Percentage')
        .eq('source', 'withings')
        .maybeSingle();

      const weight = weightMetric
        ? await supabase
            .from('metric_values')
            .select('value, measurement_date')
            .eq('metric_id', weightMetric.id)
            .order('measurement_date', { ascending: false })
            .limit(30)
        : { data: [] };

      const bodyFat = bodyFatMetric
        ? await supabase
            .from('metric_values')
            .select('value, measurement_date')
            .eq('metric_id', bodyFatMetric.id)
            .order('measurement_date', { ascending: false })
            .limit(30)
        : { data: [] };

      return {
        weight: weight.data || [],
        bodyFat: bodyFat.data || [],
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  return useMemo(() => {
    if (!withingsData?.weight?.length && !withingsData?.bodyFat?.length) return null;

    const metrics: WithingsMetrics = {};

    // Weight
    if (withingsData?.weight?.[0]) {
      const trendData = calculateTrend(withingsData.weight);
      metrics.weight = {
        value: withingsData.weight[0].value,
        unit: 'kg',
        source: 'withings',
        date: withingsData.weight[0].measurement_date,
        ...trendData,
        sparklineData: withingsData.weight.map(d => ({ 
          date: d.measurement_date, 
          value: d.value 
        })),
      };
    }

    // Body Fat
    if (withingsData?.bodyFat?.[0]) {
      const sortedHistory = [...withingsData.bodyFat].sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );
      const trendData = calculateTrend(sortedHistory.slice().reverse());
      
      metrics.bodyFat = {
        value: withingsData.bodyFat[0].value,
        unit: '%',
        source: 'withings',
        date: withingsData.bodyFat[0].measurement_date,
        ...trendData,
        sparklineData: sortedHistory.map(d => ({ 
          date: d.measurement_date, 
          value: d.value 
        })),
        zone: getBodyFatZone(withingsData.bodyFat[0].value),
        sources: {
          withings: {
            value: withingsData.bodyFat[0].value,
            date: withingsData.bodyFat[0].measurement_date,
            sparklineData: sortedHistory.map(d => ({ 
              date: d.measurement_date, 
              value: d.value 
            })),
          }
        }
      };
    }

    return metrics;
  }, [withingsData]);
}
