import { useState, useMemo } from 'react';
import { subDays } from 'date-fns';
import { useMetricsVisualization } from '@/hooks/useMetricsVisualization';
import { MetricSelector } from './MetricSelector';
import { TimeRangeSelector } from './TimeRangeSelector';
import { MetricStatsCard } from './MetricStatsCard';
import { MultiMetricChart } from './MultiMetricChart';
import { SourceComparisonTable } from './SourceComparisonTable';
import { MetricHeatmap } from './MetricHeatmap';
import { Activity, Moon, Zap, Heart, Weight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ClientProgressVisualizationProps {
  clientId: string;
  unifiedMetrics: any[];
}

const METRIC_ICONS: Record<string, any> = {
  'Steps': Activity,
  'Active Calories': Activity,
  'Sleep Duration': Moon,
  'Sleep Efficiency': Moon,
  'Recovery Score': Zap,
  'HRV RMSSD': Heart,
  'Average Heart Rate': Heart,
  'Resting Heart Rate': Heart,
  'Weight': Weight,
  'Body Fat Percentage': Weight,
};

const METRIC_COLORS: Record<string, string> = {
  'Steps': '#3b82f6',
  'Active Calories': '#f59e0b',
  'Sleep Duration': '#6366f1',
  'Sleep Efficiency': '#8b5cf6',
  'Recovery Score': '#10b981',
  'HRV RMSSD': '#ef4444',
  'Average Heart Rate': '#ec4899',
  'Resting Heart Rate': '#f43f5e',
  'Weight': '#f97316',
  'Body Fat Percentage': '#eab308',
};

export function ClientProgressVisualization({ 
  clientId, 
  unifiedMetrics 
}: ClientProgressVisualizationProps) {
  const { t } = useTranslation('trainerDashboard');
  const [timeRange, setTimeRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [heatmapMetric, setHeatmapMetric] = useState<string>('');

  // Get unique available metrics from data
  const availableMetrics = useMemo(() => {
    const metrics = new Set<string>();
    unifiedMetrics.forEach(m => {
      if (m.metric_name) metrics.add(m.metric_name);
    });
    return Array.from(metrics).sort();
  }, [unifiedMetrics]);

  // Filter metrics by time range
  const filteredMetrics = useMemo(() => {
    return unifiedMetrics.filter(m => {
      const date = new Date(m.measurement_date);
      return date >= timeRange.start && date <= timeRange.end;
    });
  }, [unifiedMetrics, timeRange]);

  // Use visualization hook
  const { chartData, stats, sourceComparison } = useMetricsVisualization({
    unifiedMetrics: filteredMetrics,
    selectedMetrics,
    timeRange,
  });

  // Auto-select first metric for heatmap
  if (!heatmapMetric && availableMetrics.length > 0) {
    setHeatmapMetric(availableMetrics[0]);
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('visualization.title')}</h2>
        <TimeRangeSelector
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Metric Selector - Left Sidebar */}
        <div className="lg:col-span-1">
          <MetricSelector
            selectedMetrics={selectedMetrics}
            onMetricsChange={setSelectedMetrics}
            availableMetrics={availableMetrics}
          />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats Cards */}
          {selectedMetrics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {selectedMetrics.slice(0, 6).map(metric => {
                const metricStats = stats[metric];
                if (!metricStats) return null;

                const Icon = METRIC_ICONS[metric];
                const color = METRIC_COLORS[metric];

                return (
                  <MetricStatsCard
                    key={metric}
                    title={metric}
                    icon={Icon}
                    current={metricStats.current}
                    average={metricStats.average}
                    min={metricStats.min}
                    max={metricStats.max}
                    unit={metricStats.unit}
                    trend={metricStats.trend}
                    trendPercent={metricStats.trendPercent}
                    sparklineData={metricStats.sparklineData}
                    color={color}
                  />
                );
              })}
            </div>
          )}

          {/* Multi Metric Chart */}
          <MultiMetricChart
            data={chartData}
            selectedMetrics={selectedMetrics}
          />

          {/* Source Comparison Table */}
          {selectedMetrics.length > 0 && (
            <SourceComparisonTable comparisons={sourceComparison} />
          )}

          {/* Heatmap */}
          {availableMetrics.length > 0 && (
            <MetricHeatmap
              data={chartData}
              selectedMetric={heatmapMetric}
              onMetricChange={setHeatmapMetric}
              availableMetrics={availableMetrics}
              timeRange={timeRange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
