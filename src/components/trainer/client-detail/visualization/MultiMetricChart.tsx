import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, BarChart, AreaChart } from 'lucide-react';
import { OptimizedChart, ChartConfig } from '@/components/charts/OptimizedChart';
import { useTranslation } from 'react-i18next';

interface MultiMetricChartProps {
  data: any[];
  selectedMetrics: string[];
  onMetricToggle?: (metric: string) => void;
}

const METRIC_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function MultiMetricChart({ data, selectedMetrics, onMetricToggle }: MultiMetricChartProps) {
  const { t } = useTranslation('trainerDashboard');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(selectedMetrics));

  const handleMetricVisibilityToggle = (metric: string) => {
    const newVisible = new Set(visibleMetrics);
    if (newVisible.has(metric)) {
      newVisible.delete(metric);
    } else {
      newVisible.add(metric);
    }
    setVisibleMetrics(newVisible);
  };

  const metricConfigs = useMemo(() => {
    return selectedMetrics.map((metric, index) => ({
      metric,
      color: METRIC_COLORS[index % METRIC_COLORS.length],
      visible: visibleMetrics.has(metric),
    }));
  }, [selectedMetrics, visibleMetrics]);

  if (selectedMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">{t('visualization.selectMetrics')}</p>
            <p className="text-sm">{t('visualization.useSelector')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('visualization.chartTitle')}</CardTitle>
          
          {/* Chart Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <LineChart className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
            >
              <AreaChart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend with toggle */}
        <div className="flex flex-wrap gap-2 mt-4">
          {metricConfigs.map(({ metric, color, visible }) => (
            <Button
              key={metric}
              variant={visible ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleMetricVisibilityToggle(metric)}
              className="gap-2"
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: visible ? color : 'transparent', border: `2px solid ${color}` }}
              />
              {metric}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {metricConfigs
            .filter(({ visible }) => visible)
            .map(({ metric, color }) => {
              const config: ChartConfig = {
                xKey: 'date',
                yKey: metric,
                color: color,
                label: metric,
                showGrid: true,
                showTooltip: true,
                showLegend: false,
              };

              return (
                <div key={metric}>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                    {metric}
                  </h4>
                  <OptimizedChart
                    type={chartType}
                    data={data}
                    config={config}
                    height={250}
                  />
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
