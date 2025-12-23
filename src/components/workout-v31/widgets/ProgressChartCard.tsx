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
import { format, subDays, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
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
  
  // Process chart data for last 7 days
  const chartData = (() => {
    const today = startOfDay(new Date());
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      return {
        date: format(date, 'dd MMM', { locale: ru }),
        fullDate: date,
        value: 0,
        change: 0
      };
    });

    workouts.forEach(workout => {
      const workoutDate = startOfDay(new Date(workout.date));
      const dayIndex = last7Days.findIndex(d => 
        d.fullDate.getTime() === workoutDate.getTime()
      );
      
      if (dayIndex !== -1) {
        switch (selectedMetric) {
          case 'calories':
            last7Days[dayIndex].value += workout.calories;
            break;
          case 'duration':
            last7Days[dayIndex].value += workout.duration;
            break;
          case 'count':
            last7Days[dayIndex].value += 1;
            break;
        }
      }
    });

    // Calculate percentage changes
    last7Days.forEach((day, index) => {
      if (index > 0 && last7Days[index - 1].value > 0) {
        day.change = ((day.value - last7Days[index - 1].value) / last7Days[index - 1].value) * 100;
      }
    });

    return last7Days;
  })();

  // Calculate metrics
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
      avg: values.reduce((a, b) => a + b, 0) / values.length
    };
  })();

  const formatValue = (value: number) => {
    // Ensure we have a valid number and format it properly
    const safeValue = Number.isFinite(value) ? value : 0;
    
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
