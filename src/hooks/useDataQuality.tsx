import { useMetrics } from './composite/data/useMetrics';
import type { MetricWithConfidence } from '@/lib/data-quality';

/**
 * Hook for accessing data quality information
 * Uses the enhanced useMetrics hook with withQuality enabled
 */
export function useDataQuality(metricTypes?: string[]) {
  const { 
    latest, 
    isLoading, 
    error,
    qualitySummary,
    getMetricWithQuality,
    hasGoodQuality 
  } = useMetrics({
    metricTypes,
    withQuality: true,
  });

  // Helper: Get quality badge color
  const getQualityBadgeColor = (confidence: number): string => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'default';
    if (confidence >= 40) return 'warning';
    return 'destructive';
  };

  // Helper: Get quality label
  const getQualityLabel = (confidence: number): string => {
    if (confidence >= 80) return 'Excellent';
    if (confidence >= 60) return 'Good';
    if (confidence >= 40) return 'Fair';
    return 'Poor';
  };

  // Helper: Get average confidence for all metrics
  const averageConfidence = qualitySummary && qualitySummary.length > 0
    ? qualitySummary.reduce((sum, m) => sum + m.confidence, 0) / qualitySummary.length
    : 0;

  // Helper: Get metrics by quality level
  const metricsByQuality = {
    excellent: qualitySummary?.filter(m => m.confidence >= 80) || [],
    good: qualitySummary?.filter(m => m.confidence >= 60 && m.confidence < 80) || [],
    fair: qualitySummary?.filter(m => m.confidence >= 40 && m.confidence < 60) || [],
    poor: qualitySummary?.filter(m => m.confidence < 40) || [],
  };

  return {
    // Data with quality
    metrics: latest as MetricWithConfidence[],
    qualitySummary,
    averageConfidence,
    metricsByQuality,
    
    // Helpers
    getMetricWithQuality,
    hasGoodQuality,
    getQualityBadgeColor,
    getQualityLabel,
    
    // States
    isLoading,
    error,
  };
}
