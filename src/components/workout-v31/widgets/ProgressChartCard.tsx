import { useState } from "react";
import { useTranslation } from 'react-i18next';
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
import { Skeleton } from "@/components/ui/skeleton";
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
  totalSessions?: number;
  totalMinutes?: number;
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
  isLoading?: boolean;
}

const getPeriodOptions = (t: (key: string) => string): { value: PeriodFilter; label: string }[] => [
  { value: '7d', label: t('chart.period.7d') },
  { value: '30d', label: t('chart.period.30d') },
  { value: '90d', label: t('chart.period.90d') },
  { value: 'all', label: t('chart.period.all') },
];

const getCategoryConfig = (t: (key: string) => string) => ({
  strength: {
    label: t('chart.category.strength'),
    icon: Dumbbell,
    color: 'text-orange-400',
    bgColor: 'data-[state=active]:bg-orange-500/20'
  },
  wellness: {
    label: t('chart.category.wellness'),
    icon: Heart,
    color: 'text-purple-400',
    bgColor: 'data-[state=active]:bg-purple-500/20'
  },
  body: {
    label: t('chart.category.body'),
    icon: Scale,
    color: 'text-cyan-400',
    bgColor: 'data-[state=active]:bg-cyan-500/20'
  }
});

function ProgressChartSkeleton() {
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardContent className="pt-6">
        <div className="flex items-center gap-1 mb-4">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-14" />
          ))}
        </div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-[280px] w-full" />
        <div className="grid grid-cols-5 gap-4 mt-6 pt-4 border-t border-neutral-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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
  isBodyweightExercise = false,
  isLoading = false
}: ProgressChartCardProps) {
  const { t } = useTranslation('progress');
  const PERIOD_OPTIONS = getPeriodOptions(t);
  const CATEGORY_CONFIG = getCategoryConfig(t);
  
  // Show skeleton during loading
  if (isLoading) {
    return <ProgressChartSkeleton />;
  }
  
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
        return t('chart.units.reps', { value: Math.round(safeValue) });
      }
      // For weighted exercises: show weight/1RM
      return t('chart.units.kg', { value: Math.round(safeValue) });
    }
    
    // Body metrics
    if (category === 'body') {
      if (selectedMetric.includes('bodyfat') || selectedMetric.includes('Body Fat')) {
        return t('chart.units.percent', { value: safeValue.toFixed(1) });
      }
      return t('chart.units.kg', { value: safeValue.toFixed(1) });
    }
    
    // Wellness
    switch (selectedMetric) {
      case 'calories':
        return t('chart.units.kcal', { value: Math.round(safeValue) });
      case 'duration':
        return t('chart.units.min', { value: Math.round(safeValue) });
      case 'count':
        return `${Math.round(safeValue)}`;
      case 'heartRate':
        return `${Math.round(safeValue)} bpm`;
      case 'sleep':
        return t('chart.units.hours', { value: safeValue.toFixed(1) });
      case 'steps':
        return `${Math.round(safeValue)}`;
      default:
        // For wellness activities (massage, meditation, etc.)
        if (selectedMetric.startsWith('activity:')) {
          return t('chart.units.min', { value: Math.round(safeValue) });
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
              {t('chart.progress')}
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
              <SelectValue placeholder={t('chart.selectMetric')} />
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
                  {category === 'wellness' ? t('chart.connectWellness') :
                   category === 'body' ? t('chart.addBodyMeasurements') :
                   t('chart.noDataCategory')}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">{t('chart.noData')}</p>
              <p className="text-xs mt-1">{t('chart.recordToSee')}</p>
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

        {/* Stats grid - different layout for wellness activities */}
        {category === 'wellness' && selectedMetric.startsWith('activity:') ? (
          <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-neutral-800">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.sessions')}</p>
              <p className="text-sm font-semibold">{metrics.totalSessions || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.total')}</p>
              <p className="text-sm font-semibold">{t('chart.units.min', { value: metrics.totalMinutes || 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.min')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.min)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.max')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.max)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4 mt-6 pt-4 border-t border-neutral-800">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.start')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.start)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.current')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.current)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.min')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.min)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.max')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.max)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('chart.avg')}</p>
              <p className="text-sm font-semibold">{formatValue(metrics.avg)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
