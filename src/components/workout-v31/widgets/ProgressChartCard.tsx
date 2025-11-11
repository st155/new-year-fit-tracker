import { Card, LineChart, Metric } from "@tremor/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProgressMetrics {
  start: number;
  current: number;
  min: number;
  max: number;
  avg: number;
}

interface ProgressChartCardProps {
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  chartData: Array<{ date: string; value: number }>;
  metrics: ProgressMetrics;
  availableMetrics: Array<{ value: string; label: string }>;
}

export function ProgressChartCard({ 
  selectedMetric, 
  onMetricChange, 
  chartData, 
  metrics,
  availableMetrics 
}: ProgressChartCardProps) {
  return (
    <Card className="bg-neutral-900 border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Прогресс</h3>
        <Select value={selectedMetric} onValueChange={onMetricChange}>
          <SelectTrigger className="w-[200px] bg-neutral-800 border-neutral-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMetrics.map(metric => (
              <SelectItem key={metric.value} value={metric.value}>
                {metric.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <LineChart
        className="h-56 mt-4"
        data={chartData}
        index="date"
        categories={["value"]}
        colors={["cyan"]}
        valueFormatter={(value) => `${value.toFixed(1)} кг`}
        showLegend={false}
        showGridLines={false}
      />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div>
          <p className="text-xs text-muted-foreground">Старт</p>
          <Metric className="text-foreground">{metrics.start.toFixed(1)} кг</Metric>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Текущий</p>
          <Metric className="text-cyan-400">{metrics.current.toFixed(1)} кг</Metric>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Мин/Макс/Сред</p>
          <Metric className="text-foreground text-sm">
            {metrics.min.toFixed(0)}/{metrics.max.toFixed(0)}/{metrics.avg.toFixed(0)}
          </Metric>
        </div>
      </div>
    </Card>
  );
}
