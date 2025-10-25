import { useState, useMemo } from 'react';
import { useMetrics } from '@/hooks/composite/data/useMetrics';
import { getMetricColor, getMetricLabel } from '@/lib/metrics/metric-utils';
import type { DateRange } from '@/types/metrics';

/**
 * FEATURE: Progress page data + UI state
 * 
 * Manages:
 * - Selected metrics
 * - Time range
 * - Chart data transformation
 * - Summary statistics
 * 
 * Usage:
 * ```tsx
 * const { chartData, summary, selectMetrics, setTimeRange } = useProgressView();
 * ```
 */

type TimeRange = '7d' | '30d' | '90d' | '1y';

export function useProgressView() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'weight',
    'body_fat_percentage',
    'skeletal_muscle_mass',
  ]);
  
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // ===== Convert time range to dates =====
  const dateRange: DateRange = useMemo(() => {
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }[timeRange];

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, [timeRange]);

  // ===== Fetch metrics with history =====
  const { 
    history, 
    isLoading, 
    getMetricHistory 
  } = useMetrics({
    metricTypes: selectedMetrics,
    dateRange,
  });

  // ===== Compute chart data =====
  const chartData = useMemo(() => {
    return selectedMetrics.map(metricName => ({
      metricName,
      data: getMetricHistory(metricName),
      color: getMetricColor(metricName),
      label: getMetricLabel(metricName),
    }));
  }, [selectedMetrics, getMetricHistory]);

  // ===== Summary statistics =====
  const summary = useMemo(() => {
    return selectedMetrics.map(metricName => {
      const data = getMetricHistory(metricName);
      
      if (data.length === 0) {
        return { 
          metricName, 
          current: 0, 
          change: 0, 
          changePercent: 0,
          min: 0, 
          max: 0, 
          avg: 0 
        };
      }

      const current = data[0].value;
      const oldest = data[data.length - 1].value;
      const change = current - oldest;
      const values = data.map(d => d.value);

      return {
        metricName,
        current,
        change,
        changePercent: oldest !== 0 ? (change / oldest) * 100 : 0,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
      };
    });
  }, [selectedMetrics, getMetricHistory]);

  // ===== Actions =====
  const toggleMetric = (metricName: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricName)
        ? prev.filter(m => m !== metricName)
        : [...prev, metricName]
    );
  };

  return {
    // Data
    chartData,
    summary,
    
    // UI State
    selectedMetrics,
    timeRange,
    
    // Actions
    selectMetrics: setSelectedMetrics,
    setTimeRange,
    toggleMetric,
    
    // States
    isLoading,
    hasData: history.length > 0,
  };
}
