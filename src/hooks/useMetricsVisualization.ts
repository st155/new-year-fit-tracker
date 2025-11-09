import { useMemo } from 'react';
import { format, parseISO, subDays, eachDayOfInterval } from 'date-fns';

interface UnifiedMetric {
  metric_name: string;
  value: number;
  measurement_date: string;
  source: string;
  unit: string;
  priority?: number;
  confidence_score?: number;
}

interface UseMetricsVisualizationOptions {
  unifiedMetrics: UnifiedMetric[];
  selectedMetrics: string[];
  timeRange: { start: Date; end: Date };
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface MetricStats {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  unit: string;
  sparklineData: { date: string; value: number }[];
}

interface SourceComparison {
  metricName: string;
  sources: {
    source: string;
    value: number;
    date: string;
    confidence: number;
    color: string;
  }[];
}

export function useMetricsVisualization({
  unifiedMetrics,
  selectedMetrics,
  timeRange,
}: UseMetricsVisualizationOptions) {
  // Process chart data - group by date and metric
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!unifiedMetrics.length || !selectedMetrics.length) return [];

    const dateMap = new Map<string, ChartDataPoint>();
    
    // Create all dates in range
    const allDates = eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
    allDates.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      dateMap.set(dateStr, { date: dateStr });
    });

    // Fill in metric values
    unifiedMetrics
      .filter(m => selectedMetrics.includes(m.metric_name))
      .forEach(metric => {
        const dateStr = metric.measurement_date;
        const existing = dateMap.get(dateStr);
        if (existing) {
          // If multiple values for same metric on same date, take highest priority
          const currentValue = existing[metric.metric_name] as number | undefined;
          if (currentValue === undefined || (metric.priority && metric.priority < (existing[`${metric.metric_name}_priority`] as number || 999))) {
            existing[metric.metric_name] = metric.value;
            existing[`${metric.metric_name}_priority`] = metric.priority || 999;
            existing[`${metric.metric_name}_unit`] = metric.unit;
          }
        }
      });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [unifiedMetrics, selectedMetrics, timeRange]);

  // Calculate statistics for each metric
  const stats = useMemo<Record<string, MetricStats>>(() => {
    const result: Record<string, MetricStats> = {};

    selectedMetrics.forEach(metricName => {
      const metricData = unifiedMetrics.filter(m => m.metric_name === metricName);
      
      if (metricData.length === 0) {
        result[metricName] = {
          current: 0,
          average: 0,
          min: 0,
          max: 0,
          trend: 'stable',
          trendPercent: 0,
          unit: '',
          sparklineData: [],
        };
        return;
      }

      const values = metricData.map(m => m.value);
      const unit = metricData[0].unit;
      
      // Sort by date
      const sortedData = [...metricData].sort((a, b) => 
        new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
      );

      const current = sortedData[sortedData.length - 1]?.value || 0;
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate trend (compare last 3 vs previous 3)
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;
      
      if (sortedData.length >= 6) {
        const recent3 = sortedData.slice(-3).map(m => m.value);
        const prev3 = sortedData.slice(-6, -3).map(m => m.value);
        const recentAvg = recent3.reduce((sum, v) => sum + v, 0) / 3;
        const prevAvg = prev3.reduce((sum, v) => sum + v, 0) / 3;
        
        if (prevAvg !== 0) {
          trendPercent = ((recentAvg - prevAvg) / prevAvg) * 100;
          if (trendPercent > 5) trend = 'up';
          else if (trendPercent < -5) trend = 'down';
        }
      }

      // Sparkline data (last 14 points)
      const sparklineData = sortedData.slice(-14).map(m => ({
        date: m.measurement_date,
        value: m.value,
      }));

      result[metricName] = {
        current,
        average,
        min,
        max,
        trend,
        trendPercent,
        unit,
        sparklineData,
      };
    });

    return result;
  }, [unifiedMetrics, selectedMetrics]);

  // Source comparison data
  const sourceComparison = useMemo<SourceComparison[]>(() => {
    const sourceColors: Record<string, string> = {
      whoop: '#FF6B6B',
      garmin: '#4ECDC4',
      oura: '#95E1D3',
      ultrahuman: '#F38181',
      withings: '#AA96DA',
      google: '#4285F4',
      apple: '#000000',
    };

    return selectedMetrics.map(metricName => {
      // Get latest value from each source
      const sourceMap = new Map<string, UnifiedMetric>();
      
      unifiedMetrics
        .filter(m => m.metric_name === metricName)
        .forEach(metric => {
          const existing = sourceMap.get(metric.source);
          if (!existing || new Date(metric.measurement_date) > new Date(existing.measurement_date)) {
            sourceMap.set(metric.source, metric);
          }
        });

      const sources = Array.from(sourceMap.values()).map(m => ({
        source: m.source,
        value: m.value,
        date: m.measurement_date,
        confidence: m.confidence_score || 50,
        color: sourceColors[m.source.toLowerCase()] || '#999999',
      }));

      return {
        metricName,
        sources,
      };
    });
  }, [unifiedMetrics, selectedMetrics]);

  return {
    chartData,
    stats,
    sourceComparison,
  };
}
