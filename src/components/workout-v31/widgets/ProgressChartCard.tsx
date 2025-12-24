import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { chartColors } from '@/lib/chart-colors';
import { rechartsTooltipStyle, rechartsTooltipLabelStyle, rechartsTooltipItemStyle } from '@/lib/chart-styles';
import { Dumbbell, Heart, Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PeriodFilter } from "@/hooks/useProgressMetrics";

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
  change?: number;
  changePercent?: number;
}

type MetricCategory = 'strength' | 'wellness' | 'body';

interface ProgressChartCardProps {
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  chartData: ChartDataPoint[];
  availableMetrics: Array<{ value: string; label: string; category?: MetricCategory }>;
  workouts: WorkoutHistoryItem[];
  metrics?: ProgressMetrics;
  period?: PeriodFilter;
  onPeriodChange?: (period: PeriodFilter) => void;
  category?: MetricCategory;
  onCategoryChange?: (category: MetricCategory) => void;
  isBodyweightExercise?: boolean;
}

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7 дн' },
  { value: '30d', label: '30 дн' },
  { value: '90d', label: '90 дн' },
  { value: 'all', label: 'Всё' },
];

const CATEGORY_CONFIG = {
  strength: {
    label: 'Сила',
    icon: Dumbbell,
    color: 'text-orange-400',
    bgColor: 'data-[state=active]:bg-orange-500/20'
  },
  wellness: {
    label: 'Wellness',
    icon: Heart,
    color: 'text-purple-400',
    bgColor: 'data-[state=active]:bg-purple-500/20'
  },
  body: {
    label: 'Тело',
    icon: Scale,
    color: 'text-cyan-400',
    bgColor: 'data-[state=active]:bg-cyan-500/20'
  }
};

export function ProgressChartCard({
  selectedMetric,
  onMetricChange,
  chartData: propChartData,
  availableMetrics,
  workouts,
  metrics: propsMetrics,
  period = '30d',
  onPeriodChange,
  category = 'strength',
  onCategoryChange,
  isBodyweightExercise = false
}: ProgressChartCardProps) {
  
  // Use props data directly
  const chartData = propChartData && propChartData.length > 0 
    ? propChartData 
    : [];

  // Use provided metrics or calculate from chart data
  const metrics: ProgressMetrics = propsMetrics || (() => {
    const values = chartData.map(d => d.value).filter(v => v > 0);
    if (values.length === 0) {
      return { start: 0, current: 0, min: 0, max: 0, avg: 0, change: 0, changePercent: 0 };
    }

    const start = chartData[0].value;
    const current = chartData[chartData.length - 1].value;
    const change = current - start;
    const changePercent = start > 0 ? Math.round((change / start) * 100) : 0;

    return {
      start,
      current,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      change,
      changePercent
    };
  })();

  const formatValue = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    
    // For strength metrics
    if (category === 'strength') {
      // For bodyweight exercises: show reps
      if (isBodyweightExercise) {
        return `${Math.round(safeValue)} повт`;
      }
      // For weighted exercises: show weight/1RM
      return `${Math.round(safeValue)} кг`;
    }
    
    // Body metrics
    if (category === 'body') {
      if (selectedMetric.includes('bodyfat') || selectedMetric.includes('Body Fat')) {
        return `${safeValue.toFixed(1)}%`;
      }
      return `${safeValue.toFixed(1)} кг`;
    }
    
    // Wellness
    switch (selectedMetric) {
      case 'calories':
        return `${Math.round(safeValue)} ккал`;
      case 'duration':
        return `${Math.round(safeValue)} мин`;
      case 'count':
        return `${Math.round(safeValue)}`;
      case 'heartRate':
        return `${Math.round(safeValue)} bpm`;
      case 'sleep':
        return `${safeValue.toFixed(1)} ч`;
      case 'steps':
        return `${Math.round(safeValue)}`;
      default:
        // For wellness activities (massage, meditation, etc.)
        if (selectedMetric.startsWith('activity:')) {
          return `${Math.round(safeValue)} мин`;
        }
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

  const categoryConfig = CATEGORY_CONFIG[category];
  const chartColor = category === 'strength' ? chartColors.rose : 
                     category === 'wellness' ? chartColors.purple : chartColors.cyan;

  const changePercent = metrics.changePercent || 0;
  const TrendIcon = changePercent > 0 ? TrendingUp : changePercent < 0 ? TrendingDown : Minus;
  const trendColor = changePercent > 0 ? 'text-green-400' : changePercent < 0 ? 'text-red-400' : 'text-muted-foreground';

  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardContent className="pt-6">
        {/* Category tabs */}
        <Tabs value={category} onValueChange={(v) => onCategoryChange?.(v as MetricCategory)} className="mb-4">
          <TabsList className="grid w-full grid-cols-3 bg-neutral-800">
            {(Object.entries(CATEGORY_CONFIG) as [MetricCategory, typeof CATEGORY_CONFIG.strength][]).map(([key, config]) => (
              <TabsTrigger 
                key={key}
                value={key}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  config.bgColor,
                  `data-[state=active]:${config.color}`
                )}
              >
                <config.icon className="h-3.5 w-3.5" />
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Period switcher */}
        {onPeriodChange && (
          <div className="flex items-center gap-1 mb-4">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onPeriodChange(opt.value)}
                className={cn(
                  "h-7 px-3 text-xs",
                  period === opt.value && "bg-primary/20 text-primary"
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <categoryConfig.icon className={cn("h-5 w-5", categoryConfig.color)} />
              Прогресс
            </h3>
            {chartData.length > 1 && (
              <div className={cn("flex items-center gap-1 text-sm", trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{changePercent > 0 ? '+' : ''}{changePercent}%</span>
              </div>
            )}
          </div>
        
          <Select value={selectedMetric} onValueChange={onMetricChange}>
            <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700">
              <SelectValue placeholder="Выберите метрику" />
            </SelectTrigger>
            <SelectContent>
              {availableMetrics.length > 0 ? (
                availableMetrics.map(metric => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  {category === 'wellness' ? 'Подключите Whoop/Garmin для данных о сне и восстановлении' :
                   category === 'body' ? 'Добавьте замеры тела для отслеживания прогресса' :
                   'Нет данных в этой категории'}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Нет данных по этому показателю</p>
              <p className="text-xs mt-1">Запишите тренировку чтобы увидеть прогресс</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
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
                stroke={chartColor}
                strokeWidth={3}
                fill="url(#colorValue)"
                dot={{ fill: chartColor, r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
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
