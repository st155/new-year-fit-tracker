import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  TooltipProps 
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { chartColors } from '@/lib/chart-colors';
import { rechartsTooltipStyle, rechartsTooltipLabelStyle, rechartsTooltipItemStyle } from '@/lib/chart-styles';

interface WorkoutHistoryItem {
  id: string;
  date: Date;
  name: string;
  duration: number;
  calories: number;
  volume?: number;
  distance?: number;
  sets?: number;
  exercises?: number;
  source: string;
  sourceLabel: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  change?: number;
}

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
  chartData: ChartDataPoint[];
  availableMetrics: Array<{ value: string; label: string }>;
  workouts: WorkoutHistoryItem[];
  metrics?: ProgressMetrics;
}

export function ProgressChartCard({
  selectedMetric,
  onMetricChange,
  chartData: propChartData,
  availableMetrics,
  workouts,
  metrics: propsMetrics
}: ProgressChartCardProps) {
  
  // Use props data directly instead of recalculating
  const chartData = propChartData && propChartData.length > 0 
    ? propChartData 
    : [];

  // Use provided metrics or calculate from chart data
  const metrics: ProgressMetrics = propsMetrics || (() => {
    const values = chartData.map(d => d.value).filter(v => v > 0);
    if (values.length === 0) {
      return { start: 0, current: 0, min: 0, max: 0, avg: 0 };
    }

    return {
      start: chartData[0].value,
      current: chartData[chartData.length - 1].value,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    };
  })();

  const formatValue = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    
    // For 1RM metrics, show as kg
    if (selectedMetric.includes('1rm') || selectedMetric.includes('press') || 
        selectedMetric.includes('squat') || selectedMetric.includes('deadlift') ||
        selectedMetric.includes('lunges') || selectedMetric.includes('biceps') ||
        selectedMetric.includes('dips')) {
      return `${Math.round(safeValue)} кг`;
    }
    
    switch (selectedMetric) {
      case 'calories':
        return `${Math.round(safeValue)} ккал`;
      case 'duration':
        return `${Math.round(safeValue)} мин`;
      case 'count':
        return `${Math.round(safeValue)}`;
      case 'heartRate':
        return `${Math.round(safeValue)} bpm`;
      default:
        return Math.round(safeValue).toString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div style={rechartsTooltipStyle}>
          <p style={rechartsTooltipLabelStyle}>{label}</p>
          <p style={rechartsTooltipItemStyle}>
            {formatValue(payload[0].value as number)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Прогресс</h3>
        
        <Select value={selectedMetric} onValueChange={onMetricChange}>
          <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700">
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

      {chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">Нет данных по этому упражнению</p>
            <p className="text-xs mt-1">Запишите тренировку чтобы увидеть прогресс</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.rose} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.rose} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={chartColors.rose}
              strokeWidth={3}
              fill="url(#colorValue)"
              dot={{ fill: chartColors.rose, r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="grid grid-cols-5 gap-4 mt-6 pt-4 border-t border-neutral-800">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Начало</p>
          <p className="text-sm font-semibold">{formatValue(metrics.start)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Текущий</p>
          <p className="text-sm font-semibold">{formatValue(metrics.current)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Мин</p>
          <p className="text-sm font-semibold">{formatValue(metrics.min)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Макс</p>
          <p className="text-sm font-semibold">{formatValue(metrics.max)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Средний</p>
          <p className="text-sm font-semibold">{formatValue(metrics.avg)}</p>
        </div>
      </div>
      </CardContent>
    </Card>
  );
}
