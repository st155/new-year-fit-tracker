/**
 * V2 Convenience Hooks
 * New hooks that leverage the V2.0 data quality system
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMetrics } from './useMetrics';
import { ConfidenceScorer, ConflictResolver } from '@/lib/data-quality';
import type { MetricWithConfidence } from '@/lib/data-quality';

/**
 * V2: Get metric with full quality information
 */
export function useMetricWithQuality(metricName: string) {
  const { latest, isLoading, getMetricWithQuality } = useMetrics({ 
    metricTypes: [metricName],
    withQuality: true,
  });
  
  const metric = latest[0] as MetricWithConfidence | undefined;
  
  return {
    metric: metric?.metric,
    confidence: metric?.confidence,
    factors: metric?.factors,
    hasGoodQuality: (metric?.confidence ?? 0) >= 70,
    isLoading,
  };
}

/**
 * V2: Detect conflicts for a specific metric
 */
export function useConflictDetection(metricName: string) {
  const { user } = useAuth();
  const userId = user?.id;
  
  return useQuery({
    queryKey: ['conflicts', userId, metricName],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get all sources for this metric today
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_name', metricName)
        .eq('measurement_date', today);
      
      if (error) throw error;
      if (!data || data.length < 2) return [];
      
      // Calculate confidence scores
      const metricsWithConfidence = ConfidenceScorer.calculateBatch(
        data.map(d => ({
          metric_id: d.id || '',
          user_id: d.user_id,
          metric_name: d.metric_name,
          metric_type: d.metric_name as any,
          value: d.value,
          unit: d.unit,
          source: d.source as any,
          measurement_date: d.measurement_date,
          created_at: d.created_at || '',
          priority: d.priority || 5,
        }))
      );
      
      // Detect outliers
      return ConflictResolver.detectOutliers(metricsWithConfidence, 15);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
